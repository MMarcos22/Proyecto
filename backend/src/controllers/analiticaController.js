// Módulo de análisis de datos institucionales (Objetivo específico 2)
// Regla de oro: nunca se suman cantidades de insumos distintos (unidades heterogéneas).
// Entre insumos se cuentan "consumos registrados"; las cantidades se reportan por insumo.
const { query } = require('../config/database');
const { leerPeriodo, entero } = require('../utils/comun');


// Filtros opcionales comunes sobre emergencias (alias e)
const filtrosServicio = (q, val) => {
    const cond = [`e.estado IN ('pendiente', 'completa', 'firmada')`];
    if (q.tipo_servicio) { val.push(q.tipo_servicio); cond.push(`e.tipo_servicio = $${val.length}`); }
    if (q.sector_id) { val.push(entero(q.sector_id)); cond.push(`e.sector_id = $${val.length}`); }
    return cond;
};

const variacion = (actual, anterior) =>
    anterior ? Math.round(((actual - anterior) / anterior) * 1000) / 10 : null;

// ── PANEL ────────────────────────────────────────
const panel = async (req, res) => {
    const p = leerPeriodo(req.query);
    try {
        const resumen = await query(`
      SELECT
        COUNT(*) FILTER (WHERE fecha BETWEEN $1 AND $2)::int AS servicios,
        COUNT(*) FILTER (WHERE fecha BETWEEN $3 AND $4)::int AS servicios_anterior,
        ROUND(AVG(minutos_trabajados) FILTER (WHERE fecha BETWEEN $1 AND $2))::int AS minutos_promedio,
        COUNT(DISTINCT sector_id) FILTER (WHERE fecha BETWEEN $1 AND $2)::int AS sectores_con_servicio,
        COUNT(*) FILTER (WHERE fecha BETWEEN $1 AND $2 AND sector_id IS NULL)::int AS sin_sector
      FROM emergencias WHERE estado IN ('pendiente', 'completa', 'firmada')`, [p.desde, p.hasta, p.anterior.desde, p.anterior.hasta]);

        const porTipo = await query(`
      SELECT tipo_servicio,
        COUNT(*) FILTER (WHERE fecha BETWEEN $1 AND $2)::int AS total,
        COUNT(*) FILTER (WHERE fecha BETWEEN $3 AND $4)::int AS anterior
      FROM emergencias WHERE estado IN ('pendiente', 'completa', 'firmada') AND fecha BETWEEN $3 AND $2
      GROUP BY tipo_servicio`, [p.desde, p.hasta, p.anterior.desde, p.anterior.hasta]);

        const porSector = await query(`
      SELECT COALESCE(s.nombre, 'Sin sector') AS sector, e.sector_id,
             COUNT(*)::int AS total,
             MODE() WITHIN GROUP (ORDER BY e.tipo_servicio) AS tipo_predominante
      FROM emergencias e LEFT JOIN sectores s ON s.id = e.sector_id
      WHERE e.estado IN ('pendiente', 'completa', 'firmada') AND e.fecha BETWEEN $1 AND $2
      GROUP BY s.nombre, e.sector_id ORDER BY total DESC LIMIT 8`, [p.desde, p.hasta]);

        const porDia = await query(`
      SELECT d::date AS fecha, COUNT(e.id)::int AS total
      FROM generate_series($1::date, $2::date, '1 day') d
      LEFT JOIN emergencias e ON e.fecha = d::date AND e.estado IN ('pendiente', 'completa', 'firmada')
      GROUP BY d ORDER BY d`, [p.desde, p.hasta]);

        const inventario = await query(`
      SELECT
        (SELECT COUNT(*)::int FROM insumos WHERE activo AND stock_actual = 0) AS agotados,
        (SELECT COUNT(*)::int FROM insumos WHERE activo AND stock_actual > 0 AND stock_actual <= stock_minimo) AS bajos,
        (SELECT COUNT(*)::int FROM lotes WHERE saldo > 0 AND fecha_vencimiento < CURRENT_DATE) AS lotes_vencidos,
        (SELECT COUNT(*)::int FROM lotes WHERE saldo > 0 AND fecha_vencimiento BETWEEN CURRENT_DATE AND CURRENT_DATE + 30) AS lotes_por_vencer`);

        const recientes = await query(`
      SELECT e.id, e.numero_control, e.tipo_servicio, e.subtipo, e.fecha, e.hora_salida,
             COALESCE(s.nombre, e.zona) AS sector, e.unidad
      FROM emergencias e LEFT JOIN sectores s ON s.id = e.sector_id
      WHERE e.estado IN ('pendiente', 'completa', 'firmada')
      ORDER BY e.fecha DESC, e.hora_salida DESC NULLS LAST, e.id DESC LIMIT 6`);

        const r = resumen.rows[0];
        res.json({
            periodo: p,
            resumen: { ...r, variacion: variacion(r.servicios, r.servicios_anterior) },
            por_tipo: porTipo.rows.map(t => ({ ...t, variacion: variacion(t.total, t.anterior) }))
                .sort((a, b) => b.total - a.total),
            por_sector: porSector.rows,
            por_dia: porDia.rows,
            inventario: inventario.rows[0],
            recientes: recientes.rows
        });
    } catch (error) {
        console.error('Error en panel:', error);
        res.status(500).json({ mensaje: 'Error al generar el panel' });
    }
};

// ── INFORME INTEGRADO: servicios × consumo × tipo × sector ─
const integrado = async (req, res) => {
    const p = leerPeriodo(req.query);
    const val = [p.desde, p.hasta];
    const cond = [...filtrosServicio(req.query, val), 'e.fecha BETWEEN $1 AND $2'];
    const where = `WHERE ${cond.join(' AND ')}`;

    try {
        const resumen = await query(`
      SELECT COUNT(DISTINCT e.id)::int AS servicios,
             COUNT(DISTINCT e.id) FILTER (WHERE m.id IS NOT NULL)::int AS servicios_con_consumo,
             COUNT(m.id)::int AS consumos,
             COUNT(DISTINCT m.insumo_id)::int AS insumos_distintos
      FROM emergencias e
      LEFT JOIN v_consumo_servicio m ON m.emergencia_id = e.id
      ${where}`, val);

        const porTipo = await query(`
      SELECT e.tipo_servicio,
             COUNT(DISTINCT e.id)::int AS servicios,
             COUNT(DISTINCT e.id) FILTER (WHERE m.id IS NOT NULL)::int AS con_consumo,
             COUNT(m.id)::int AS consumos,
             ROUND(AVG(e.minutos_trabajados))::int AS minutos_promedio
      FROM emergencias e
      LEFT JOIN v_consumo_servicio m ON m.emergencia_id = e.id
      ${where}
      GROUP BY e.tipo_servicio ORDER BY servicios DESC`, val);

        const porSector = await query(`
      SELECT e.sector_id, COALESCE(s.nombre, 'Sin sector') AS sector,
             COUNT(DISTINCT e.id)::int AS servicios,
             COUNT(DISTINCT e.id) FILTER (WHERE m.id IS NOT NULL)::int AS con_consumo,
             COUNT(m.id)::int AS consumos,
             MODE() WITHIN GROUP (ORDER BY e.tipo_servicio) AS tipo_predominante
      FROM emergencias e
      LEFT JOIN sectores s ON s.id = e.sector_id
      LEFT JOIN v_consumo_servicio m ON m.emergencia_id = e.id
      ${where}
      GROUP BY e.sector_id, s.nombre ORDER BY servicios DESC`, val);

        // Matriz insumo × tipo de servicio, con tasa por servicio atendido
        const matriz = await query(`
      SELECT i.id AS insumo_id, i.nombre, i.categoria, i.unidad_medida, e.tipo_servicio,
             SUM(m.cantidad)::int AS cantidad,
             COUNT(DISTINCT e.id)::int AS servicios
      FROM v_consumo_servicio m
      JOIN insumos i ON i.id = m.insumo_id
      JOIN emergencias e ON e.id = m.emergencia_id
      ${where}
      GROUP BY i.id, i.nombre, i.categoria, i.unidad_medida, e.tipo_servicio`, val);

        // Insumos principales por sector
        const sectorInsumo = await query(`
      SELECT e.sector_id, i.nombre, i.unidad_medida, SUM(m.cantidad)::int AS cantidad
      FROM v_consumo_servicio m
      JOIN insumos i ON i.id = m.insumo_id
      JOIN emergencias e ON e.id = m.emergencia_id
      ${where}
      GROUP BY e.sector_id, i.nombre, i.unidad_medida
      ORDER BY cantidad DESC`, val);

        // Consumo por escuadra: lo entregado por vale (prehospitalario) frente a los servicios que
        // la escuadra atendió en sus turnos. Estima el consumo por servicio sin pedir nada extra
        // a la tripulación (análisis §10.1).
        const porEscuadra = await query(`
      SELECT es.id, es.nombre,
        (SELECT COUNT(*)::int FROM emergencias e JOIN turnos t ON t.id = e.turno_id
          WHERE t.escuadra_id = es.id AND e.estado IN ('pendiente', 'completa', 'firmada') AND e.fecha BETWEEN $1 AND $2) AS servicios,
        (SELECT COUNT(*)::int FROM documentos_inventario d
          WHERE d.tipo = 'vale' AND d.escuadra_id = es.id AND d.categoria = 'prehospitalario' AND d.fecha BETWEEN $1 AND $2) AS vales,
        (SELECT COALESCE(SUM(m.cantidad), 0)::int FROM movimientos_inventario m JOIN documentos_inventario d ON d.id = m.documento_id
          WHERE d.tipo = 'vale' AND d.escuadra_id = es.id AND d.categoria = 'prehospitalario' AND d.fecha BETWEEN $1 AND $2) AS unidades
      FROM escuadras es WHERE es.activo ORDER BY es.nombre`, [p.desde, p.hasta]);

        const serviciosPorTipo = Object.fromEntries(porTipo.rows.map(t => [t.tipo_servicio, t.servicios]));
        const insumos = {};
        for (const f of matriz.rows) {
            const it = insumos[f.insumo_id] ||= {
                insumo_id: f.insumo_id, nombre: f.nombre, categoria: f.categoria,
                unidad_medida: f.unidad_medida, total: 0, por_tipo: {}
            };
            it.total += f.cantidad;
            it.por_tipo[f.tipo_servicio] = {
                cantidad: f.cantidad, servicios: f.servicios,
                por_servicio: Math.round((f.cantidad / (serviciosPorTipo[f.tipo_servicio] || 1)) * 100) / 100
            };
        }

        const topPorSector = {};
        for (const f of sectorInsumo.rows) {
            const k = f.sector_id ?? 'sin';
            (topPorSector[k] ||= []).length < 3 && topPorSector[k].push(f);
        }

        res.json({
            periodo: p,
            resumen: resumen.rows[0],
            por_tipo: porTipo.rows,
            por_sector: porSector.rows.map(s => ({ ...s, insumos_principales: topPorSector[s.sector_id ?? 'sin'] || [] })),
            matriz: Object.values(insumos).sort((a, b) => b.total - a.total),
            por_escuadra: porEscuadra.rows.map(e => ({ ...e, por_servicio: e.servicios ? Math.round((e.unidades / e.servicios) * 10) / 10 : null }))
        });
    } catch (error) {
        console.error('Error en informe integrado:', error);
        res.status(500).json({ mensaje: 'Error al generar el informe integrado' });
    }
};

// ── TENDENCIAS Y ASIGNACIÓN DE RECURSOS ──────────
const tendencias = async (req, res) => {
    const p = leerPeriodo(req.query);
    const val = [p.desde, p.hasta];
    const cond = [...filtrosServicio(req.query, val), 'e.fecha BETWEEN $1 AND $2'];
    const where = `WHERE ${cond.join(' AND ')}`;

    try {
        // Serie de 12 meses que terminan en el mes de "hasta"
        const valMes = [p.hasta];
        const condMes = filtrosServicio(req.query, valMes);
        const mensual = await query(`
      SELECT TO_CHAR(DATE_TRUNC('month', e.fecha), 'YYYY-MM') AS mes, e.tipo_servicio, COUNT(*)::int AS total
      FROM emergencias e
      WHERE ${condMes.join(' AND ')}
        AND e.fecha >= DATE_TRUNC('month', $1::date) - INTERVAL '11 months'
        AND e.fecha <= $1::date
      GROUP BY 1, 2 ORDER BY 1`, valMes);

        const calor = await query(`
      SELECT EXTRACT(ISODOW FROM e.fecha)::int AS dia, EXTRACT(HOUR FROM e.hora_salida)::int AS hora,
             COUNT(*)::int AS total
      FROM emergencias e ${where} AND e.hora_salida IS NOT NULL
      GROUP BY 1, 2`, val);

        const unidades = await query(`
      SELECT COALESCE(u.codigo, NULLIF(e.unidad, ''), 'Sin unidad') AS unidad,
             COUNT(*)::int AS servicios,
             COALESCE(SUM(e.minutos_trabajados), 0)::int AS minutos,
             ROUND(AVG(e.minutos_trabajados))::int AS minutos_promedio,
             MODE() WITHIN GROUP (ORDER BY e.tipo_servicio) AS tipo_predominante
      FROM emergencias e LEFT JOIN unidades u ON u.id = e.unidad_id
      ${where}
      GROUP BY 1 ORDER BY servicios DESC`, val);

        const subtipos = await query(`
      SELECT e.tipo_servicio, COALESCE(e.subtipo, 'sin_clasificar') AS subtipo, COUNT(*)::int AS total
      FROM emergencias e ${where}
      GROUP BY 1, 2 ORDER BY total DESC`, val);

        const sinHora = await query(`SELECT COUNT(*)::int AS n FROM emergencias e ${where} AND e.hora_salida IS NULL`, val);

        res.json({
            periodo: p,
            mensual: mensual.rows,
            calor: calor.rows,
            sin_hora: sinHora.rows[0].n,
            unidades: unidades.rows,
            subtipos: subtipos.rows
        });
    } catch (error) {
        console.error('Error en tendencias:', error);
        res.status(500).json({ mensaje: 'Error al calcular las tendencias' });
    }
};

module.exports = { panel, integrado, tendencias, variacion };
