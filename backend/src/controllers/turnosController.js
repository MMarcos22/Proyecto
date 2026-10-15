// Turno de guardia: quién está en la estación. Las boletas lo usan para autocompletar
// radiotelefonista, jefe de servicio y personal, y quedan vinculadas al turno.
const { query, getClient } = require('../config/database');
const { registrarBitacora, entero } = require('../utils/comun');

const SELECT_TURNO = `
  SELECT t.*, u.nombre_completo AS abierto_por, es.nombre AS escuadra,
         (SELECT COUNT(*)::int FROM emergencias e WHERE e.turno_id = t.id AND e.estado <> 'anulada') AS servicios
  FROM turnos t JOIN usuarios u ON u.id = t.usuario_id
  LEFT JOIN escuadras es ON es.id = t.escuadra_id`;

const actual = async (req, res) => {
    try {
        const r = await query(`${SELECT_TURNO} WHERE t.fin IS NULL LIMIT 1`);
        res.json(r.rows[0] || null);
    } catch (error) {
        console.error('Error al consultar turno:', error);
        res.status(500).json({ mensaje: 'Error al consultar el turno' });
    }
};

const limpiarLista = (l) => (Array.isArray(l) ? [...new Set(l.map(x => String(x).trim()).filter(Boolean))] : []);

// Abre un turno nuevo; si había uno abierto, lo cierra en la misma transacción
const abrir = async (req, res) => {
    const { radiotelefonista, jefe_servicio, personal, observaciones } = req.body;
    if (!radiotelefonista?.trim()) return res.status(400).json({ mensaje: 'Indique quién es el radiotelefonista del turno' });
    const escuadraId = entero(req.body.escuadra_id);

    const cliente = await getClient();
    try {
        await cliente.query('BEGIN');
        await cliente.query(
            'UPDATE turnos SET fin = CURRENT_TIMESTAMP, cerrado_por = $1 WHERE fin IS NULL', [req.usuario.id]);
        const r = await cliente.query(`
      INSERT INTO turnos (radiotelefonista, jefe_servicio, personal, observaciones, usuario_id, escuadra_id)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
            [radiotelefonista.trim(), jefe_servicio?.trim() || null, limpiarLista(personal),
                observaciones?.trim() || null, req.usuario.id, escuadraId]);
        await registrarBitacora(cliente, req.usuario.id, 'crear', 'turno', r.rows[0].id, { radiotelefonista, jefe_servicio });
        await cliente.query('COMMIT');
        const t = await query(`${SELECT_TURNO} WHERE t.id = $1`, [r.rows[0].id]);
        res.status(201).json(t.rows[0]);
    } catch (error) {
        await cliente.query('ROLLBACK');
        console.error('Error al abrir turno:', error);
        res.status(500).json({ mensaje: 'Error al abrir el turno' });
    } finally {
        cliente.release();
    }
};

const editar = async (req, res) => {
    const id = entero(req.params.id);
    const { radiotelefonista, jefe_servicio, personal, observaciones } = req.body;
    if (!radiotelefonista?.trim()) return res.status(400).json({ mensaje: 'Indique quién es el radiotelefonista del turno' });
    try {
        const r = await query(`
      UPDATE turnos SET radiotelefonista = $1, jefe_servicio = $2, personal = $3, observaciones = $4, escuadra_id = $6
      WHERE id = $5 AND fin IS NULL RETURNING id`,
            [radiotelefonista.trim(), jefe_servicio?.trim() || null, limpiarLista(personal), observaciones?.trim() || null, id, entero(req.body.escuadra_id)]);
        if (!r.rows.length) return res.status(404).json({ mensaje: 'El turno no existe o ya fue cerrado' });
        await registrarBitacora({ query }, req.usuario.id, 'editar', 'turno', id, { radiotelefonista, jefe_servicio });
        const t = await query(`${SELECT_TURNO} WHERE t.id = $1`, [id]);
        res.json(t.rows[0]);
    } catch (error) {
        console.error('Error al editar turno:', error);
        res.status(500).json({ mensaje: 'Error al actualizar el turno' });
    }
};

const cerrar = async (req, res) => {
    const id = entero(req.params.id);
    try {
        const pendientes = await query(`SELECT COUNT(*)::int AS n FROM emergencias WHERE turno_id = $1 AND estado = 'en_curso'`, [id]);
        const r = await query(
            'UPDATE turnos SET fin = CURRENT_TIMESTAMP, cerrado_por = $1 WHERE id = $2 AND fin IS NULL RETURNING id', [req.usuario.id, id]);
        if (!r.rows.length) return res.status(404).json({ mensaje: 'El turno no existe o ya fue cerrado' });
        await registrarBitacora({ query }, req.usuario.id, 'cerrar', 'turno', id);
        res.json({
            mensaje: pendientes.rows[0].n
                ? `Turno cerrado. Quedan ${pendientes.rows[0].n} servicio(s) en curso por cerrar`
                : 'Turno cerrado'
        });
    } catch (error) {
        console.error('Error al cerrar turno:', error);
        res.status(500).json({ mensaje: 'Error al cerrar el turno' });
    }
};

const historial = async (req, res) => {
    try {
        const r = await query(`${SELECT_TURNO} ORDER BY t.inicio DESC LIMIT 30`);
        res.json(r.rows);
    } catch (error) {
        console.error('Error al listar turnos:', error);
        res.status(500).json({ mensaje: 'Error al consultar los turnos' });
    }
};

module.exports = { actual, abrir, editar, cerrar, historial };
