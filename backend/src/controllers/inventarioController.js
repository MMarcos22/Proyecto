const { query, getClient } = require('../config/database');
const { CATEGORIAS, CLASES_INSUMO } = require('../config/dominio');
const { registrarBitacora, entero } = require('../utils/comun');
const {
    ErrorNegocio, registrarEntrada: entradaServicio,
    registrarSalida: salidaServicio, anularMovimiento
} = require('../services/inventarioService');

const DIAS_AVISO_VENCIMIENTO = 90;

const ejecutar = (contexto, fn) => async (req, res) => {
    const cliente = await getClient();
    try {
        await cliente.query('BEGIN');
        const r = await fn(cliente, req);
        await cliente.query('COMMIT');
        res.status(r.estado || 200).json(r.cuerpo);
    } catch (error) {
        await cliente.query('ROLLBACK');
        if (error instanceof ErrorNegocio) return res.status(error.estado).json({ mensaje: error.message });
        if (error.code === '23505') return res.status(409).json({ mensaje: 'Registro duplicado' });
        console.error(contexto, error);
        res.status(500).json({ mensaje: 'Ocurrió un error al procesar el movimiento' });
    } finally {
        cliente.release();
    }
};

// ── EXISTENCIAS ──────────────────────────────────
// Estado: agotado (0), bajo (<= mínimo), normal. Se agregan datos de lote y consumo de 90 días
const listarInsumos = async (req, res) => {
    const { categoria, estado } = req.query;
    const val = [];
    let filtro = '';
    if (categoria) { val.push(categoria); filtro = `AND i.categoria = $1`; }

    try {
        const r = await query(`
      SELECT i.id, i.nombre, i.categoria, i.clase, i.presentacion, i.factor_presentacion,
        i.unidad_medida, i.stock_actual, i.stock_minimo,
        CASE WHEN i.stock_actual = 0 THEN 'agotado'
             WHEN i.stock_actual <= i.stock_minimo THEN 'bajo'
             ELSE 'normal' END AS estado,
        (SELECT COUNT(*)::int FROM lotes l WHERE l.insumo_id = i.id AND l.saldo > 0) AS lotes_vigentes,
        (SELECT MIN(l.fecha_vencimiento) FROM lotes l
          WHERE l.insumo_id = i.id AND l.saldo > 0) AS proximo_vencimiento,
        (SELECT COALESCE(SUM(l.saldo),0)::int FROM lotes l
          WHERE l.insumo_id = i.id AND l.saldo > 0 AND l.fecha_vencimiento < CURRENT_DATE) AS cantidad_vencida,
        (SELECT COALESCE(SUM(m.cantidad),0)::int FROM movimientos_inventario m
          WHERE m.insumo_id = i.id AND m.tipo_movimiento = 'salida'
            AND m.motivo IN ('entrega_escuadra','consumo_servicio','uso_interno')
            AND m.fecha_movimiento > CURRENT_DATE - 90) AS consumo_90
      FROM insumos i
      WHERE i.activo = TRUE ${filtro}
      ORDER BY i.categoria, i.nombre`, val);

        const insumos = estado ? r.rows.filter(i => i.estado === estado) : r.rows;
        res.json({ total: insumos.length, insumos });
    } catch (error) {
        console.error('Error al listar insumos:', error);
        res.status(500).json({ mensaje: 'Error al consultar las existencias' });
    }
};

// ── ALERTAS ──────────────────────────────────────
// Los vencimientos solo consideran lotes con saldo: un lote consumido no genera aviso
const alertasDetalladas = async (req, res) => {
    try {
        const criticos = await query(`
      SELECT id, nombre, categoria, unidad_medida, stock_actual, stock_minimo,
        CASE WHEN stock_actual = 0 THEN 'agotado' ELSE 'bajo' END AS estado
      FROM insumos
      WHERE activo = TRUE AND stock_actual <= stock_minimo
      ORDER BY stock_actual ASC, nombre`);

        const lotes = await query(`
      SELECT l.id AS lote_id, i.id, i.nombre, i.categoria, i.unidad_medida,
             l.numero_lote, l.fecha_vencimiento, l.saldo AS cantidad,
             (l.fecha_vencimiento - CURRENT_DATE)::int AS dias_restantes,
        CASE WHEN l.fecha_vencimiento < CURRENT_DATE THEN 'vencido'
             WHEN l.fecha_vencimiento <= CURRENT_DATE + 30 THEN 'critico'
             ELSE 'proximo' END AS urgencia
      FROM lotes l JOIN insumos i ON i.id = l.insumo_id
      WHERE l.saldo > 0 AND i.activo = TRUE
        AND l.fecha_vencimiento IS NOT NULL
        AND l.fecha_vencimiento <= CURRENT_DATE + ${DIAS_AVISO_VENCIMIENTO}
      ORDER BY l.fecha_vencimiento ASC`);

        const agotados = criticos.rows.filter(i => i.estado === 'agotado');
        const bajos = criticos.rows.filter(i => i.estado === 'bajo');
        const vencidos = lotes.rows.filter(v => v.urgencia === 'vencido');
        const porVencer = lotes.rows.filter(v => v.urgencia !== 'vencido');

        res.json({
            resumen: {
                agotados: agotados.length, bajos: bajos.length,
                vencidos: vencidos.length, por_vencer: porVencer.length,
                total: agotados.length + bajos.length + vencidos.length + porVencer.length
            },
            insumos_agotados: agotados,
            existencia_baja: bajos,
            lotes_vencidos: vencidos,
            lotes_por_vencer: porVencer
        });
    } catch (error) {
        console.error('Error al obtener alertas:', error);
        res.status(500).json({ mensaje: 'Error al consultar las alertas' });
    }
};

// ── LOTES ────────────────────────────────────────
const listarLotes = async (req, res) => {
    const { insumo_id, categoria, estado } = req.query;
    const cond = ['i.activo = TRUE'];
    const val = [];
    if (insumo_id) { val.push(insumo_id); cond.push(`l.insumo_id = $${val.length}`); }
    if (categoria) { val.push(categoria); cond.push(`i.categoria = $${val.length}`); }
    if (estado === 'vigentes') cond.push('l.saldo > 0');
    if (estado === 'vencidos') cond.push('l.saldo > 0 AND l.fecha_vencimiento < CURRENT_DATE');
    if (estado === 'por_vencer') cond.push(`l.saldo > 0 AND l.fecha_vencimiento BETWEEN CURRENT_DATE AND CURRENT_DATE + ${DIAS_AVISO_VENCIMIENTO}`);
    if (estado === 'agotados') cond.push('l.saldo = 0');

    try {
        const r = await query(`
      SELECT l.id, l.insumo_id, i.nombre AS insumo, i.categoria, i.unidad_medida,
             l.numero_lote, l.fecha_vencimiento, l.fecha_ingreso, l.cantidad_inicial, l.saldo,
             (l.fecha_vencimiento - CURRENT_DATE)::int AS dias_restantes
      FROM lotes l JOIN insumos i ON i.id = l.insumo_id
      WHERE ${cond.join(' AND ')}
      ORDER BY (l.saldo = 0), l.fecha_vencimiento NULLS LAST, i.nombre`, val);
        res.json({ total: r.rows.length, lotes: r.rows });
    } catch (error) {
        console.error('Error al listar lotes:', error);
        res.status(500).json({ mensaje: 'Error al consultar los lotes' });
    }
};

// ── KARDEX DE UN INSUMO (saldo acumulado por movimiento) ─
const kardex = async (req, res) => {
    const id = entero(req.params.id);
    const { desde, hasta } = req.query;
    try {
        const insumo = await query(
            'SELECT id, nombre, categoria, unidad_medida, stock_actual, stock_minimo FROM insumos WHERE id = $1', [id]);
        if (!insumo.rows.length) return res.status(404).json({ mensaje: 'El insumo no existe' });

        const r = await query(`
      SELECT m.id, m.tipo_movimiento, m.motivo, m.cantidad, m.numero_lote, m.fecha_vencimiento,
             m.fecha_movimiento, m.documento, m.observaciones, m.emergencia_id,
             e.numero_control AS servicio, e.tipo_servicio,
             u.nombre_completo AS registrado_por,
             SUM(CASE WHEN m.tipo_movimiento = 'entrada' THEN m.cantidad ELSE -m.cantidad END)
               OVER (ORDER BY m.fecha_movimiento, m.id)::int AS saldo
      FROM movimientos_inventario m
      JOIN usuarios u ON u.id = m.usuario_id
      LEFT JOIN emergencias e ON e.id = m.emergencia_id
      WHERE m.insumo_id = $1
      ORDER BY m.fecha_movimiento, m.id`, [id]);

        let movimientos = r.rows;
        if (desde) movimientos = movimientos.filter(m => m.fecha_movimiento >= desde);
        if (hasta) movimientos = movimientos.filter(m => m.fecha_movimiento <= hasta);

        res.json({ insumo: insumo.rows[0], movimientos });
    } catch (error) {
        console.error('Error al generar kardex:', error);
        res.status(500).json({ mensaje: 'Error al consultar el kardex' });
    }
};

// ── ENTRADA / SALIDA / ANULACIÓN ─────────────────
const registrarEntrada = ejecutar('Error al registrar entrada:', async (db, req) => {
    const r = await entradaServicio(db, req.body, req.usuario.id);
    return { estado: 201, cuerpo: { mensaje: 'Entrada registrada', ...r } };
});

const registrarSalida = ejecutar('Error al registrar salida:', async (db, req) => {
    const r = await salidaServicio(db, req.body, req.usuario.id);
    return { estado: 201, cuerpo: { mensaje: 'Salida registrada', ...r } };
});

const eliminarMovimiento = ejecutar('Error al anular movimiento:', async (db, req) => {
    await anularMovimiento(db, entero(req.params.id), req.usuario.id, req.body?.motivo);
    return { cuerpo: { mensaje: 'Movimiento anulado y existencia restablecida' } };
});

// ── HISTORIAL DE MOVIMIENTOS ─────────────────────
const listarMovimientos = async (req, res) => {
    const { tipo, motivo, categoria, desde, hasta, insumo_id, texto } = req.query;
    const pagina = Math.max(1, entero(req.query.pagina) || 1);
    const tamano = Math.min(200, Math.max(10, entero(req.query.tamano) || 50));

    const cond = [];
    const val = [];
    const agregar = (sql, v) => { val.push(v); cond.push(sql.replace('?', `$${val.length}`)); };
    if (tipo) agregar('m.tipo_movimiento = ?', tipo);
    if (motivo) agregar('m.motivo = ?', motivo);
    if (categoria) agregar('i.categoria = ?', categoria);
    if (insumo_id) agregar('m.insumo_id = ?', insumo_id);
    if (desde) agregar('m.fecha_movimiento >= ?', desde);
    if (hasta) agregar('m.fecha_movimiento <= ?', hasta);
    if (texto?.trim()) agregar('(i.nombre ILIKE ? OR m.numero_lote ILIKE $X OR e.numero_control ILIKE $X)'.replace(/\$X/g, `$${val.length + 1}`), `%${texto.trim()}%`);

    const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';
    const desdeSql = `
    FROM movimientos_inventario m
    JOIN insumos i  ON i.id = m.insumo_id
    JOIN usuarios u ON u.id = m.usuario_id
    LEFT JOIN emergencias e ON e.id = m.emergencia_id
    ${where}`;

    try {
        const totales = await query(`
      SELECT COUNT(*)::int AS n,
             COUNT(*) FILTER (WHERE m.tipo_movimiento = 'entrada')::int AS entradas,
             COUNT(*) FILTER (WHERE m.tipo_movimiento = 'salida')::int AS salidas
      ${desdeSql}`, val);
        const r = await query(`
      SELECT m.id, m.tipo_movimiento, m.motivo, m.cantidad, m.numero_lote, m.fecha_vencimiento,
             m.fecha_movimiento, m.documento, m.observaciones, m.insumo_id,
             i.nombre AS insumo, i.categoria, i.unidad_medida,
             m.emergencia_id, e.numero_control AS servicio, e.tipo_servicio,
             u.nombre_completo AS registrado_por
      ${desdeSql}
      ORDER BY m.fecha_movimiento DESC, m.id DESC
      LIMIT ${tamano} OFFSET ${(pagina - 1) * tamano}`, val);

        res.json({ ...totales.rows[0], total: totales.rows[0].n, pagina, tamano, movimientos: r.rows });
    } catch (error) {
        console.error('Error al listar movimientos:', error);
        res.status(500).json({ mensaje: 'Error al consultar los movimientos' });
    }
};

// ── CATÁLOGO DE INSUMOS ──────────────────────────
const validarInsumo = (b) => {
    if (!b.nombre?.trim()) return 'El nombre es obligatorio';
    if (!CATEGORIAS[b.categoria]) return 'Seleccione una categoría válida';
    const min = Number(b.stock_minimo ?? 0);
    if (!Number.isInteger(min) || min < 0) return 'El mínimo debe ser un entero mayor o igual a cero';
    return null;
};

// Clase (consumible con vencimiento, consumible, equipo) y presentación de compra
const datosClase = (b) => ({
    clase: CLASES_INSUMO[b.clase] ? b.clase : 'consumible',
    presentacion: b.presentacion?.trim() || null,
    factor: Math.max(1, entero(b.factor_presentacion) || 1)
});

const crearInsumo = async (req, res) => {
    const error = validarInsumo(req.body);
    if (error) return res.status(400).json({ mensaje: error });
    const { nombre, categoria, unidad_medida, stock_minimo } = req.body;
    const extra = datosClase(req.body);

    try {
        const existe = await query(
            'SELECT id FROM insumos WHERE LOWER(nombre) = LOWER($1) AND activo = TRUE', [nombre.trim()]);
        if (existe.rows.length) return res.status(409).json({ mensaje: 'Ya existe un insumo con ese nombre' });

        const r = await query(`
      INSERT INTO insumos (nombre, categoria, unidad_medida, stock_minimo, clase, presentacion, factor_presentacion)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, nombre, categoria, unidad_medida, stock_actual, stock_minimo, clase, presentacion, factor_presentacion`,
            [nombre.trim(), categoria, unidad_medida?.trim() || null, stock_minimo ?? 5, extra.clase, extra.presentacion, extra.factor]);
        await registrarBitacora({ query }, req.usuario.id, 'crear', 'insumo', r.rows[0].id, { nombre });
        res.status(201).json({ mensaje: 'Insumo agregado', insumo: r.rows[0] });
    } catch (error) {
        console.error('Error al crear insumo:', error);
        res.status(500).json({ mensaje: 'Error al agregar el insumo' });
    }
};

const editarInsumo = async (req, res) => {
    const error = validarInsumo(req.body);
    if (error) return res.status(400).json({ mensaje: error });
    const id = entero(req.params.id);
    const { nombre, categoria, unidad_medida, stock_minimo } = req.body;
    const extra = datosClase(req.body);

    try {
        const dup = await query(
            'SELECT id FROM insumos WHERE LOWER(nombre) = LOWER($1) AND id <> $2 AND activo = TRUE', [nombre.trim(), id]);
        if (dup.rows.length) return res.status(409).json({ mensaje: 'Ya existe otro insumo con ese nombre' });

        const r = await query(`
      UPDATE insumos SET nombre = $1, categoria = $2, unidad_medida = $3, stock_minimo = $4,
        clase = $6, presentacion = $7, factor_presentacion = $8
      WHERE id = $5
      RETURNING id, nombre, categoria, unidad_medida, stock_actual, stock_minimo, clase, presentacion, factor_presentacion`,
            [nombre.trim(), categoria, unidad_medida?.trim() || null, stock_minimo ?? 5, id, extra.clase, extra.presentacion, extra.factor]);
        if (!r.rows.length) return res.status(404).json({ mensaje: 'El insumo no existe' });
        await registrarBitacora({ query }, req.usuario.id, 'editar', 'insumo', id, req.body);
        res.json({ mensaje: 'Insumo actualizado', insumo: r.rows[0] });
    } catch (error) {
        console.error('Error al editar insumo:', error);
        res.status(500).json({ mensaje: 'Error al actualizar el insumo' });
    }
};

const eliminarInsumo = async (req, res) => {
    const id = entero(req.params.id);
    try {
        const i = await query('SELECT nombre, stock_actual FROM insumos WHERE id = $1', [id]);
        if (!i.rows.length) return res.status(404).json({ mensaje: 'El insumo no existe' });
        if (i.rows[0].stock_actual > 0) {
            return res.status(400).json({
                mensaje: `Aún hay ${i.rows[0].stock_actual} en existencia; regístrelas como salida antes de retirar el insumo`
            });
        }
        const movs = await query('SELECT COUNT(*)::int AS n FROM movimientos_inventario WHERE insumo_id = $1', [id]);
        if (movs.rows[0].n > 0) {
            await query('UPDATE insumos SET activo = FALSE WHERE id = $1', [id]);
        } else {
            await query('DELETE FROM insumos WHERE id = $1', [id]);
        }
        await registrarBitacora({ query }, req.usuario.id, 'retirar', 'insumo', id, { nombre: i.rows[0].nombre });
        res.json({
            mensaje: movs.rows[0].n > 0
                ? `${i.rows[0].nombre} se retiró del catálogo; su historial se conserva`
                : `${i.rows[0].nombre} se eliminó`
        });
    } catch (error) {
        console.error('Error al eliminar insumo:', error);
        res.status(500).json({ mensaje: 'Error al retirar el insumo' });
    }
};

module.exports = {
    listarInsumos, alertasDetalladas, listarLotes, kardex,
    registrarEntrada, registrarSalida, eliminarMovimiento, listarMovimientos,
    crearInsumo, editarInsumo, eliminarInsumo
};
