// Análisis de servicios (Objetivo específico 1): dónde, cuándo y de qué tipo
// ocurren los servicios. Solo usa boletas; el consumo de insumos se analiza en
// el módulo institucional. Todos los hallazgos salen de reglas escritas aquí.
const { query } = require('../config/database');
const { TIPOS_SERVICIO, SUBTIPOS } = require('../config/dominio');
const { leerPeriodo } = require('../utils/comun');

const DIAS = ['', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
const FRANJAS = [
    { clave: 'madrugada', nombre: 'madrugada (00:00–05:59)', desde: 0, hasta: 5 },
    { clave: 'manana', nombre: 'mañana (06:00–11:59)', desde: 6, hasta: 11 },
    { clave: 'tarde', nombre: 'tarde (12:00–17:59)', desde: 12, hasta: 17 },
    { clave: 'noche', nombre: 'noche (18:00–23:59)', desde: 18, hasta: 23 }
];

// Con menos servicios que esto en el periodo anterior, un porcentaje exagera
// el cambio (de 3 a 6 sería "+100 %"); se informa la diferencia absoluta.
const BASE_MINIMA_VARIACION = 5;
// Las zonas de mayor incidencia son las que juntas reúnen este porcentaje
const CORTE_PARETO = 80;

const variacionHonesta = (actual, anterior) =>
    anterior >= BASE_MINIMA_VARIACION ? Math.round(((actual - anterior) / anterior) * 1000) / 10 : null;

const calcular = async (p, tipo) => {
    const val = [p.desde, p.hasta, p.anterior.desde, p.anterior.hasta];
    let filtroTipo = '';
    if (tipo) { val.push(tipo); filtroTipo = 'AND e.tipo_servicio = $5'; }
    const base = `FROM emergencias e LEFT JOIN sectores s ON s.id = e.sector_id
                WHERE e.estado IN ('pendiente', 'completa', 'firmada') ${filtroTipo}`;

    const sectores = await query(`
    SELECT e.sector_id, s.nombre AS sector,
      COUNT(*) FILTER (WHERE e.fecha BETWEEN $1 AND $2)::int AS servicios,
      COUNT(*) FILTER (WHERE e.fecha BETWEEN $3 AND $4)::int AS anterior,
      MODE() WITHIN GROUP (ORDER BY e.tipo_servicio) FILTER (WHERE e.fecha BETWEEN $1 AND $2) AS tipo_predominante,
      MODE() WITHIN GROUP (ORDER BY e.subtipo) FILTER (WHERE e.fecha BETWEEN $1 AND $2 AND e.subtipo IS NOT NULL) AS subtipo_predominante,
      MODE() WITHIN GROUP (ORDER BY EXTRACT(HOUR FROM e.hora_salida)) FILTER (WHERE e.fecha BETWEEN $1 AND $2) AS hora_pico
    ${base} AND e.fecha BETWEEN $3 AND $2
    GROUP BY e.sector_id, s.nombre
    HAVING COUNT(*) FILTER (WHERE e.fecha BETWEEN $1 AND $2) > 0
        OR COUNT(*) FILTER (WHERE e.fecha BETWEEN $3 AND $4) > 0
    ORDER BY servicios DESC, s.nombre`, val);

    const tipos = await query(`
    SELECT e.tipo_servicio,
      COUNT(*) FILTER (WHERE e.fecha BETWEEN $1 AND $2)::int AS servicios,
      COUNT(*) FILTER (WHERE e.fecha BETWEEN $3 AND $4)::int AS anterior
    ${base} AND e.fecha BETWEEN $3 AND $2 GROUP BY 1 ORDER BY 2 DESC`, val);

    const valP = tipo ? [p.desde, p.hasta, tipo] : [p.desde, p.hasta];
    const filtroP = tipo ? 'AND e.tipo_servicio = $3' : '';
    const baseP = `FROM emergencias e WHERE e.estado IN ('pendiente', 'completa', 'firmada') AND e.fecha BETWEEN $1 AND $2 ${filtroP}`;

    const horas = await query(`SELECT EXTRACT(HOUR FROM e.hora_salida)::int AS hora, COUNT(*)::int AS n ${baseP} AND e.hora_salida IS NOT NULL GROUP BY 1`, valP);
    const dias = await query(`SELECT EXTRACT(ISODOW FROM e.fecha)::int AS dia, COUNT(*)::int AS n ${baseP} GROUP BY 1 ORDER BY 2 DESC`, valP);
    const calor = await query(`
    SELECT EXTRACT(ISODOW FROM e.fecha)::int AS dia, EXTRACT(HOUR FROM e.hora_salida)::int AS hora, COUNT(*)::int AS total
    ${baseP} AND e.hora_salida IS NOT NULL GROUP BY 1, 2`, valP);
    const subtipos = await query(`
    SELECT e.tipo_servicio, e.subtipo, COUNT(*)::int AS total
    ${baseP} AND e.subtipo IS NOT NULL GROUP BY 1, 2 ORDER BY total DESC`, valP);
    // Lugares críticos: los puntos concretos que la compañía ya reconoce (entrevista 1:00:32)
    const lugares = await query(`
    SELECT lc.id, lc.nombre, s.nombre AS sector, COUNT(*)::int AS servicios,
           MODE() WITHIN GROUP (ORDER BY e.subtipo) AS subtipo, MODE() WITHIN GROUP (ORDER BY e.tipo_servicio) AS tipo
    FROM emergencias e JOIN lugares_criticos lc ON lc.id = e.lugar_critico_id JOIN sectores s ON s.id = lc.sector_id
    WHERE e.estado IN ('pendiente', 'completa', 'firmada') AND e.fecha BETWEEN $1 AND $2 ${filtroP}
    GROUP BY lc.id, lc.nombre, s.nombre ORDER BY servicios DESC`, valP);
    const calidad = await query(`
    SELECT COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE e.sector_id IS NULL)::int AS sin_sector,
           COUNT(*) FILTER (WHERE e.subtipo IS NULL)::int AS sin_clasificar,
           COUNT(*) FILTER (WHERE e.hora_salida IS NULL)::int AS sin_hora
    ${baseP}`, valP);

    const total = calidad.rows[0].total;
    const totalAnterior = tipos.rows.reduce((a, t) => a + t.anterior, 0);
    const porcentaje = (n, de = total) => de ? Math.round((n / de) * 1000) / 10 : 0;

    // Pareto sobre los servicios con sector: se acumula hasta alcanzar el corte
    const conSector = sectores.rows.filter(s => s.sector_id && s.servicios > 0);
    const totalConSector = conSector.reduce((a, s) => a + s.servicios, 0);
    let acumulado = 0;
    const enPareto = new Set();
    for (const s of conSector) {
        if (porcentaje(acumulado, totalConSector) >= CORTE_PARETO) break;
        acumulado += s.servicios;
        enPareto.add(s.sector_id);
    }

    const franjas = FRANJAS.map(f => ({
        franja: f.nombre,
        servicios: horas.rows.filter(h => h.hora >= f.desde && h.hora <= f.hasta).reduce((a, h) => a + h.n, 0)
    }));

    return {
        periodo: { desde: p.desde, hasta: p.hasta, dias: p.dias, comparado_con: p.anterior },
        criterios: { base_minima_variacion: BASE_MINIMA_VARIACION, corte_pareto: CORTE_PARETO },
        servicios: total,
        servicios_periodo_anterior: totalAnterior,
        diferencia: total - totalAnterior,
        variacion_porcentual: variacionHonesta(total, totalAnterior),
        por_tipo: tipos.rows.map(t => ({
            tipo: TIPOS_SERVICIO[t.tipo_servicio], servicios: t.servicios, anterior: t.anterior,
            porcentaje: porcentaje(t.servicios)
        })),
        por_sector: sectores.rows.map(s => ({
            sector_id: s.sector_id, sector: s.sector || 'Sin sector asignado',
            servicios: s.servicios, porcentaje: porcentaje(s.servicios),
            periodo_anterior: s.anterior, diferencia: s.servicios - s.anterior,
            variacion_porcentual: variacionHonesta(s.servicios, s.anterior),
            mayor_incidencia: enPareto.has(s.sector_id),
            tipo_predominante: s.tipo_predominante ? TIPOS_SERVICIO[s.tipo_predominante] : null,
            incidente_predominante: s.subtipo_predominante && s.tipo_predominante
                ? SUBTIPOS[s.tipo_predominante]?.[s.subtipo_predominante] || null : null,
            hora_pico: s.hora_pico != null ? `${String(s.hora_pico).padStart(2, '0')}:00` : null
        })),
        zonas_mayor_incidencia: {
            sectores: enPareto.size,
            de: conSector.length,
            servicios: acumulado,
            porcentaje: porcentaje(acumulado, totalConSector)
        },
        franjas_horarias: franjas,
        dias_semana: dias.rows.map(d => ({ dia: DIAS[d.dia], servicios: d.n })),
        dia_hora: calor.rows,
        por_lugar: lugares.rows.map(l => ({
            id: l.id, nombre: l.nombre, sector: l.sector, servicios: l.servicios,
            causa: l.tipo && l.subtipo ? SUBTIPOS[l.tipo]?.[l.subtipo] || null : null
        })),
        por_subtipo: subtipos.rows.map(r => ({
            tipo_servicio: r.tipo_servicio, subtipo: r.subtipo,
            nombre: SUBTIPOS[r.tipo_servicio]?.[r.subtipo] || r.subtipo, servicios: r.total
        })),
        calidad_datos: calidad.rows[0]
    };
};

// Cada hallazgo es una frase con la cifra que la respalda
const hallazgos = (ind) => {
    const h = [];
    const conSector = ind.por_sector.filter(s => s.sector_id && s.servicios > 0);
    const z = ind.zonas_mayor_incidencia;

    if (z.sectores) {
        h.push({
            titulo: `${z.sectores} de ${z.de} sectores reúnen el ${z.porcentaje} % de los servicios`,
            detalle: `Son las zonas de mayor incidencia del periodo: ${conSector.filter(s => s.mayor_incidencia).map(s => s.sector).join(', ')}.`
        });
    }
    if (conSector[0]) {
        const s = conSector[0];
        h.push({
            titulo: `${s.sector} concentra la mayor demanda`,
            detalle: `${s.servicios} servicios (${s.porcentaje} % del periodo)${s.tipo_predominante ? `; predominan los de ${s.tipo_predominante.toLowerCase()}` : ''}${s.hora_pico ? `; hora más frecuente ${s.hora_pico}` : ''}.`
        });
    }
    const alza = conSector.filter(s => s.variacion_porcentual !== null)
        .sort((a, b) => b.variacion_porcentual - a.variacion_porcentual)[0];
    if (alza && alza.variacion_porcentual >= 25) {
        h.push({
            titulo: `Aumento de servicios en ${alza.sector}`,
            detalle: `Pasó de ${alza.periodo_anterior} a ${alza.servicios} servicios (+${alza.variacion_porcentual} %) respecto al periodo anterior.`
        });
    }
    const franja = [...ind.franjas_horarias].sort((a, b) => b.servicios - a.servicios)[0];
    if (franja?.servicios) {
        h.push({
            titulo: `Mayor actividad en la ${franja.franja.split(' ')[0]}`,
            detalle: `${franja.servicios} de ${ind.servicios} servicios salieron en la franja ${franja.franja}.`
        });
    }
    const c = ind.calidad_datos;
    if (c.total && (c.sin_sector || c.sin_clasificar)) {
        h.push({
            titulo: 'Boletas que no entran al análisis',
            detalle: `${c.sin_sector} sin sector y ${c.sin_clasificar} sin clasificar de ${c.total}. Complételas para que cuenten en el análisis por zona o por incidente.`
        });
    }
    return h;
};

const analisis = async (req, res) => {
    const p = leerPeriodo(req.query);
    const tipo = SUBTIPOS[req.query.tipo_servicio] ? req.query.tipo_servicio : null;
    try {
        const ind = await calcular(p, tipo);
        res.json({ ...ind, hallazgos: ind.servicios ? hallazgos(ind) : [] });
    } catch (error) {
        console.error('Error en el análisis de servicios:', error);
        res.status(500).json({ mensaje: 'Error al calcular el análisis de servicios' });
    }
};

module.exports = { analisis };
