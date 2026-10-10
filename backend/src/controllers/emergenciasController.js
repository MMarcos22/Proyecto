const { query, getClient } = require('../config/database');

const TABLAS_DETALLE = {
    ambulancia: 'detalle_ambulancia',
    incendio: 'detalle_incendio',
    rescate: 'detalle_rescate',
    varios: 'detalle_varios',
    agua: 'detalle_agua'
};

const CAMPOS_DETALLE = {
    ambulancia: ['nombres_pacientes', 'hubo_fallecidos', 'fallecidos', 'edades', 'domicilios',
        'acompanantes', 'serv_maternidad', 'acc_transito', 'acc_trabajo', 'otros',
        'hosp_modular', 'hosp_privado', 'hosp_igss', 'otro_traslado'],
    incendio: ['prop_propietario', 'sitio_inicio', 'causas', 'valor_inmueble', 'perdidas_inmueble',
        'aseguradora_inmueble', 'veh_propietario', 'conductor', 'descripcion_tipo', 'marca',
        'modelo', 'placas', 'valor_vehiculo', 'perdidas_vehiculo', 'aseguradora_vehiculo'],
    rescate: ['nombres_rescatados', 'edades', 'domicilios', 'traslado_a', 'forma_aviso'],
    varios: ['clase_servicio'],
    agua: ['residencia', 'nombre_establecimiento', 'centro_asistencial', 'colonia', 'nota',
        'servicio_autorizado_por', 'galones_distribuidos', 'forma_distribucion',
        'donativo', 'donativo_letras']
};

const CAMPOS_BASE = ['numero_control', 'tipo_servicio', 'fecha', 'minutos_trabajados',
    'solicitud_por_telefono', 'personal', 'salida_de', 'hora_salida', 'entrada_a', 'hora_entrada',
    'direccion', 'zona', 'solicitante', 'radiotelefonista', 'piloto', 'unidad', 'personal_destacado',
    'observaciones', 'reporte_formulado_por', 'conforme_piloto', 'vobo_jefe_servicio',
    'responsable', 'jefes_servicio', 'copia_certificada_a', 'fecha_certificacion'];

// ── REGISTRAR ────────────────────────────────────
const registrar = async (req, res) => {
    const { tipo_servicio } = req.body;

    if (!TABLAS_DETALLE[tipo_servicio]) {
        return res.status(400).json({ mensaje: 'Tipo de servicio no válido' });
    }
    if (!req.body.numero_control || !req.body.fecha || !req.body.direccion) {
        return res.status(400).json({
            mensaje: 'El número de control, la fecha y la dirección son obligatorios'
        });
    }

    const cliente = await getClient();

    try {
        await cliente.query('BEGIN');

        const valoresBase = CAMPOS_BASE.map(c => req.body[c] ?? null);
        valoresBase.push(req.usuario.id);

        const marcadores = CAMPOS_BASE.map((_, i) => `$${i + 1}`).join(', ');
        const sqlBase = `
      INSERT INTO emergencias (${CAMPOS_BASE.join(', ')}, usuario_id)
      VALUES (${marcadores}, $${CAMPOS_BASE.length + 1})
      RETURNING id, numero_control, tipo_servicio, fecha`;

        const insercion = await cliente.query(sqlBase, valoresBase);
        const emergencia = insercion.rows[0];

        const campos = CAMPOS_DETALLE[tipo_servicio];
        const valoresDetalle = [emergencia.id, ...campos.map(c => req.body[c] ?? null)];
        const marcadoresDet = campos.map((_, i) => `$${i + 2}`).join(', ');

        await cliente.query(
            `INSERT INTO ${TABLAS_DETALLE[tipo_servicio]} (emergencia_id, ${campos.join(', ')})
       VALUES ($1, ${marcadoresDet})`,
            valoresDetalle
        );

        await cliente.query('COMMIT');
        res.status(201).json({ mensaje: 'Servicio registrado correctamente', emergencia });

    } catch (error) {
        await cliente.query('ROLLBACK');
        if (error.code === '23505') {
            return res.status(409).json({ mensaje: 'El número de control ya existe' });
        }
        console.error('Error al registrar servicio:', error);
        res.status(500).json({ mensaje: 'Error al registrar el servicio' });
    } finally {
        cliente.release();
    }
};

// ── LISTAR CON FILTROS ───────────────────────────
const listar = async (req, res) => {
    const { tipo_servicio, fecha_inicio, fecha_fin, unidad, zona } = req.query;

    const condiciones = [];
    const valores = [];

    if (tipo_servicio) { valores.push(tipo_servicio); condiciones.push(`e.tipo_servicio = $${valores.length}`); }
    if (fecha_inicio) { valores.push(fecha_inicio); condiciones.push(`e.fecha >= $${valores.length}`); }
    if (fecha_fin) { valores.push(fecha_fin); condiciones.push(`e.fecha <= $${valores.length}`); }
    if (unidad) { valores.push(`%${unidad}%`); condiciones.push(`e.unidad ILIKE $${valores.length}`); }
    if (zona) { valores.push(`%${zona}%`); condiciones.push(`e.zona ILIKE $${valores.length}`); }

    const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

    try {
        const resultado = await query(`
      SELECT e.id, e.numero_control, e.tipo_servicio, e.fecha, e.hora_salida,
             e.direccion, e.zona, e.unidad, e.piloto, e.solicitante, e.minutos_trabajados,
             u.nombre_completo AS registrado_por
      FROM emergencias e
      JOIN usuarios u ON u.id = e.usuario_id
      ${where}
      ORDER BY e.fecha DESC, e.id DESC`, valores);

        res.json({ total: resultado.rows.length, servicios: resultado.rows });

    } catch (error) {
        console.error('Error al listar servicios:', error);
        res.status(500).json({ mensaje: 'Error al consultar el historial' });
    }
};

// ── OBTENER UNO COMPLETO ─────────────────────────
const obtenerPorId = async (req, res) => {
    const { id } = req.params;

    try {
        const base = await query(`
      SELECT e.*, u.nombre_completo AS registrado_por
      FROM emergencias e
      JOIN usuarios u ON u.id = e.usuario_id
      WHERE e.id = $1`, [id]);

        if (base.rows.length === 0) {
            return res.status(404).json({ mensaje: 'Servicio no encontrado' });
        }

        const servicio = base.rows[0];
        const tabla = TABLAS_DETALLE[servicio.tipo_servicio];

        const detalle = await query(
            `SELECT * FROM ${tabla} WHERE emergencia_id = $1`, [id]
        );

        servicio.detalle = detalle.rows[0] || {};
        res.json(servicio);

    } catch (error) {
        console.error('Error al obtener servicio:', error);
        res.status(500).json({ mensaje: 'Error al consultar el servicio' });
    }
};

// ── LISTA SIMPLE PARA VINCULAR SALIDAS ───────────
const listarParaVinculo = async (req, res) => {
    try {
        const resultado = await query(`
      SELECT id, numero_control, tipo_servicio, fecha
      FROM emergencias
      ORDER BY fecha DESC, id DESC
      LIMIT 100`);

        res.json(resultado.rows);
    } catch (error) {
        console.error('Error al listar servicios:', error);
        res.status(500).json({ mensaje: 'Error al consultar los servicios' });
    }
};

module.exports = { registrar, listar, obtenerPorId, listarParaVinculo };