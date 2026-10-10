const { query } = require('../config/database');
const { generarAnalisis, construirContexto } = require('../services/IAservice');

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const analizarZonas = async (req, res) => {
    const { mes, anio, tipo_servicio } = req.query;

    const condiciones = [];
    const valores = [];

    if (mes) { valores.push(mes); condiciones.push(`EXTRACT(MONTH FROM fecha) = $${valores.length}`); }
    if (anio) { valores.push(anio); condiciones.push(`EXTRACT(YEAR  FROM fecha) = $${valores.length}`); }
    if (tipo_servicio) {
        valores.push(tipo_servicio);
        condiciones.push(`tipo_servicio = $${valores.length}`);
    }

    const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

    try {
        const registros = await query(`
      SELECT tipo_servicio, zona, direccion, fecha
      FROM emergencias ${where}
      ORDER BY fecha DESC`, valores);

        if (registros.rows.length === 0) {
            return res.status(404).json({
                mensaje: 'No existen registros para el periodo seleccionado',
                analisis: null
            });
        }

        const periodo = mes && anio
            ? `${MESES[mes - 1]} de ${anio}`
            : anio ? `año ${anio}` : 'histórico completo';

        const resumen = await query(`
      SELECT COALESCE(zona,'Sin especificar') AS zona,
             tipo_servicio,
             COUNT(*)::int AS total
      FROM emergencias ${where}
      GROUP BY zona, tipo_servicio
      ORDER BY total DESC`, valores);

        const resultado = await generarAnalisis(registros.rows, periodo);

        res.json({
            periodo,
            total_registros: registros.rows.length,
            distribucion: resumen.rows,
            ...resultado
        });

    } catch (error) {
        console.error('Error al analizar zonas:', error);
        res.status(500).json({ mensaje: 'Error al generar el análisis' });
    }
};

const zonasSinIA = async (req, res) => {
    const { mes, anio } = req.query;

    const condiciones = [];
    const valores = [];

    if (mes) { valores.push(mes); condiciones.push(`EXTRACT(MONTH FROM fecha) = $${valores.length}`); }
    if (anio) { valores.push(anio); condiciones.push(`EXTRACT(YEAR  FROM fecha) = $${valores.length}`); }

    const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

    try {
        const resultado = await query(`
      SELECT COALESCE(zona,'Sin especificar') AS zona,
             COUNT(*)::int AS total_servicios,
             MODE() WITHIN GROUP (ORDER BY tipo_servicio) AS tipo_predominante
      FROM emergencias ${where}
      GROUP BY zona
      ORDER BY total_servicios DESC`, valores);

        res.json({ zonas: resultado.rows });

    } catch (error) {
        console.error('Error al consultar zonas:', error);
        res.status(500).json({ mensaje: 'Error al consultar las zonas' });
    }
};

module.exports = { analizarZonas, zonasSinIA };