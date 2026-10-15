const bcrypt = require('bcrypt');
const { query } = require('../config/database');
const dominio = require('../config/dominio');
const { registrarBitacora, entero } = require('../utils/comun');

const db = { query };

const obtenerDominio = (req, res) => res.json(dominio);

// Fábrica de CRUD con baja lógica para catálogos simples
const crud = ({ tabla, entidad, campos, validar, orden, selectExtra = '', joinExtra = '' }) => {
    const listar = async (req, res) => {
        const todos = req.query.todos === '1';
        try {
            const r = await query(`
        SELECT t.*${selectExtra}
        FROM ${tabla} t ${joinExtra}
        ${todos ? '' : 'WHERE t.activo = TRUE'}
        ORDER BY ${orden}`);
            res.json(r.rows);
        } catch (error) {
            console.error(`Error al listar ${tabla}:`, error);
            res.status(500).json({ mensaje: 'Error al consultar el catálogo' });
        }
    };

    const guardar = (esNuevo) => async (req, res) => {
        const error = validar(req.body);
        if (error) return res.status(400).json({ mensaje: error });
        const valores = campos.map(c => (typeof req.body[c] === 'string' ? req.body[c].trim() : req.body[c]) || null);
        try {
            let r;
            if (esNuevo) {
                r = await query(
                    `INSERT INTO ${tabla} (${campos.join(', ')}) VALUES (${campos.map((_, i) => `$${i + 1}`).join(', ')})
           RETURNING *`, valores);
            } else {
                const id = entero(req.params.id);
                r = await query(
                    `UPDATE ${tabla} SET ${campos.map((c, i) => `${c} = $${i + 1}`).join(', ')}, activo = TRUE
           WHERE id = $${campos.length + 1} RETURNING *`, [...valores, id]);
                if (!r.rows.length) return res.status(404).json({ mensaje: 'Registro no encontrado' });
            }
            await registrarBitacora(db, req.usuario.id, esNuevo ? 'crear' : 'editar', entidad, r.rows[0].id, req.body);
            res.status(esNuevo ? 201 : 200).json(r.rows[0]);
        } catch (error) {
            if (error.code === '23505') return res.status(409).json({ mensaje: 'Ya existe un registro con ese nombre' });
            console.error(`Error al guardar en ${tabla}:`, error);
            res.status(500).json({ mensaje: 'Error al guardar' });
        }
    };

    const retirar = async (req, res) => {
        const id = entero(req.params.id);
        try {
            const r = await query(`UPDATE ${tabla} SET activo = FALSE WHERE id = $1 RETURNING id`, [id]);
            if (!r.rows.length) return res.status(404).json({ mensaje: 'Registro no encontrado' });
            await registrarBitacora(db, req.usuario.id, 'retirar', entidad, id);
            res.json({ mensaje: 'Registro retirado del catálogo; el historial lo conserva' });
        } catch (error) {
            console.error(`Error al retirar de ${tabla}:`, error);
            res.status(500).json({ mensaje: 'Error al retirar' });
        }
    };

    return { listar, crear: guardar(true), editar: guardar(false), retirar };
};

const sectores = crud({
    tabla: 'sectores', entidad: 'sector',
    campos: ['nombre', 'tipo', 'referencias'],
    validar: (b) => !b.nombre?.trim() ? 'El nombre del sector es obligatorio'
        : !dominio.TIPOS_SECTOR[b.tipo] ? 'Tipo de sector no válido' : null,
    orden: 't.tipo, t.nombre',
    selectExtra: `, (SELECT COUNT(*)::int FROM emergencias e WHERE e.sector_id = t.id AND e.estado IN ('pendiente', 'completa', 'firmada')) AS servicios,
      (SELECT COUNT(*)::int FROM emergencias e WHERE e.sector_id = t.id AND e.estado <> 'anulada'
          AND e.fecha > CURRENT_DATE - 365) AS servicios_anio`
});

const escuadras = crud({
    tabla: 'escuadras', entidad: 'escuadra',
    campos: ['nombre'],
    validar: (b) => !b.nombre?.trim() ? 'El nombre de la escuadra es obligatorio' : null,
    orden: 't.nombre',
    selectExtra: ', (SELECT COUNT(*)::int FROM personal p WHERE p.escuadra_id = t.id AND p.activo) AS integrantes'
});

const unidades = crud({
    tabla: 'unidades', entidad: 'unidad',
    campos: ['codigo', 'descripcion', 'piloto_id', 'estado', 'servicios'],
    validar: (b) => !b.codigo?.trim() ? 'El código de la unidad es obligatorio'
        : b.estado && !dominio.ESTADOS_UNIDAD[b.estado] ? 'Estado de la unidad no válido'
        : b.servicios && (!Array.isArray(b.servicios) || b.servicios.some(s => !dominio.SUBTIPOS[s])) ? 'Tipo de servicio no válido' : null,
    orden: 't.codigo',
    selectExtra: ', p.nombre_completo AS piloto',
    joinExtra: 'LEFT JOIN personal p ON p.id = t.piloto_id'
});

const lugares = crud({
    tabla: 'lugares_criticos', entidad: 'lugar_critico',
    campos: ['sector_id', 'nombre', 'referencias'],
    validar: (b) => !b.nombre?.trim() ? 'El nombre del lugar es obligatorio' : !b.sector_id ? 'Indique a qué sector pertenece' : null,
    orden: 's.nombre, t.nombre',
    selectExtra: `, s.nombre AS sector,
      (SELECT COUNT(*)::int FROM emergencias e WHERE e.lugar_critico_id = t.id AND e.estado IN ('pendiente', 'completa', 'firmada')) AS servicios`,
    joinExtra: 'JOIN sectores s ON s.id = t.sector_id'
});

// Personal: el PIN se guarda cifrado y nunca se devuelve; solo se informa si existe
const SELECT_PERSONAL = `
  SELECT p.id, p.nombre_completo, p.cargo, p.escuadra_id, e.nombre AS escuadra,
         p.es_piloto, p.voluntario, p.activo, (p.pin_hash IS NOT NULL) AS tiene_pin
  FROM personal p LEFT JOIN escuadras e ON e.id = p.escuadra_id`;

const personal = {
    listar: async (req, res) => {
        try {
            const r = await query(`${SELECT_PERSONAL} ${req.query.todos === '1' ? '' : 'WHERE p.activo'} ORDER BY p.nombre_completo`);
            res.json(r.rows);
        } catch (error) {
            console.error('Error al listar personal:', error);
            res.status(500).json({ mensaje: 'Error al consultar el catálogo' });
        }
    },
    guardar: (esNuevo) => async (req, res) => {
        const b = req.body;
        if (!b.nombre_completo?.trim()) return res.status(400).json({ mensaje: 'El nombre es obligatorio' });
        if (b.pin && !/^\d{4}$/.test(String(b.pin))) return res.status(400).json({ mensaje: 'El PIN debe tener exactamente 4 dígitos' });
        const valores = [b.nombre_completo.trim(), b.cargo?.trim() || null, entero(b.escuadra_id), !!b.es_piloto, !!b.voluntario];
        try {
            let id;
            if (esNuevo) {
                const r = await query(`INSERT INTO personal (nombre_completo, cargo, escuadra_id, es_piloto, voluntario)
          VALUES ($1, $2, $3, $4, $5) RETURNING id`, valores);
                id = r.rows[0].id;
            } else {
                id = entero(req.params.id);
                const r = await query(`UPDATE personal SET nombre_completo = $1, cargo = $2, escuadra_id = $3, es_piloto = $4,
          voluntario = $5, activo = TRUE WHERE id = $6 RETURNING id`, [...valores, id]);
                if (!r.rows.length) return res.status(404).json({ mensaje: 'Registro no encontrado' });
            }
            if (b.pin) await query('UPDATE personal SET pin_hash = $1 WHERE id = $2', [await bcrypt.hash(String(b.pin), 10), id]);
            if (b.quitar_pin) await query('UPDATE personal SET pin_hash = NULL WHERE id = $1', [id]);
            const { pin, ...sinPin } = b;
            await registrarBitacora(db, req.usuario.id, esNuevo ? 'crear' : 'editar', 'personal', id, { ...sinPin, pin: pin ? 'actualizado' : undefined });
            const r = await query(`${SELECT_PERSONAL} WHERE p.id = $1`, [id]);
            res.status(esNuevo ? 201 : 200).json(r.rows[0]);
        } catch (error) {
            if (error.code === '23505') return res.status(409).json({ mensaje: 'Ya existe una persona con ese nombre' });
            console.error('Error al guardar personal:', error);
            res.status(500).json({ mensaje: 'Error al guardar' });
        }
    },
    retirar: async (req, res) => {
        const id = entero(req.params.id);
        const r = await query('UPDATE personal SET activo = FALSE WHERE id = $1 RETURNING id', [id]);
        if (!r.rows.length) return res.status(404).json({ mensaje: 'Registro no encontrado' });
        await registrarBitacora(db, req.usuario.id, 'retirar', 'personal', id);
        res.json({ mensaje: 'Persona retirada del catálogo; el historial la conserva' });
    }
};
personal.crear = personal.guardar(true);
personal.editar = personal.guardar(false);

// Asigna en lote las boletas antiguas (sin sector) a un sector del catálogo
const asignarSectorPendientes = async (req, res) => {
    const { zona_texto, sector_id } = req.body;
    if (!zona_texto || !sector_id) return res.status(400).json({ mensaje: 'Indique la zona escrita y el sector' });
    try {
        const r = await query(`
      UPDATE emergencias SET sector_id = $1
      WHERE sector_id IS NULL AND LOWER(TRIM(zona)) = LOWER(TRIM($2))
      RETURNING id`, [sector_id, zona_texto]);
        await registrarBitacora(db, req.usuario.id, 'asignar_sector', 'sector', sector_id,
            { zona_texto, boletas: r.rows.length });
        res.json({ mensaje: `${r.rows.length} boleta(s) asignadas al sector` });
    } catch (error) {
        console.error('Error al asignar sector:', error);
        res.status(500).json({ mensaje: 'Error al asignar' });
    }
};

const zonasSinSector = async (req, res) => {
    try {
        const r = await query(`
      SELECT COALESCE(NULLIF(TRIM(zona), ''), '(vacío)') AS zona, COUNT(*)::int AS boletas
      FROM emergencias WHERE sector_id IS NULL
      GROUP BY 1 ORDER BY boletas DESC`);
        res.json(r.rows);
    } catch (error) {
        console.error('Error al consultar zonas sin sector:', error);
        res.status(500).json({ mensaje: 'Error al consultar' });
    }
};

module.exports = { obtenerDominio, sectores, personal, unidades, escuadras, lugares, asignarSectorPendientes, zonasSinSector };
