const bcrypt = require('bcrypt');
const { query } = require('../config/database');
const { registrarBitacora, entero } = require('../utils/comun');

const db = { query };
const ROLES = ['administrador', 'operativo', 'direccion'];
const CLAVE_MINIMA = 8;

const listar = async (req, res) => {
    try {
        const r = await query(`
      SELECT u.id, u.usuario, u.nombre_completo, u.rol, u.activo, u.creado_en,
             (SELECT MAX(b.creado_en) FROM bitacora b WHERE b.usuario_id = u.id) AS ultima_actividad
      FROM usuarios u ORDER BY u.activo DESC, u.nombre_completo`);
        res.json(r.rows);
    } catch (error) {
        console.error('Error al listar usuarios:', error);
        res.status(500).json({ mensaje: 'Error al consultar los usuarios' });
    }
};

const crear = async (req, res) => {
    const { usuario, nombre_completo, rol, password } = req.body;
    if (!usuario?.trim() || !nombre_completo?.trim()) return res.status(400).json({ mensaje: 'Usuario y nombre son obligatorios' });
    if (!/^[a-z0-9._-]{3,50}$/i.test(usuario.trim())) return res.status(400).json({ mensaje: 'El usuario solo admite letras, números, punto y guion (3 a 50)' });
    if (!ROLES.includes(rol)) return res.status(400).json({ mensaje: 'Rol no válido' });
    if (!password || password.length < CLAVE_MINIMA) return res.status(400).json({ mensaje: `La contraseña debe tener al menos ${CLAVE_MINIMA} caracteres` });

    try {
        const hash = await bcrypt.hash(password, 10);
        const r = await query(`
      INSERT INTO usuarios (usuario, password_hash, nombre_completo, rol)
      VALUES (LOWER($1), $2, $3, $4) RETURNING id, usuario, nombre_completo, rol, activo`,
            [usuario.trim(), hash, nombre_completo.trim(), rol]);
        await registrarBitacora(db, req.usuario.id, 'crear', 'usuario', r.rows[0].id, { usuario, rol });
        res.status(201).json(r.rows[0]);
    } catch (error) {
        if (error.code === '23505') return res.status(409).json({ mensaje: 'Ese nombre de usuario ya existe' });
        console.error('Error al crear usuario:', error);
        res.status(500).json({ mensaje: 'Error al crear el usuario' });
    }
};

const editar = async (req, res) => {
    const id = entero(req.params.id);
    const { nombre_completo, rol, activo, password } = req.body;
    if (!nombre_completo?.trim()) return res.status(400).json({ mensaje: 'El nombre es obligatorio' });
    if (!ROLES.includes(rol)) return res.status(400).json({ mensaje: 'Rol no válido' });
    if (id === req.usuario.id && (rol !== 'administrador' || activo === false)) {
        return res.status(400).json({ mensaje: 'No puede quitarse a sí mismo el rol de administrador ni desactivarse' });
    }
    if (password && password.length < CLAVE_MINIMA) {
        return res.status(400).json({ mensaje: `La contraseña debe tener al menos ${CLAVE_MINIMA} caracteres` });
    }

    try {
        const hash = password ? await bcrypt.hash(password, 10) : null;
        const r = await query(`
      UPDATE usuarios SET nombre_completo = $1, rol = $2, activo = $3,
             password_hash = COALESCE($4, password_hash)
      WHERE id = $5 RETURNING id, usuario, nombre_completo, rol, activo`,
            [nombre_completo.trim(), rol, activo !== false, hash, id]);
        if (!r.rows.length) return res.status(404).json({ mensaje: 'Usuario no encontrado' });
        await registrarBitacora(db, req.usuario.id, 'editar', 'usuario', id,
            { rol, activo: activo !== false, cambio_clave: !!password });
        res.json(r.rows[0]);
    } catch (error) {
        console.error('Error al editar usuario:', error);
        res.status(500).json({ mensaje: 'Error al actualizar el usuario' });
    }
};

// Cualquier usuario puede cambiar su propia contraseña
const cambiarClave = async (req, res) => {
    const { actual, nueva } = req.body;
    if (!nueva || nueva.length < CLAVE_MINIMA) {
        return res.status(400).json({ mensaje: `La nueva contraseña debe tener al menos ${CLAVE_MINIMA} caracteres` });
    }
    try {
        const r = await query('SELECT password_hash FROM usuarios WHERE id = $1', [req.usuario.id]);
        if (!r.rows.length || !(await bcrypt.compare(actual || '', r.rows[0].password_hash))) {
            return res.status(400).json({ mensaje: 'La contraseña actual no es correcta' });
        }
        await query('UPDATE usuarios SET password_hash = $1 WHERE id = $2', [await bcrypt.hash(nueva, 10), req.usuario.id]);
        await registrarBitacora(db, req.usuario.id, 'cambiar_clave', 'usuario', req.usuario.id);
        res.json({ mensaje: 'Contraseña actualizada' });
    } catch (error) {
        console.error('Error al cambiar contraseña:', error);
        res.status(500).json({ mensaje: 'Error al cambiar la contraseña' });
    }
};

const bitacora = async (req, res) => {
    const { entidad, usuario_id, desde, hasta } = req.query;
    const pagina = Math.max(1, entero(req.query.pagina) || 1);
    const cond = [];
    const val = [];
    if (entidad) { val.push(entidad); cond.push(`b.entidad = $${val.length}`); }
    if (usuario_id) { val.push(usuario_id); cond.push(`b.usuario_id = $${val.length}`); }
    if (desde) { val.push(desde); cond.push(`b.creado_en >= $${val.length}::date`); }
    if (hasta) { val.push(hasta); cond.push(`b.creado_en < $${val.length}::date + 1`); }
    const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';

    try {
        const total = await query(`SELECT COUNT(*)::int AS n FROM bitacora b ${where}`, val);
        const r = await query(`
      SELECT b.id, b.accion, b.entidad, b.entidad_id, b.detalle, b.creado_en,
             u.nombre_completo AS usuario,
             CASE WHEN b.entidad = 'emergencia' THEN (SELECT numero_control FROM emergencias WHERE id = b.entidad_id)
                  WHEN b.entidad = 'insumo' THEN (SELECT nombre FROM insumos WHERE id = b.entidad_id)
             END AS referencia
      FROM bitacora b LEFT JOIN usuarios u ON u.id = b.usuario_id
      ${where}
      ORDER BY b.creado_en DESC LIMIT 50 OFFSET ${(pagina - 1) * 50}`, val);
        res.json({ total: total.rows[0].n, pagina, registros: r.rows });
    } catch (error) {
        console.error('Error al consultar bitácora:', error);
        res.status(500).json({ mensaje: 'Error al consultar la bitácora' });
    }
};

module.exports = { listar, crear, editar, cambiarClave, bitacora };
