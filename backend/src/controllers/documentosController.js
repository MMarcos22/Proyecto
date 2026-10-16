// Documentos de inventario (Objetivo específico 3).
// Cada movimiento de bodega nace de un documento con varias líneas, como en
// papel: la constancia de ingreso y la hojita de salida que se firma
// (entrevista 00:42 y 01:41). Así la hoja mensual se calcula sola.
//   entrada → crea un lote por línea (con lote y vencimiento si el insumo vence)
//   vale    → salida a una escuadra; descuenta el lote que vence primero
//   baja    → salida por vencimiento, daño o pérdida
//   ajuste  → diferencia entre lo contado y lo registrado
const { query, getClient } = require('../config/database');
const { DOCUMENTOS, ORIGENES_ENTRADA } = require('../config/dominio');
const { registrarBitacora, entero, FECHA_ISO, hoyGuatemala } = require('../utils/comun');
const { ErrorNegocio, registrarEntrada, registrarSalida } = require('../services/inventarioService');

const MOTIVO_BAJA = { vencimiento: 'baja_vencimiento', dano: 'baja_dano' };

const responderError = (res, error, contexto) => {
    if (error instanceof ErrorNegocio) return res.status(error.estado).json({ mensaje: error.message });
    console.error(contexto, error);
    res.status(500).json({ mensaje: 'Ocurrió un error al registrar el documento' });
};

// ¿El mes de esta fecha ya se cerró? (RN-11)
const mesCerrado = async (db, fecha) => {
    const r = await db.query('SELECT 1 FROM cierres_mensuales WHERE anio = $1 AND mes = $2',
        [Number(fecha.slice(0, 4)), Number(fecha.slice(5, 7))]);
    return r.rows.length > 0;
};

const siguienteNumero = async (db, tipo, anio) => {
    await db.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`doc-${tipo}-${anio}`]);
    const r = await db.query('SELECT COALESCE(MAX(secuencia), 0) + 1 AS n FROM documentos_inventario WHERE tipo = $1 AND anio = $2', [tipo, anio]);
    const n = r.rows[0].n;
    return { n, numero: `${DOCUMENTOS[tipo].prefijo}-${anio}-${String(n).padStart(4, '0')}` };
};

// ── REGISTRAR UN DOCUMENTO CON SUS LÍNEAS ─────────
const registrar = async (req, res) => {
    const b = req.body;
    const tipo = b.tipo;
    if (!DOCUMENTOS[tipo]) return res.status(400).json({ mensaje: 'Tipo de documento no válido' });
    const fecha = FECHA_ISO.test(b.fecha || '') ? b.fecha : hoyGuatemala();
    if (fecha > hoyGuatemala()) return res.status(400).json({ mensaje: 'La fecha no puede ser futura' });
    const lineas = (Array.isArray(b.lineas) ? b.lineas : []).filter(l => l.insumo_id && Number(l.cantidad) !== 0);
    if (!lineas.length) return res.status(400).json({ mensaje: 'Agregue al menos un insumo' });
    if (tipo === 'entrada' && !ORIGENES_ENTRADA[b.origen]) return res.status(400).json({ mensaje: 'Indique de dónde viene la entrada' });
    if (tipo === 'vale' && (!entero(b.escuadra_id) || !entero(b.recibe_id) || !b.entrega?.trim())) {
        return res.status(400).json({ mensaje: 'El vale necesita la escuadra, quién recibe y quién entrega (RN-10)' });
    }
    if (tipo === 'baja' && !MOTIVO_BAJA[b.motivo_baja]) return res.status(400).json({ mensaje: 'Indique si la baja es por vencimiento o por daño o pérdida' });
    if (tipo === 'ajuste' && !b.observaciones?.trim()) return res.status(400).json({ mensaje: 'Explique el motivo del ajuste (por ejemplo, el conteo físico del día)' });

    const cliente = await getClient();
    try {
        await cliente.query('BEGIN');
        if (tipo === 'vale') {
            const r = await cliente.query('SELECT escuadra_id FROM personal WHERE id = $1', [entero(b.recibe_id)]);
            if (r.rows[0]?.escuadra_id !== entero(b.escuadra_id)) throw new ErrorNegocio('Quien recibe el vale debe ser de la escuadra que lo retira');
        }
        if (await mesCerrado(cliente, fecha) && !b.justificacion?.trim()) {
            throw new ErrorNegocio('Ese mes ya está cerrado. Para registrar un movimiento con esa fecha escriba la justificación', 409);
        }
        const anio = Number(fecha.slice(0, 4));
        const { n, numero } = await siguienteNumero(cliente, tipo, anio);
        const observaciones = [b.observaciones?.trim(), b.justificacion?.trim() && `Mes cerrado: ${b.justificacion.trim()}`].filter(Boolean).join(' · ') || null;
        const doc = await cliente.query(`
      INSERT INTO documentos_inventario (tipo, numero, secuencia, anio, fecha, categoria, origen, donante, constancia,
        escuadra_id, recibe_id, entrega, observaciones, usuario_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING id`,
            [tipo, numero, n, anio, fecha, b.categoria || null, tipo === 'entrada' ? b.origen : null, b.donante?.trim() || null,
                b.constancia?.trim() || null, entero(b.escuadra_id), entero(b.recibe_id), b.entrega?.trim() || null, observaciones, req.usuario.id]);
        const documentoId = doc.rows[0].id;

        const alertas = [];
        for (const l of lineas) {
            // La cantidad puede venir en la presentación de compra (cajas, paquetes)
            const ins = await cliente.query('SELECT nombre, factor_presentacion FROM insumos WHERE id = $1', [entero(l.insumo_id)]);
            if (!ins.rows.length) throw new ErrorNegocio('Uno de los insumos no existe', 404);
            const factor = l.en_presentacion ? ins.rows[0].factor_presentacion : 1;
            const cantidad = Math.abs(Number(l.cantidad)) * factor;
            const comun = { insumo_id: entero(l.insumo_id), cantidad, fecha_movimiento: fecha, documento: numero, documento_id: documentoId, observaciones: l.observaciones };

            if (tipo === 'entrada') {
                await registrarEntrada(cliente, { ...comun, motivo: b.origen, numero_lote: l.numero_lote, fecha_vencimiento: l.fecha_vencimiento || null }, req.usuario.id);
            } else if (tipo === 'ajuste' && Number(l.cantidad) > 0) {
                await registrarEntrada(cliente, { ...comun, motivo: 'ajuste', numero_lote: l.numero_lote, fecha_vencimiento: l.fecha_vencimiento || null }, req.usuario.id);
            } else {
                const motivo = tipo === 'vale' ? 'entrega_escuadra' : tipo === 'baja' ? MOTIVO_BAJA[b.motivo_baja] : 'ajuste';
                const r = await registrarSalida(cliente, { ...comun, motivo, lote_id: l.lote_id || null }, req.usuario.id);
                if (r.alerta) alertas.push(r.alerta);
            }
        }

        await registrarBitacora(cliente, req.usuario.id, 'crear', 'documento', documentoId, { numero, tipo, lineas: lineas.length });
        await cliente.query('COMMIT');
        const genero = ['entrada', 'baja'].includes(tipo) ? 'registrada' : 'registrado';
        res.status(201).json({ mensaje: `${DOCUMENTOS[tipo].nombre} ${numero} ${genero}`, id: documentoId, numero, alertas });
    } catch (e) {
        await cliente.query('ROLLBACK');
        responderError(res, e, 'Error al registrar documento:');
    } finally {
        cliente.release();
    }
};

// ── LISTAR DOCUMENTOS ─────────────────────────────
const listar = async (req, res) => {
    const cond = [];
    const val = [];
    if (DOCUMENTOS[req.query.tipo]) { val.push(req.query.tipo); cond.push(`d.tipo = $${val.length}`); }
    if (FECHA_ISO.test(req.query.desde || '')) { val.push(req.query.desde); cond.push(`d.fecha >= $${val.length}`); }
    if (FECHA_ISO.test(req.query.hasta || '')) { val.push(req.query.hasta); cond.push(`d.fecha <= $${val.length}`); }
    if (req.query.texto?.trim()) {
        val.push(`%${req.query.texto.trim()}%`);
        cond.push(`(d.numero ILIKE $${val.length} OR d.constancia ILIKE $${val.length} OR d.donante ILIKE $${val.length}
      OR p.nombre_completo ILIKE $${val.length} OR EXISTS (SELECT 1 FROM movimientos_inventario m JOIN insumos i ON i.id = m.insumo_id
         WHERE m.documento_id = d.id AND i.nombre ILIKE $${val.length}))`);
    }
    try {
        const r = await query(`
      SELECT d.*, e.nombre AS escuadra, p.nombre_completo AS recibe, u.nombre_completo AS registrado_por,
             (SELECT COUNT(DISTINCT m.insumo_id)::int FROM movimientos_inventario m WHERE m.documento_id = d.id) AS insumos,
             (SELECT COALESCE(SUM(m.cantidad), 0)::int FROM movimientos_inventario m WHERE m.documento_id = d.id) AS unidades
      FROM documentos_inventario d
      LEFT JOIN escuadras e ON e.id = d.escuadra_id
      LEFT JOIN personal p ON p.id = d.recibe_id
      JOIN usuarios u ON u.id = d.usuario_id
      ${cond.length ? `WHERE ${cond.join(' AND ')}` : ''}
      ORDER BY d.fecha DESC, d.id DESC LIMIT 200`, val);
        res.json(r.rows);
    } catch (error) {
        console.error('Error al listar documentos:', error);
        res.status(500).json({ mensaje: 'Error al consultar los documentos' });
    }
};

// ── UN DOCUMENTO CON SUS LÍNEAS ───────────────────
const obtener = async (req, res) => {
    const id = entero(req.params.id);
    try {
        const d = await query(`
      SELECT d.*, e.nombre AS escuadra, p.nombre_completo AS recibe, u.nombre_completo AS registrado_por
      FROM documentos_inventario d
      LEFT JOIN escuadras e ON e.id = d.escuadra_id
      LEFT JOIN personal p ON p.id = d.recibe_id
      JOIN usuarios u ON u.id = d.usuario_id WHERE d.id = $1`, [id]);
        if (!d.rows.length) return res.status(404).json({ mensaje: 'Documento no encontrado' });
        const lineas = await query(`
      SELECT m.id, m.tipo_movimiento, m.motivo, m.cantidad, m.numero_lote, m.fecha_vencimiento,
             i.id AS insumo_id, i.nombre, i.categoria, i.unidad_medida
      FROM movimientos_inventario m JOIN insumos i ON i.id = m.insumo_id
      WHERE m.documento_id = $1 ORDER BY i.categoria, i.nombre, m.id`, [id]);
        res.json({ ...d.rows[0], lineas: lineas.rows });
    } catch (error) {
        console.error('Error al obtener documento:', error);
        res.status(500).json({ mensaje: 'Error al consultar el documento' });
    }
};

// ── CIERRE MENSUAL (RN-11) ────────────────────────
// Congela el saldo de cada insumo al último día del mes
const cerrarMes = async (req, res) => {
    const anio = entero(req.body.anio);
    const mes = entero(req.body.mes);
    if (!anio || !mes || mes < 1 || mes > 12) return res.status(400).json({ mensaje: 'Indique el mes y el año' });
    const ultimo = new Date(Date.UTC(anio, mes, 0)).toISOString().slice(0, 10);
    if (ultimo >= hoyGuatemala()) return res.status(400).json({ mensaje: 'Solo se puede cerrar un mes que ya terminó' });
    try {
        const saldos = await query(`
      SELECT i.id AS insumo_id, i.nombre, i.categoria,
             COALESCE(SUM(CASE WHEN m.tipo_movimiento = 'entrada' THEN m.cantidad ELSE -m.cantidad END), 0)::int AS saldo
      FROM insumos i LEFT JOIN movimientos_inventario m ON m.insumo_id = i.id AND m.fecha_movimiento <= $1
      GROUP BY i.id, i.nombre, i.categoria ORDER BY i.categoria, i.nombre`, [ultimo]);
        const r = await query(`
      INSERT INTO cierres_mensuales (anio, mes, saldos, cerrado_por) VALUES ($1, $2, $3, $4)
      ON CONFLICT (anio, mes) DO NOTHING RETURNING id`, [anio, mes, JSON.stringify(saldos.rows), req.usuario.id]);
        if (!r.rows.length) return res.status(409).json({ mensaje: 'Ese mes ya estaba cerrado' });
        await registrarBitacora({ query }, req.usuario.id, 'cerrar_mes', 'inventario', r.rows[0].id, { anio, mes });
        res.status(201).json({ mensaje: 'Mes cerrado. Sus saldos quedan como lo que «viene» al mes siguiente' });
    } catch (error) {
        console.error('Error al cerrar mes:', error);
        res.status(500).json({ mensaje: 'Error al cerrar el mes' });
    }
};

const cierres = async (req, res) => {
    try {
        const r = await query(`
      SELECT c.id, c.anio, c.mes, c.cerrado_en, u.nombre_completo AS cerrado_por
      FROM cierres_mensuales c JOIN usuarios u ON u.id = c.cerrado_por ORDER BY c.anio DESC, c.mes DESC`);
        res.json(r.rows);
    } catch (error) {
        console.error('Error al listar cierres:', error);
        res.status(500).json({ mensaje: 'Error al consultar los cierres' });
    }
};

module.exports = { registrar, listar, obtener, cerrarMes, cierres };
