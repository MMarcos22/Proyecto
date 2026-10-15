// Informes que salen de la compañía (análisis §11 y §17.1). Cada uno tiene un
// destinatario real y se calcula con datos que el sistema ya guarda:
//   resumen anual de inventario      → capital / dirección          (entrevista 24:54)
//   proyección anual de insumos      → solicitud de febrero         (25:16)
//   salidas por unidad entre fechas  → justificar combustible       (08:38)
//   personas atendidas y accidentes  → convenio municipal           (44:34)
//   totales por tipo                 → capital                      (33:49)
const { query } = require('../config/database');
const { MOTIVOS_CONSUMO, SUBTIPOS, TIPOS_SERVICIO } = require('../config/dominio');
const { leerPeriodo, entero, contable, sumarDias, hoyGuatemala, FECHA_ISO } = require('../utils/comun');

const CONSUMO_BODEGA = `m.tipo_movimiento = 'salida' AND m.motivo IN ('${MOTIVOS_CONSUMO.join("','")}')`;
const ACCIDENTES = ['accidente_moto', 'accidente_vehiculo', 'atropello', 'accidente_trabajo'];

const fallo = (res, contexto, error) => {
    console.error(contexto, error);
    res.status(500).json({ mensaje: 'Error al preparar el informe' });
};

// ── RESUMEN ANUAL DE INVENTARIO ───────────────────
// Por insumo: lo que entró y salió cada mes del año, y el saldo al final
const resumenAnual = async (req, res) => {
    const anio = entero(req.query.anio) || Number(hoyGuatemala().slice(0, 4));
    try {
        const r = await query(`
      SELECT i.id, i.nombre, i.categoria, i.unidad_medida,
             EXTRACT(MONTH FROM m.fecha_movimiento)::int AS mes,
             COALESCE(SUM(m.cantidad) FILTER (WHERE m.tipo_movimiento = 'entrada'), 0)::int AS entradas,
             COALESCE(SUM(m.cantidad) FILTER (WHERE m.tipo_movimiento = 'salida'), 0)::int AS salidas
      FROM insumos i
      LEFT JOIN movimientos_inventario m ON m.insumo_id = i.id AND EXTRACT(YEAR FROM m.fecha_movimiento) = $1
      WHERE i.activo
      GROUP BY i.id, i.nombre, i.categoria, i.unidad_medida, mes
      ORDER BY i.categoria, i.nombre`, [anio]);
        const saldos = await query(`
      SELECT i.id,
             COALESCE(SUM(CASE WHEN m.tipo_movimiento = 'entrada' THEN m.cantidad ELSE -m.cantidad END)
                      FILTER (WHERE m.fecha_movimiento < make_date($1, 1, 1)), 0)::int AS inicial,
             COALESCE(SUM(CASE WHEN m.tipo_movimiento = 'entrada' THEN m.cantidad ELSE -m.cantidad END)
                      FILTER (WHERE m.fecha_movimiento <= make_date($1, 12, 31)), 0)::int AS final
      FROM insumos i LEFT JOIN movimientos_inventario m ON m.insumo_id = i.id
      WHERE i.activo GROUP BY i.id`, [anio]);
        const saldo = Object.fromEntries(saldos.rows.map(s => [s.id, s]));
        const insumos = {};
        for (const f of r.rows) {
            const it = insumos[f.id] ||= {
                id: f.id, nombre: f.nombre, categoria: f.categoria, unidad_medida: f.unidad_medida,
                inicial: saldo[f.id]?.inicial || 0, final: saldo[f.id]?.final || 0,
                meses: Array.from({ length: 12 }, () => ({ entradas: 0, salidas: 0 })), entradas: 0, salidas: 0
            };
            if (f.mes) {
                it.meses[f.mes - 1] = { entradas: f.entradas, salidas: f.salidas };
                it.entradas += f.entradas;
                it.salidas += f.salidas;
            }
        }
        res.json({ anio, insumos: Object.values(insumos) });
    } catch (error) { fallo(res, 'Error en resumen anual:', error); }
};

// ── PROYECCIÓN ANUAL DE INSUMOS ───────────────────
// Base: lo consumido (salidas de bodega) en los últimos 12 meses.
// Los insumos prehospitalarios crecen con los servicios de ambulancia y rescate;
// los demás se proyectan iguales. A pedir = proyección − existencia vigente.
const proyeccion = async (req, res) => {
    const hasta = hoyGuatemala();
    const desde = sumarDias(hasta, -364);
    const desdeAnterior = sumarDias(desde, -365);
    try {
        // Con menos de un año de datos se anualiza lo que hay
        const inicio = await query(`SELECT MIN(fecha_movimiento) AS f FROM movimientos_inventario`);
        const primerDia = inicio.rows[0].f ? new Date(inicio.rows[0].f).toISOString().slice(0, 10) : hasta;
        const diasConDatos = Math.max(1, Math.min(365, Math.round((new Date(hasta) - new Date(primerDia > desde ? primerDia : desde)) / 86400000) + 1));
        const factorAnual = 365 / diasConDatos;

        const serv = await query(`
      SELECT COUNT(*) FILTER (WHERE e.fecha BETWEEN $1 AND $2)::int AS actual,
             COUNT(*) FILTER (WHERE e.fecha BETWEEN $3 AND $1::date - 1)::int AS anterior,
             COUNT(*) FILTER (WHERE e.fecha BETWEEN $1 AND $2 AND e.tipo_servicio IN ('ambulancia', 'rescate'))::int AS prehosp
      FROM emergencias e WHERE ${contable('e')}`, [desde, hasta, desdeAnterior]);
        const s = serv.rows[0];
        // Crecimiento de la demanda: solo si hay un año anterior comparable; si no, 0 %
        const crecimiento = s.anterior >= 30 ? Math.round(((s.actual - s.anterior) / s.anterior) * 1000) / 1000 : 0;

        const r = await query(`
      SELECT i.id, i.nombre, i.categoria, i.clase, i.unidad_medida, i.stock_minimo, i.presentacion, i.factor_presentacion,
        COALESCE((SELECT SUM(m.cantidad) FROM movimientos_inventario m
                  WHERE m.insumo_id = i.id AND ${CONSUMO_BODEGA} AND m.fecha_movimiento BETWEEN $1 AND $2), 0)::int AS consumo,
        COALESCE((SELECT SUM(m.cantidad) FROM movimientos_inventario m
                  WHERE m.insumo_id = i.id AND m.tipo_movimiento = 'entrada' AND m.motivo = 'envio_capital'
                    AND m.fecha_movimiento BETWEEN $1 AND $2), 0)::int AS recibido_capital,
        COALESCE((SELECT SUM(l.saldo) FROM lotes l WHERE l.insumo_id = i.id AND l.saldo > 0
                  AND (l.fecha_vencimiento IS NULL OR l.fecha_vencimiento >= CURRENT_DATE)), 0)::int AS vigente,
        COALESCE((SELECT SUM(c.cantidad) FROM v_consumo_servicio c JOIN emergencias e ON e.id = c.emergencia_id
                  WHERE c.insumo_id = i.id AND e.fecha BETWEEN $1 AND $2 AND ${contable('e')}), 0)::int AS usado_en_servicios
      FROM insumos i WHERE i.activo AND i.clase <> 'equipo'
      ORDER BY i.categoria, i.nombre`, [desde, hasta]);

        const filas = r.rows.map(i => {
            const anual = i.consumo * factorAnual;
            const ajuste = i.categoria === 'prehospitalario' ? 1 + crecimiento : 1;
            const proyectado = Math.ceil(anual * ajuste);
            const pedir = Math.max(0, proyectado + i.stock_minimo - i.vigente);
            const diario = anual / 365;
            return {
                ...i, consumo_anual: Math.round(anual), proyectado, pedir,
                pedir_presentacion: i.presentacion && i.factor_presentacion > 1 ? Math.ceil(pedir / i.factor_presentacion) : null,
                cobertura_dias: diario > 0 ? Math.floor(i.vigente / diario) : null,
                por_servicio: s.prehosp && i.categoria === 'prehospitalario' ? Math.round((i.usado_en_servicios / s.prehosp) * 100) / 100 : null
            };
        });
        res.json({
            periodo: { desde, hasta, dias_con_datos: diasConDatos, anualizado: diasConDatos < 365 },
            servicios: { ...s, crecimiento },
            criterios: {
                consumo: 'Salidas de bodega por vale, uso interno y consumo en servicio de los últimos 12 meses',
                crecimiento: 'Prehospitalario se ajusta por el cambio en servicios respecto al año anterior (si hay al menos 30 servicios para comparar)',
                pedir: 'Proyección del año + existencia mínima − existencia vigente (sin contar lotes vencidos)'
            },
            insumos: filas
        });
    } catch (error) { fallo(res, 'Error en proyección:', error); }
};

// ── SALIDAS POR UNIDAD ENTRE FECHAS (combustible) ─
const salidasUnidad = async (req, res) => {
    const unidadId = entero(req.query.unidad_id);
    const desde = FECHA_ISO.test(req.query.desde || '') ? req.query.desde : null;
    const hasta = FECHA_ISO.test(req.query.hasta || '') ? req.query.hasta : hoyGuatemala();
    if (!unidadId || !desde) return res.status(400).json({ mensaje: 'Indique la unidad y la fecha de la carga de combustible' });
    try {
        const u = await query('SELECT id, codigo, descripcion FROM unidades WHERE id = $1', [unidadId]);
        if (!u.rows.length) return res.status(404).json({ mensaje: 'Unidad no encontrada' });
        const r = await query(`
      SELECT e.id, e.numero_control, e.tipo_servicio, e.subtipo, e.fecha, e.hora_salida, e.hora_entrada,
             e.minutos_trabajados, e.direccion, COALESCE(s.nombre, e.zona) AS sector
      FROM emergencias e LEFT JOIN sectores s ON s.id = e.sector_id
      WHERE e.unidad_id = $1 AND e.fecha BETWEEN $2 AND $3 AND ${contable('e')}
      ORDER BY e.fecha, e.hora_salida NULLS LAST`, [unidadId, desde, hasta]);
        const porTipo = {};
        for (const f of r.rows) porTipo[f.tipo_servicio] = (porTipo[f.tipo_servicio] || 0) + 1;
        res.json({
            unidad: u.rows[0], desde, hasta, salidas: r.rows.length,
            minutos: r.rows.reduce((a, f) => a + (f.minutos_trabajados || 0), 0),
            por_tipo: Object.entries(porTipo).map(([t, n]) => ({ tipo: TIPOS_SERVICIO[t], servicios: n })),
            servicios: r.rows
        });
    } catch (error) { fallo(res, 'Error en salidas por unidad:', error); }
};

// ── PERSONAS ATENDIDAS Y ACCIDENTES (convenio) ────
// Cuenta las personas escritas en la boleta (pacientes y rescatados, separados por «;»)
const personas = async (req, res) => {
    const p = leerPeriodo(req.query);
    try {
        const r = await query(`
      SELECT TO_CHAR(e.fecha, 'YYYY-MM') AS mes, e.tipo_servicio, e.subtipo,
             COUNT(*)::int AS servicios,
             COALESCE(SUM(array_length(regexp_split_to_array(NULLIF(TRIM(COALESCE(da.nombres_pacientes, dr.nombres_rescatados)), ''), '\\s*;\\s*'), 1)), 0)::int AS personas
      FROM emergencias e
      LEFT JOIN detalle_ambulancia da ON da.emergencia_id = e.id
      LEFT JOIN detalle_rescate dr ON dr.emergencia_id = e.id
      WHERE ${contable('e')} AND e.fecha BETWEEN $1 AND $2
      GROUP BY 1, 2, 3 ORDER BY 1`, [p.desde, p.hasta]);
        const meses = {};
        let total = { servicios: 0, personas: 0, accidentes: 0, personas_accidentes: 0 };
        for (const f of r.rows) {
            const m = meses[f.mes] ||= { mes: f.mes, servicios: 0, personas: 0, accidentes: 0, personas_accidentes: 0 };
            const esAccidente = ACCIDENTES.includes(f.subtipo) || (f.tipo_servicio === 'rescate' && f.subtipo === 'vehicular');
            for (const o of [m, total]) {
                o.servicios += f.servicios;
                o.personas += f.personas;
                if (esAccidente) { o.accidentes += f.servicios; o.personas_accidentes += f.personas; }
            }
        }
        const causas = {};
        for (const f of r.rows.filter(x => ACCIDENTES.includes(x.subtipo))) {
            const nombre = SUBTIPOS.ambulancia[f.subtipo];
            causas[nombre] = (causas[nombre] || 0) + f.servicios;
        }
        res.json({
            periodo: p, total, meses: Object.values(meses),
            accidentes_por_causa: Object.entries(causas).map(([causa, servicios]) => ({ causa, servicios })).sort((a, b) => b.servicios - a.servicios)
        });
    } catch (error) { fallo(res, 'Error en personas atendidas:', error); }
};

// ── TOTALES POR TIPO ──────────────────────────────
// Con el rango de correlativos del periodo, como los pide la capital
const totalesTipo = async (req, res) => {
    const p = leerPeriodo(req.query);
    try {
        const r = await query(`
      SELECT e.tipo_servicio, COUNT(*)::int AS servicios,
             MIN(e.numero_control) AS primero, MAX(e.numero_control) AS ultimo,
             COUNT(*) FILTER (WHERE e.estado = 'anulada')::int AS anuladas
      FROM emergencias e
      WHERE e.fecha BETWEEN $1 AND $2 AND e.numero_control IS NOT NULL
      GROUP BY 1 ORDER BY servicios DESC`, [p.desde, p.hasta]);
        const causas = await query(`
      SELECT e.tipo_servicio, e.subtipo, COUNT(*)::int AS servicios
      FROM emergencias e WHERE ${contable('e')} AND e.fecha BETWEEN $1 AND $2
      GROUP BY 1, 2 ORDER BY servicios DESC`, [p.desde, p.hasta]);
        res.json({
            periodo: p,
            tipos: r.rows.map(t => ({
                ...t, nombre: TIPOS_SERVICIO[t.tipo_servicio], atendidos: t.servicios - t.anuladas,
                causas: causas.rows.filter(c => c.tipo_servicio === t.tipo_servicio)
                    .map(c => ({ causa: SUBTIPOS[c.tipo_servicio][c.subtipo] || 'Sin causa', servicios: c.servicios }))
            }))
        });
    } catch (error) { fallo(res, 'Error en totales por tipo:', error); }
};

module.exports = { resumenAnual, proyeccion, salidasUnidad, personas, totalesTipo };
