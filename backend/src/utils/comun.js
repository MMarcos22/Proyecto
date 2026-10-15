// Utilidades compartidas por los controladores

const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/;

// Fecha local de Guatemala (UTC-6, sin horario de verano) en formato AAAA-MM-DD
const hoyGuatemala = () => {
    const ahora = new Date(Date.now() - 6 * 60 * 60 * 1000);
    return ahora.toISOString().slice(0, 10);
};

const sumarDias = (iso, dias) => {
    const d = new Date(iso + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + dias);
    return d.toISOString().slice(0, 10);
};

const diasEntre = (desde, hasta) =>
    Math.round((new Date(hasta + 'T00:00:00Z') - new Date(desde + 'T00:00:00Z')) / 86400000) + 1;

// Lee ?desde=&hasta= (o ?mes=&anio=) y devuelve un rango cerrado válido.
// Sin parámetros: mes en curso.
const leerPeriodo = (q) => {
    let { desde, hasta } = q;

    if (q.mes && q.anio) {
        const m = parseInt(q.mes), a = parseInt(q.anio);
        desde = `${a}-${String(m).padStart(2, '0')}-01`;
        hasta = new Date(Date.UTC(a, m, 0)).toISOString().slice(0, 10);
    } else if (q.anio && !desde) {
        desde = `${q.anio}-01-01`;
        hasta = `${q.anio}-12-31`;
    }

    const hoy = hoyGuatemala();
    if (!FECHA_ISO.test(desde || '')) desde = hoy.slice(0, 8) + '01';
    if (!FECHA_ISO.test(hasta || '')) hasta = hoy;
    if (desde > hasta) [desde, hasta] = [hasta, desde];

    const dias = diasEntre(desde, hasta);
    return {
        desde, hasta, dias,
        anterior: { desde: sumarDias(desde, -dias), hasta: sumarDias(desde, -1) }
    };
};

const registrarBitacora = (db, usuarioId, accion, entidad, entidadId, detalle = null) =>
    db.query(
        `INSERT INTO bitacora (usuario_id, accion, entidad, entidad_id, detalle)
     VALUES ($1, $2, $3, $4, $5)`,
        [usuarioId, accion, entidad, entidadId, detalle ? JSON.stringify(detalle) : null]
    );

const entero = (v) => {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : null;
};

// Condición SQL de "servicio atendido": excluye las boletas en curso (aún sin
// regreso) y las anuladas. Todos los informes cuentan con la misma regla.
const contable = (alias = 'e') => `${alias}.estado IN ('pendiente', 'completa', 'firmada')`;

module.exports = { hoyGuatemala, sumarDias, diasEntre, leerPeriodo, registrarBitacora, entero, contable, FECHA_ISO };
