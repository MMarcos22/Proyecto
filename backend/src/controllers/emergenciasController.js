// Boletas de servicio (Objetivo específico 1).
// Ciclo de vida: en_curso → pendiente → completa → firmada (o anulada).
//   · La boleta nace en cabina al recibir la llamada, todavía sin número.
//   · Al registrar el regreso de la unidad recibe el número de control, en el
//     orden en que regresan las unidades y correlativo por tipo (regla de la
//     capital; entrevista 57:00). Así nadie reserva números ni escribe encima.
//   · Solo la tripulación completa su boleta, identificándose con su PIN.
//   · Para completarla no puede quedar ningún campo en blanco: cada uno lleva
//     un valor o "No aplica" (entrevista 54:22).
//   · La administración la marca como firmada en la revisión diaria; desde
//     entonces no se edita, solo se anula con motivo. La administración ve
//     las boletas por completar, pero no las completa.
//   · Si salen varias unidades, cada una lleva su propia boleta (con su
//     número, su piloto y su tripulación) y todas comparten el incidente.
//   · Piloto y tripulación solo pueden ser personal del turno de guardia.
const bcrypt = require('bcrypt');
const { query, getClient } = require('../config/database');
const { SUBTIPOS, CAMPOS_BOLETA, PREFIJOS_CONTROL, TIPOS_SERVICIO } = require('../config/dominio');
const { registrarBitacora, entero, contable, FECHA_ISO, hoyGuatemala } = require('../utils/comun');
const { ErrorNegocio, anularMovimiento } = require('../services/inventarioService');

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

// Campos de la boleta que se guardan en la tabla principal (el número no: lo asigna el regreso)
const CAMPOS_BASE = ['tipo_servicio', 'fecha', 'minutos_trabajados',
    'solicitud_por_telefono', 'personal', 'salida_de', 'hora_aviso', 'hora_salida', 'entrada_a', 'hora_entrada',
    'direccion', 'zona', 'solicitante', 'radiotelefonista', 'piloto', 'unidad', 'personal_destacado',
    'observaciones', 'reporte_formulado_por', 'conforme_piloto', 'vobo_jefe_servicio',
    'responsable', 'jefes_servicio', 'copia_certificada_a', 'fecha_certificacion',
    'sector_id', 'lugar_critico_id', 'unidad_id', 'piloto_id', 'subtipo'];

const EDITABLES = new Set(['en_curso', 'pendiente', 'completa']);
const HORA = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

const limpiar = (v) => (v === '' || v === undefined ? null : v);

// Teléfono de Guatemala: exactamente 8 dígitos, que se guardan sin espacios.
const NO_APLICA = 'No aplica';
const telefonoValido = (t) => t == null || String(t).trim() === '' || t === NO_APLICA || /^\d{8}$/.test(String(t).replace(/\s/g, ''));
const formatoTelefono = (t) => {
    const n = String(t ?? '').replace(/\D/g, '');
    return n.length === 8 ? n : t;
};
const ERROR_TELEFONO = 'El teléfono debe tener 8 dígitos';
const vacio = (v) => v === null || v === undefined || String(v).trim() === '';

// Minutos entre salida y entrada; si la entrada es menor se asume que cruzó la medianoche
const minutosEntre = (salida, entrada) => {
    if (!salida || !entrada) return null;
    const [hs, ms] = salida.split(':').map(Number);
    const [he, me] = entrada.split(':').map(Number);
    let m = (he * 60 + me) - (hs * 60 + ms);
    if (m < 0) m += 1440;
    return m;
};

const horaGuatemala = () => new Date(Date.now() - 6 * 3600 * 1000).toISOString().slice(11, 16);

// Lo mínimo para abrir una boleta en cabina: tipo, dirección y hora de salida
const validarInicio = (b) => {
    if (!TABLAS_DETALLE[b.tipo_servicio]) return 'Tipo de servicio no válido';
    if (!b.fecha || !FECHA_ISO.test(b.fecha)) return 'La fecha del servicio es obligatoria';
    if (b.fecha > hoyGuatemala()) return 'La fecha del servicio no puede ser futura';
    if (!b.direccion?.toString().trim()) return 'La dirección es obligatoria';
    for (const h of ['hora_aviso', 'hora_salida', 'hora_entrada']) {
        if (b[h] && !HORA.test(b[h])) return 'Hora con formato inválido (use HH:MM entre 00:00 y 23:59)';
    }
    if (b.subtipo && !SUBTIPOS[b.tipo_servicio][b.subtipo]) return 'Causa no válida para este tipo de servicio';
    return null;
};

// ¿Quién está de guardia en el turno? Su lista de personal o su escuadra
const personalDelTurno = async (db, turnoId) => {
    if (!turnoId) return null;
    const r = await db.query(`
    SELECT p.id FROM personal p, turnos t
    WHERE t.id = $1 AND (p.nombre_completo = ANY(t.personal) OR (t.escuadra_id IS NOT NULL AND p.escuadra_id = t.escuadra_id))`, [turnoId]);
    return new Set(r.rows.map(x => x.id));
};

// Piloto y tripulación deben ser del turno; quienes ya estaban en la boleta se respetan
const verificarTurno = async (db, turnoId, ids, previos = []) => {
    const nuevos = [...new Set(ids.map(entero).filter(Boolean))].filter(x => !previos.includes(x));
    if (!nuevos.length) return;
    const guardia = await personalDelTurno(db, turnoId);
    if (!guardia) throw new ErrorNegocio('No hay turno abierto: abra el turno de guardia para asignar piloto y tripulación');
    const fuera = nuevos.filter(x => !guardia.has(x));
    if (fuera.length) {
        const r = await db.query('SELECT nombre_completo FROM personal WHERE id = ANY($1::int[])', [fuera]);
        throw new ErrorNegocio(`No están en el turno de guardia: ${r.rows.map(x => x.nombre_completo).join(', ')}`);
    }
};

// Lo que impide completar la boleta: sector, causa y cada campo de la boleta oficial
// sin valor ni "No aplica". Se evalúa sobre la fila guardada (base + detalle).
const faltantes = (fila) => {
    const noAplica = new Set(Array.isArray(fila.no_aplica) ? fila.no_aplica : []);
    const lista = [];
    if (!fila.sector_id) lista.push({ clave: 'sector_id', etiqueta: 'Sector del municipio', admiteNoAplica: false });
    if (!fila.subtipo) lista.push({ clave: 'subtipo', etiqueta: 'Causa del servicio', admiteNoAplica: false });
    if (!fila.numero_control) lista.push({ clave: 'regreso', etiqueta: 'Registrar el regreso de la unidad', admiteNoAplica: false });
    for (const campo of CAMPOS_BOLETA[fila.tipo_servicio] || []) {
        if (noAplica.has(campo.clave)) continue;
        if (campo.campos.some(c => !vacio(fila[c]))) continue;
        lista.push({ clave: campo.clave, etiqueta: campo.etiqueta, admiteNoAplica: true });
    }
    return lista;
};

// Completa textos de la boleta con los catálogos y calcula los minutos
const prepararBase = async (db, b) => {
    const datos = { ...b };
    datos.minutos_trabajados = minutosEntre(datos.hora_salida, datos.hora_entrada);
    if (datos.sector_id) {
        const sector = await db.query('SELECT nombre FROM sectores WHERE id = $1', [datos.sector_id]);
        if (!sector.rows.length) throw new ErrorNegocio('El sector seleccionado no existe');
        datos.zona = sector.rows[0].nombre;
    }
    if (datos.unidad_id) {
        const u = await db.query('SELECT codigo FROM unidades WHERE id = $1', [datos.unidad_id]);
        if (u.rows.length) datos.unidad = u.rows[0].codigo;
    }
    if (datos.piloto_id) {
        const p = await db.query('SELECT nombre_completo FROM personal WHERE id = $1', [datos.piloto_id]);
        if (p.rows.length) datos.piloto = p.rows[0].nombre_completo;
    }
    datos.no_aplica = Array.isArray(b.no_aplica) ? [...new Set(b.no_aplica.map(String))] : [];
    datos.solicitud_por_telefono = formatoTelefono(datos.solicitud_por_telefono);
    return datos;
};

// Guarda la tripulación y escribe sus nombres en el campo "personal" de la boleta oficial
const guardarTripulacion = async (db, id, ids) => {
    if (!Array.isArray(ids)) return null;
    const lista = [...new Set(ids.map(entero).filter(Boolean))];
    await db.query('DELETE FROM boleta_tripulacion WHERE emergencia_id = $1', [id]);
    if (!lista.length) return '';
    await db.query(`
    INSERT INTO boleta_tripulacion (emergencia_id, personal_id)
    SELECT $1, unnest($2::int[]) ON CONFLICT DO NOTHING`, [id, lista]);
    const r = await db.query(
        'SELECT nombre_completo FROM personal WHERE id = ANY($1::int[]) ORDER BY nombre_completo', [lista]);
    return r.rows.map(x => x.nombre_completo).join('; ');
};

const escribirDetalle = async (db, id, b) => {
    const campos = CAMPOS_DETALLE[b.tipo_servicio];
    await db.query(`DELETE FROM ${TABLAS_DETALLE[b.tipo_servicio]} WHERE emergencia_id = $1`, [id]);
    await db.query(
        `INSERT INTO ${TABLAS_DETALLE[b.tipo_servicio]} (emergencia_id, ${campos.join(', ')})
     VALUES ($1, ${campos.map((_, i) => `$${i + 2}`).join(', ')})`,
        [id, ...campos.map(c => limpiar(b[c]))]);
};

const leerFila = async (db, id) => {
    const e = await db.query('SELECT * FROM emergencias WHERE id = $1', [id]);
    if (!e.rows.length) return null;
    const fila = e.rows[0];
    const det = await db.query(`SELECT * FROM ${TABLAS_DETALLE[fila.tipo_servicio]} WHERE emergencia_id = $1`, [id]);
    return { ...(det.rows[0] || {}), ...fila };
};

// Asigna el siguiente número de control del tipo, en el orden en que se registra
// el regreso. El candado evita que dos regresos simultáneos tomen el mismo número.
// Un número liberado por un cambio de tipo no se vuelve a usar (pudo imprimirse).
// conservarRegreso: al cambiar de tipo, la boleta mantiene su hora de regreso y su estado.
const asignarNumero = async (db, id, { conservarRegreso = false } = {}) => {
    const e = await db.query('SELECT tipo_servicio, fecha, secuencia FROM emergencias WHERE id = $1 FOR UPDATE', [id]);
    const { tipo_servicio: tipo, fecha, secuencia } = e.rows[0];
    if (secuencia) return null;
    const anio = Number(String(fecha instanceof Date ? fecha.toISOString() : fecha).slice(0, 4));
    await db.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`control-${tipo}-${anio}`]);
    const r = await db.query(`
    SELECT GREATEST(
      (SELECT COALESCE(MAX(secuencia), 0) FROM emergencias WHERE tipo_servicio = $1 AND anio_secuencia = $2),
      (SELECT COALESCE(MAX(secuencia), 0) FROM numeros_liberados WHERE tipo_servicio = $1 AND anio = $2)) + 1 AS n`, [tipo, anio]);
    const n = r.rows[0].n;
    const numero = `${PREFIJOS_CONTROL[tipo]}-${anio}-${String(n).padStart(4, '0')}`;
    await db.query(conservarRegreso
        ? 'UPDATE emergencias SET secuencia = $1, anio_secuencia = $2, numero_control = $3 WHERE id = $4'
        : `UPDATE emergencias SET secuencia = $1, anio_secuencia = $2, numero_control = $3,
           regreso_en = CURRENT_TIMESTAMP, estado = 'pendiente' WHERE id = $4`, [n, anio, numero, id]);
    return numero;
};

// ¿Quién puede editar? En curso: cabina. Pendiente o completa: un miembro de la
// tripulación con su PIN. La administración no completa boletas (las rutas ya
// la excluyen). Una boleta sin tripulación registrada la completa cabina.
const verificarAutoria = async (db, req, id, estado) => {
    if (req.usuario.rol === 'administrador') throw new ErrorNegocio('La administración no completa boletas; lo hace la tripulación', 403);
    if (estado === 'en_curso') return { via: 'cabina' };
    const sinTripulacion = await db.query('SELECT NOT EXISTS (SELECT 1 FROM boleta_tripulacion WHERE emergencia_id = $1) AS vacia', [id]);
    if (sinTripulacion.rows[0].vacia) return { via: 'cabina', nombre: 'Cabina (sin tripulación registrada)' };
    const { personal_id, pin } = req.body?.autor || {};
    if (!personal_id || !pin) {
        throw new ErrorNegocio('Identifíquese con su PIN: solo la tripulación de este servicio puede completar la boleta', 403);
    }
    const r = await db.query(`
    SELECT p.nombre_completo, p.pin_hash,
           EXISTS (SELECT 1 FROM boleta_tripulacion t WHERE t.emergencia_id = $1 AND t.personal_id = p.id) AS en_tripulacion
    FROM personal p WHERE p.id = $2 AND p.activo`, [id, entero(personal_id)]);
    const p = r.rows[0];
    if (!p?.pin_hash || !(await bcrypt.compare(String(pin), p.pin_hash))) throw new ErrorNegocio('El PIN no es correcto', 403);
    if (!p.en_tripulacion) throw new ErrorNegocio(`${p.nombre_completo} no está en la tripulación de este servicio`, 403);
    return { via: 'tripulacion', nombre: p.nombre_completo, personal_id: entero(personal_id) };
};

const responderError = (res, error, contexto) => {
    if (error instanceof ErrorNegocio) return res.status(error.estado).json({ mensaje: error.message });
    if (error.code === '23505') return res.status(409).json({ mensaje: 'El número de control ya existe; intente de nuevo' });
    if (['22007', '22008', '22P02', '22003'].includes(error.code)) return res.status(400).json({ mensaje: 'Hay un dato con formato inválido en la boleta' });
    console.error(contexto, error);
    res.status(500).json({ mensaje: 'Ocurrió un error al procesar la boleta' });
};

// Uso de insumos en el servicio. No descuenta de bodega: el material ya salió
// por vale hacia la escuadra (entrevista 00:42); este registro alimenta el
// consumo por tipo, causa y sector.
const registrarUso = async (db, id, item, usuarioId) => {
    const cantidad = Number(item.cantidad);
    if (!Number.isInteger(cantidad) || cantidad <= 0) throw new ErrorNegocio('La cantidad debe ser un número entero mayor que cero');
    const i = await db.query('SELECT nombre, clase FROM insumos WHERE id = $1 AND activo', [entero(item.insumo_id)]);
    if (!i.rows.length) throw new ErrorNegocio('El insumo no existe', 404);
    if (i.rows[0].clase === 'equipo') throw new ErrorNegocio(`${i.rows[0].nombre} es equipo: no se consume en un servicio`);
    await db.query('INSERT INTO consumos_servicio (emergencia_id, insumo_id, cantidad, usuario_id) VALUES ($1, $2, $3, $4)',
        [id, entero(item.insumo_id), cantidad, usuarioId]);
    return i.rows[0].nombre;
};

const registrarInsumos = async (db, id, fecha, insumos, usuarioId) => {
    for (const item of (Array.isArray(insumos) ? insumos : []).filter(i => i.insumo_id && i.cantidad)) {
        await registrarUso(db, id, item, usuarioId);
    }
    return [];
};

// ── REGISTRAR LLAMADA ────────────────────────────
// Abre la boleta en curso. Si salen varias unidades, abre una boleta por
// unidad, cada una con su piloto y su tripulación, ligadas al mismo incidente.
// Si la unidad ya regresó (registro posterior), se registra el regreso en el
// mismo acto y cada boleta recibe su número.
const unidadesDe = (body) => {
    const lista = Array.isArray(body.unidades) && body.unidades.length
        ? body.unidades
        : [{ unidad_id: body.unidad_id, piloto_id: body.piloto_id, tripulacion: body.tripulacion }];
    return lista.map(u => ({
        // Cada unidad sale por su propio tipo de servicio (la motobomba por incendio, la ambulancia por ambulancia)
        tipo_servicio: TABLAS_DETALLE[u.tipo_servicio] ? u.tipo_servicio : body.tipo_servicio,
        unidad_id: entero(u.unidad_id), piloto_id: entero(u.piloto_id),
        tripulacion: [...new Set((Array.isArray(u.tripulacion) ? u.tripulacion : []).map(entero).filter(Boolean))]
    }));
};

const validarUnidades = (lista) => {
    const unidades = lista.map(u => u.unidad_id).filter(Boolean);
    if (new Set(unidades).size !== unidades.length) return 'La misma unidad está elegida dos veces';
    if (lista.length > 1 && lista.some(u => !u.unidad_id)) return 'Elija la unidad de cada boleta';
    const vistos = new Set();
    for (const u of lista) {
        for (const p of new Set([...u.tripulacion, u.piloto_id].filter(Boolean))) {
            if (vistos.has(p)) return 'Una misma persona no puede ir en dos unidades';
            vistos.add(p);
        }
    }
    return null;
};

const registrar = async (req, res) => {
    const error = validarInicio(req.body);
    if (error) return res.status(400).json({ mensaje: error });
    if (!telefonoValido(req.body.solicitud_por_telefono)) return res.status(400).json({ mensaje: ERROR_TELEFONO });
    const unidades = unidadesDe(req.body);
    const errorUnidades = validarUnidades(unidades);
    if (errorUnidades) return res.status(400).json({ mensaje: errorUnidades });

    const cliente = await getClient();
    try {
        await cliente.query('BEGIN');
        const turno = await cliente.query('SELECT id FROM turnos WHERE fin IS NULL LIMIT 1');
        const turnoId = turno.rows[0]?.id ?? null;
        await verificarTurno(cliente, turnoId, unidades.flatMap(u => [u.piloto_id, ...u.tripulacion]));

        // Una unidad que ya está fuera no se despacha otra vez
        const ocupadas = await cliente.query(`
      SELECT u.codigo FROM emergencias e JOIN unidades u ON u.id = e.unidad_id
      WHERE e.estado = 'en_curso' AND e.unidad_id = ANY($1::int[])`, [unidades.map(u => u.unidad_id).filter(Boolean)]);
        if (ocupadas.rows.length) throw new ErrorNegocio(`La unidad ${ocupadas.rows.map(x => x.codigo).join(', ')} ya está fuera en otro servicio`);

        // Otra unidad que se pide para un incidente que ya está en curso
        let incidenteId = null;
        if (req.body.incidente_id) {
            const inc = await cliente.query(`SELECT incidente_id FROM emergencias WHERE id = $1 AND estado <> 'anulada'`, [entero(req.body.incidente_id)]);
            if (!inc.rows.length) throw new ErrorNegocio('El incidente al que se agrega la unidad no existe o está anulado', 404);
            incidenteId = inc.rows[0].incidente_id ?? entero(req.body.incidente_id);
        }

        const ids = [];
        const numeros = [];
        for (const u of unidades) {
            const piloto = u.piloto_id
                ? (await cliente.query('SELECT nombre_completo FROM personal WHERE id = $1', [u.piloto_id])).rows[0]?.nombre_completo
                : null;
            // La causa elegida corresponde al tipo de la llamada; otra unidad con otro tipo la define al completar
            const b = await prepararBase(cliente, {
                ...req.body, tipo_servicio: u.tipo_servicio,
                subtipo: u.tipo_servicio === req.body.tipo_servicio ? req.body.subtipo : null,
                unidad_id: u.unidad_id, piloto_id: u.piloto_id, conforme_piloto: piloto || null
            });
            const valores = CAMPOS_BASE.map(c => limpiar(b[c]));
            valores.push(JSON.stringify(b.no_aplica), req.usuario.id, turnoId, incidenteId ?? ids[0] ?? null);
            const n = CAMPOS_BASE.length;
            const ins = await cliente.query(`
        INSERT INTO emergencias (${CAMPOS_BASE.join(', ')}, no_aplica, usuario_id, turno_id, incidente_id, estado)
        VALUES (${CAMPOS_BASE.map((_, i) => `$${i + 1}`).join(', ')}, $${n + 1}, $${n + 2}, $${n + 3}, $${n + 4}, 'en_curso')
        RETURNING id`, valores);
            const id = ins.rows[0].id;
            // La primera boleta da el número de incidente a las demás
            if (!ids.length && !incidenteId) await cliente.query('UPDATE emergencias SET incidente_id = id WHERE id = $1', [id]);
            ids.push(id);

            await escribirDetalle(cliente, id, b);
            const personal = await guardarTripulacion(cliente, id, u.tripulacion);
            if (personal !== null) await cliente.query('UPDATE emergencias SET personal = $1 WHERE id = $2', [personal, id]);

            let numero = null;
            if (req.body.regreso) {
                if (!b.hora_entrada) await cliente.query('UPDATE emergencias SET hora_entrada = $1 WHERE id = $2', [horaGuatemala(), id]);
                numero = await asignarNumero(cliente, id);
                numeros.push(numero);
            }
            await registrarBitacora(cliente, req.usuario.id, 'crear', 'emergencia', id,
                { numero_control: numero, regreso: !!req.body.regreso, incidente: incidenteId ?? ids[0], unidades: unidades.length, tipo: u.tipo_servicio });
        }
        // Los insumos que se anoten al registrar quedan en la primera boleta
        const alertas = await registrarInsumos(cliente, ids[0], req.body.fecha, req.body.insumos, req.usuario.id);
        await cliente.query('COMMIT');

        const fila = await leerFila({ query }, ids[0]);
        const varias = ids.length > 1;
        res.status(201).json({
            mensaje: numeros.length
                ? (varias ? `Boletas ${numeros.join(', ')} registradas; complételas cuando pueda` : `Boleta ${numeros[0]} registrada; complétela cuando pueda`)
                : (varias ? `Salieron ${ids.length} unidades; registre el regreso de cada una cuando vuelva` : 'La unidad salió; registre el regreso cuando vuelva'),
            emergencia: { id: ids[0], numero_control: numeros[0] ?? null, estado: fila.estado, tipo_servicio: fila.tipo_servicio },
            boletas: ids.map((id, i) => ({ id, numero_control: numeros[i] ?? null })),
            faltantes: faltantes(fila), alertas
        });
    } catch (e) {
        await cliente.query('ROLLBACK');
        responderError(res, e, 'Error al registrar servicio:');
    } finally {
        cliente.release();
    }
};

// ── REGISTRAR REGRESO: aquí se asigna el número ──
const registrarRegreso = async (req, res) => {
    const id = entero(req.params.id);
    const hora = req.body?.hora_entrada || horaGuatemala();
    if (!HORA.test(hora)) return res.status(400).json({ mensaje: 'Hora de regreso no válida' });

    const cliente = await getClient();
    try {
        await cliente.query('BEGIN');
        const e = await cliente.query('SELECT estado, hora_salida FROM emergencias WHERE id = $1 FOR UPDATE', [id]);
        if (!e.rows.length) throw new ErrorNegocio('Servicio no encontrado', 404);
        if (e.rows[0].estado !== 'en_curso') throw new ErrorNegocio('El regreso de esta unidad ya se registró');
        const salida = e.rows[0].hora_salida ? String(e.rows[0].hora_salida).slice(0, 5) : null;
        await cliente.query('UPDATE emergencias SET hora_entrada = $1, minutos_trabajados = $2 WHERE id = $3',
            [hora, minutosEntre(salida, hora.slice(0, 5)), id]);
        const numero = await asignarNumero(cliente, id);
        await registrarBitacora(cliente, req.usuario.id, 'regreso', 'emergencia', id, { numero_control: numero, hora_entrada: hora });
        await cliente.query('COMMIT');
        res.json({ mensaje: `La unidad regresó. Boleta ${numero}`, numero_control: numero });
    } catch (err) {
        await cliente.query('ROLLBACK');
        responderError(res, err, 'Error al registrar regreso:');
    } finally {
        cliente.release();
    }
};

// ── GUARDAR (y completar) ────────────────────────
const guardar = async (req, res) => {
    const id = entero(req.params.id);
    const error = validarInicio(req.body);
    if (error) return res.status(400).json({ mensaje: error });

    const cliente = await getClient();
    try {
        await cliente.query('BEGIN');
        const previo = await cliente.query('SELECT * FROM emergencias WHERE id = $1 FOR UPDATE', [id]);
        if (!previo.rows.length) throw new ErrorNegocio('Servicio no encontrado', 404);
        const antes = previo.rows[0];
        if (!EDITABLES.has(antes.estado)) {
            throw new ErrorNegocio(antes.estado === 'firmada'
                ? 'La boleta ya está firmada y no se puede modificar; si tiene un error, anúlela con motivo'
                : 'La boleta está anulada');
        }
        if (antes.tipo_servicio !== req.body.tipo_servicio) {
            throw new ErrorNegocio('El tipo de servicio no se puede cambiar; anule la boleta y registre una nueva');
        }
        const autoria = await verificarAutoria(cliente, req, id, antes.estado);
        if (req.body.solicitud_por_telefono !== antes.solicitud_por_telefono && !telefonoValido(req.body.solicitud_por_telefono)) {
            throw new ErrorNegocio(ERROR_TELEFONO);
        }
        // Personal nuevo en la boleta: debe ser del turno en que se atendió el servicio
        const previos = await cliente.query('SELECT personal_id FROM boleta_tripulacion WHERE emergencia_id = $1', [id]);
        const yaEstaban = [...previos.rows.map(x => x.personal_id), antes.piloto_id].filter(Boolean);
        const turnoBoleta = antes.turno_id ?? (await cliente.query('SELECT id FROM turnos WHERE fin IS NULL LIMIT 1')).rows[0]?.id;
        await verificarTurno(cliente, turnoBoleta,
            [req.body.piloto_id, ...(Array.isArray(req.body.tripulacion) ? req.body.tripulacion : [])], yaEstaban);

        const b = await prepararBase(cliente, req.body);
        const campos = CAMPOS_BASE.filter(c => c !== 'tipo_servicio');
        // Si el regreso ya se registró, la hora de entrada solo se corrige, no se borra
        if (antes.secuencia && !b.hora_entrada) b.hora_entrada = antes.hora_entrada;
        b.minutos_trabajados = minutosEntre(b.hora_salida?.slice(0, 5), b.hora_entrada ? String(b.hora_entrada).slice(0, 5) : null);
        const valores = campos.map(c => limpiar(b[c]));
        valores.push(JSON.stringify(b.no_aplica), req.usuario.id, id);
        await cliente.query(`
      UPDATE emergencias SET ${campos.map((c, i) => `${c} = $${i + 1}`).join(', ')},
        no_aplica = $${campos.length + 1}, actualizado_por = $${campos.length + 2}, actualizado_en = CURRENT_TIMESTAMP
      WHERE id = $${campos.length + 3}`, valores);
        await escribirDetalle(cliente, id, b);
        const personal = await guardarTripulacion(cliente, id, req.body.tripulacion);
        if (personal !== null) await cliente.query('UPDATE emergencias SET personal = $1 WHERE id = $2', [personal, id]);

        // Estado resultante: completa solo si no falta nada y se pidió completar
        const fila = await leerFila(cliente, id);
        const falta = faltantes(fila);
        let estado = antes.estado;
        if (antes.estado !== 'en_curso') {
            if (falta.length) estado = 'pendiente';
            else if (req.body.completar || antes.estado === 'completa') estado = 'completa';
        }
        if (req.body.completar && falta.length) {
            throw new ErrorNegocio(`Falta: ${falta.map(f => f.etiqueta.toLowerCase()).slice(0, 4).join(', ')}${falta.length > 4 ? '…' : ''}`);
        }
        if (estado !== antes.estado) {
            await cliente.query(`UPDATE emergencias SET estado = $1, completada_en = ${estado === 'completa' ? 'CURRENT_TIMESTAMP' : 'NULL'} WHERE id = $2`, [estado, id]);
        }

        // Solo se guardan en bitácora los campos que cambiaron
        const cambios = {};
        for (const c of campos) {
            const a = antes[c] == null ? null : String(antes[c]);
            const n = limpiar(b[c]) == null ? null : String(b[c]);
            if (a !== n && !(c.startsWith('hora_') && a?.slice(0, 5) === n?.slice(0, 5))) cambios[c] = { antes: a, despues: n };
        }
        await registrarBitacora(cliente, req.usuario.id, estado === 'completa' && antes.estado !== 'completa' ? 'completar' : 'editar',
            'emergencia', id, { ...cambios, _por: autoria });

        await cliente.query('COMMIT');
        res.json({
            mensaje: estado === 'completa' ? 'Boleta completa; ya se puede imprimir' : 'Cambios guardados',
            estado, faltantes: falta
        });
    } catch (e) {
        await cliente.query('ROLLBACK');
        responderError(res, e, 'Error al guardar boleta:');
    } finally {
        cliente.release();
    }
};

// ── CAMBIAR EL TIPO DE SERVICIO ──────────────────
// Llamaron por un choque y al llegar alguien está atrapado (rescate), o el herido
// ya se fue y el servicio no se completó (servicios varios). La boleta cambia de
// tipo y conserva fecha, horas, dirección, unidad, piloto y tripulación. Si ya
// tenía número, recibe el siguiente del tipo nuevo y el anterior queda liberado.
// Pacientes y rescatados pasan de un tipo al otro; la causa se vuelve a elegir.
const PASAN_ENTRE_TIPOS = {
    'ambulancia>rescate': { nombres_pacientes: 'nombres_rescatados', edades: 'edades', domicilios: 'domicilios' },
    'rescate>ambulancia': { nombres_rescatados: 'nombres_pacientes', edades: 'edades', domicilios: 'domicilios' }
};

const cambiarTipo = async (req, res) => {
    const id = entero(req.params.id);
    const nuevo = req.body?.tipo_servicio;
    if (!TABLAS_DETALLE[nuevo]) return res.status(400).json({ mensaje: 'Tipo de servicio no válido' });

    const cliente = await getClient();
    try {
        await cliente.query('BEGIN');
        const e = await cliente.query('SELECT * FROM emergencias WHERE id = $1 FOR UPDATE', [id]);
        if (!e.rows.length) throw new ErrorNegocio('Servicio no encontrado', 404);
        const antes = e.rows[0];
        if (!EDITABLES.has(antes.estado)) {
            throw new ErrorNegocio(antes.estado === 'firmada'
                ? 'La boleta ya está firmada: para cambiar el tipo, anúlela con motivo y registre una nueva'
                : 'La boleta está anulada');
        }
        if (antes.tipo_servicio === nuevo) throw new ErrorNegocio('La boleta ya es de ese tipo');
        const autoria = await verificarAutoria(cliente, req, id, antes.estado);

        // Detalle: lo que existe en ambos tipos pasa; lo demás se llena en el tipo nuevo
        const det = (await cliente.query(`SELECT * FROM ${TABLAS_DETALLE[antes.tipo_servicio]} WHERE emergencia_id = $1`, [id])).rows[0] || {};
        const pasa = PASAN_ENTRE_TIPOS[`${antes.tipo_servicio}>${nuevo}`] || {};
        const detalleNuevo = { tipo_servicio: nuevo };
        for (const [de, a] of Object.entries(pasa)) detalleNuevo[a] = det[de] ?? null;
        await cliente.query(`DELETE FROM ${TABLAS_DETALLE[antes.tipo_servicio]} WHERE emergencia_id = $1`, [id]);
        await escribirDetalle(cliente, id, detalleNuevo);

        // «No aplica» solo de los campos que también existen en el tipo nuevo
        const clavesNuevo = new Set((CAMPOS_BOLETA[nuevo] || []).map(c => c.clave));
        const noAplica = (Array.isArray(antes.no_aplica) ? antes.no_aplica : []).filter(c => clavesNuevo.has(c));
        await cliente.query(`
      UPDATE emergencias SET tipo_servicio = $1, subtipo = NULL, no_aplica = $2,
        estado = CASE WHEN estado = 'completa' THEN 'pendiente' ELSE estado END,
        completada_en = CASE WHEN estado = 'completa' THEN NULL ELSE completada_en END,
        impresa_en = NULL, actualizado_por = $3, actualizado_en = CURRENT_TIMESTAMP
      WHERE id = $4`, [nuevo, JSON.stringify(noAplica), req.usuario.id, id]);

        // Número: el anterior queda liberado y la boleta recibe el siguiente del tipo nuevo
        let numero = null;
        if (antes.secuencia) {
            await cliente.query('UPDATE emergencias SET secuencia = NULL, anio_secuencia = NULL, numero_control = NULL WHERE id = $1', [id]);
            numero = await asignarNumero(cliente, id, { conservarRegreso: true });
            await cliente.query(`
        INSERT INTO numeros_liberados (tipo_servicio, anio, secuencia, numero_control, emergencia_id, paso_a, usuario_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [antes.tipo_servicio, antes.anio_secuencia, antes.secuencia, antes.numero_control, id, numero, req.usuario.id]);
        }

        await registrarBitacora(cliente, req.usuario.id, 'cambiar_tipo', 'emergencia', id, {
            de: antes.tipo_servicio, a: nuevo, numero_anterior: antes.numero_control, numero_nuevo: numero, _por: autoria
        });
        await cliente.query('COMMIT');
        res.json({
            mensaje: numero
                ? `La boleta pasó a ${TIPOS_SERVICIO[nuevo].toLowerCase()}: ahora es ${numero} (antes ${antes.numero_control})`
                : `La boleta pasó a ${TIPOS_SERVICIO[nuevo].toLowerCase()}`,
            tipo_servicio: nuevo, numero_control: numero ?? antes.numero_control, numero_anterior: antes.numero_control
        });
    } catch (err) {
        await cliente.query('ROLLBACK');
        responderError(res, err, 'Error al cambiar el tipo de servicio:');
    } finally {
        cliente.release();
    }
};

// ── VERIFICAR PIN (para abrir la pantalla de completar) ─
const verificarPin = async (req, res) => {
    const id = entero(req.params.id);
    try {
        const e = await query('SELECT estado FROM emergencias WHERE id = $1', [id]);
        if (!e.rows.length) return res.status(404).json({ mensaje: 'Servicio no encontrado' });
        const autoria = await verificarAutoria({ query }, req, id, e.rows[0].estado);
        res.json(autoria);
    } catch (err) {
        responderError(res, err, 'Error al verificar PIN:');
    }
};

// ── FIRMAR (revisión diaria de la administración) ─
const firmar = async (req, res) => {
    const ids = (Array.isArray(req.body?.ids) ? req.body.ids : []).map(entero).filter(Boolean);
    if (!ids.length) return res.status(400).json({ mensaje: 'Indique las boletas firmadas' });
    try {
        const r = await query(`
      UPDATE emergencias SET estado = 'firmada', firmada_en = CURRENT_TIMESTAMP, firmada_por = $2
      WHERE id = ANY($1::int[]) AND estado = 'completa' RETURNING id, numero_control`, [ids, req.usuario.id]);
        for (const f of r.rows) await registrarBitacora({ query }, req.usuario.id, 'firmar', 'emergencia', f.id, { numero_control: f.numero_control });
        const omitidas = ids.length - r.rows.length;
        res.json({
            mensaje: `${r.rows.length} boleta(s) marcadas como firmadas${omitidas ? `; ${omitidas} no estaban completas` : ''}`,
            firmadas: r.rows.length
        });
    } catch (error) {
        console.error('Error al firmar boletas:', error);
        res.status(500).json({ mensaje: 'Error al registrar las firmas' });
    }
};

// ── ANULAR: conserva la boleta y su número; devuelve los insumos ─
const anular = async (req, res) => {
    const id = entero(req.params.id);
    const motivo = req.body.motivo?.trim();
    if (!motivo || motivo.length < 10) {
        return res.status(400).json({ mensaje: 'Describa el motivo de la anulación (mínimo 10 caracteres)' });
    }
    const cliente = await getClient();
    try {
        await cliente.query('BEGIN');
        const e = await cliente.query('SELECT estado, numero_control FROM emergencias WHERE id = $1 FOR UPDATE', [id]);
        if (!e.rows.length) throw new ErrorNegocio('Servicio no encontrado', 404);
        if (e.rows[0].estado === 'anulada') throw new ErrorNegocio('La boleta ya estaba anulada');
        // Un servicio en curso aún no tiene número: cancelarlo no deja un salto en la secuencia.
        // Con número, solo la administración anula (revisión diaria).
        if (req.usuario.rol !== 'administrador' && e.rows[0].estado !== 'en_curso') {
            throw new ErrorNegocio('Solo la administración anula boletas que ya tienen número', 403);
        }

        // Solo los consumos antiguos descontaban de bodega; esos se devuelven
        const consumos = await cliente.query(
            `SELECT id FROM movimientos_inventario WHERE emergencia_id = $1 AND tipo_movimiento = 'salida' AND motivo = 'consumo_servicio'`, [id]);
        for (const m of consumos.rows) {
            await anularMovimiento(cliente, m.id, req.usuario.id, `Anulación de boleta ${e.rows[0].numero_control || id}`);
        }
        await cliente.query(`
      UPDATE emergencias SET estado = 'anulada', motivo_anulacion = $1, anulada_por = $2, anulada_en = CURRENT_TIMESTAMP
      WHERE id = $3`, [motivo, req.usuario.id, id]);
        await registrarBitacora(cliente, req.usuario.id, 'anular', 'emergencia', id, { motivo, insumos_devueltos: consumos.rows.length });
        await cliente.query('COMMIT');
        res.json({ mensaje: `Boleta anulada${consumos.rows.length ? `; se devolvieron ${consumos.rows.length} consumo(s) al inventario` : ''}` });
    } catch (err) {
        await cliente.query('ROLLBACK');
        responderError(res, err, 'Error al anular servicio:');
    } finally {
        cliente.release();
    }
};

// ── LISTAR CON FILTROS Y PAGINACIÓN ──────────────
const listar = async (req, res) => {
    const { tipo_servicio, subtipo, fecha_inicio, fecha_fin, desde, hasta, unidad_id, sector_id, lugar_critico_id, texto, estado, personal_id } = req.query;
    const pagina = Math.max(1, entero(req.query.pagina) || 1);
    const tamano = Math.min(100, Math.max(10, entero(req.query.tamano) || 25));

    const cond = [];
    const val = [];
    const agregar = (sql, v) => { val.push(v); cond.push(sql.replaceAll('?', `$${val.length}`)); };

    if (tipo_servicio) agregar('e.tipo_servicio = ?', tipo_servicio);
    if (subtipo) agregar('e.subtipo = ?', subtipo);
    if (fecha_inicio || desde) agregar('e.fecha >= ?', fecha_inicio || desde);
    if (fecha_fin || hasta) agregar('e.fecha <= ?', fecha_fin || hasta);
    if (unidad_id) agregar('e.unidad_id = ?', unidad_id);
    if (lugar_critico_id) agregar('e.lugar_critico_id = ?', lugar_critico_id);
    if (personal_id) agregar('(e.piloto_id = ? OR EXISTS (SELECT 1 FROM boleta_tripulacion t WHERE t.emergencia_id = e.id AND t.personal_id = ?))', personal_id);
    if (req.query.insumo_id) agregar('EXISTS (SELECT 1 FROM v_consumo_servicio c WHERE c.emergencia_id = e.id AND c.insumo_id = ?)', req.query.insumo_id);
    if (sector_id === 'sin') cond.push('e.sector_id IS NULL');
    else if (sector_id) agregar('e.sector_id = ?', sector_id);
    if (req.query.impresion === 'pendiente') cond.push(`e.impresa_en IS NULL AND e.estado IN ('completa', 'firmada')`);
    if (req.query.impresion === 'impresa') cond.push('e.impresa_en IS NOT NULL');
    if (estado === 'atendidos') cond.push(contable('e'));
    else if (estado === 'imprimibles') cond.push(`e.estado IN ('completa', 'firmada')`);
    else if (estado && estado !== 'todas') agregar('e.estado = ?', estado);
    else if (!estado) cond.push(`e.estado <> 'anulada'`);
    if (texto?.trim()) {
        val.push(`%${texto.trim()}%`);
        const p = `$${val.length}`;
        cond.push(`(e.numero_control ILIKE ${p} OR e.direccion ILIKE ${p} OR e.solicitante ILIKE ${p}
      OR e.observaciones ILIKE ${p} OR da.nombres_pacientes ILIKE ${p} OR dr.nombres_rescatados ILIKE ${p})`);
    }

    const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';
    const de = `
    FROM emergencias e
    JOIN usuarios u ON u.id = e.usuario_id
    LEFT JOIN sectores s ON s.id = e.sector_id
    LEFT JOIN detalle_ambulancia da ON da.emergencia_id = e.id
    LEFT JOIN detalle_rescate dr ON dr.emergencia_id = e.id
    ${where}`;

    try {
        const total = await query(`SELECT COUNT(*)::int AS n ${de}`, val);
        const filas = await query(`
      SELECT e.id, e.numero_control, e.tipo_servicio, e.subtipo, e.fecha, e.hora_salida, e.hora_entrada,
             e.direccion, e.zona, s.nombre AS sector, e.unidad, e.piloto, e.minutos_trabajados,
             e.estado, e.impresa_en, e.impresiones, e.regreso_en, u.nombre_completo AS registrado_por,
             (SELECT COUNT(*)::int FROM emergencias x WHERE x.incidente_id = e.incidente_id AND x.estado <> 'anulada') AS unidades_incidente,
             (SELECT COUNT(*)::int FROM v_consumo_servicio m WHERE m.emergencia_id = e.id) AS consumos
      ${de}
      ORDER BY e.fecha DESC, e.regreso_en DESC NULLS FIRST, e.hora_salida DESC NULLS LAST, e.id DESC
      LIMIT ${tamano} OFFSET ${(pagina - 1) * tamano}`, val);
        res.json({ total: total.rows[0].n, pagina, tamano, servicios: filas.rows });
    } catch (error) {
        console.error('Error al listar servicios:', error);
        res.status(500).json({ mensaje: 'Error al consultar el historial' });
    }
};

// ── OBTENER UNO COMPLETO ─────────────────────────
const obtenerPorId = async (req, res) => {
    const id = entero(req.params.id);
    if (!id) return res.status(400).json({ mensaje: 'Identificador inválido' });
    try {
        const base = await query(`
      SELECT e.*, u.nombre_completo AS registrado_por, s.nombre AS sector, lc.nombre AS lugar_critico,
             ua.nombre_completo AS anulada_por_nombre, ue.nombre_completo AS actualizado_por_nombre,
             uf.nombre_completo AS firmada_por_nombre
      FROM emergencias e
      JOIN usuarios u ON u.id = e.usuario_id
      LEFT JOIN sectores s ON s.id = e.sector_id
      LEFT JOIN lugares_criticos lc ON lc.id = e.lugar_critico_id
      LEFT JOIN usuarios ua ON ua.id = e.anulada_por
      LEFT JOIN usuarios ue ON ue.id = e.actualizado_por
      LEFT JOIN usuarios uf ON uf.id = e.firmada_por
      WHERE e.id = $1`, [id]);
        if (!base.rows.length) return res.status(404).json({ mensaje: 'Servicio no encontrado' });

        const servicio = base.rows[0];
        const detalle = await query(`SELECT * FROM ${TABLAS_DETALLE[servicio.tipo_servicio]} WHERE emergencia_id = $1`, [id]);
        const [insumos, tripulacion, historial, certificaciones, turno, incidente] = await Promise.all([
            query(`
        SELECT c.id, c.cantidad, i.id AS insumo_id, i.nombre, i.categoria, i.unidad_medida
        FROM v_consumo_servicio c JOIN insumos i ON i.id = c.insumo_id
        WHERE c.emergencia_id = $1
        ORDER BY i.nombre`, [id]),
            query(`
        SELECT p.id, p.nombre_completo, p.es_piloto, p.voluntario, (p.pin_hash IS NOT NULL) AS tiene_pin
        FROM boleta_tripulacion t JOIN personal p ON p.id = t.personal_id
        WHERE t.emergencia_id = $1 ORDER BY p.nombre_completo`, [id]),
            query(`
        SELECT b.accion, b.detalle, b.creado_en, u.nombre_completo AS usuario
        FROM bitacora b LEFT JOIN usuarios u ON u.id = b.usuario_id
        WHERE b.entidad = 'emergencia' AND b.entidad_id = $1
        ORDER BY b.creado_en DESC`, [id]),
            query(`
        SELECT c.*, u.nombre_completo AS emitida_por FROM certificaciones c
        JOIN usuarios u ON u.id = c.usuario_id WHERE c.emergencia_id = $1 ORDER BY c.creado_en DESC`, [id]),
            // Turno en que se atendió: de ahí sale el personal que se puede elegir
            query(`
        SELECT t.id, t.personal, t.escuadra_id, t.inicio, t.fin, es.nombre AS escuadra
        FROM turnos t LEFT JOIN escuadras es ON es.id = t.escuadra_id WHERE t.id = $1`, [servicio.turno_id]),
            // Las otras unidades que salieron al mismo incidente
            query(`
        SELECT e.id, e.numero_control, e.unidad, e.piloto, e.estado
        FROM emergencias e WHERE e.incidente_id = $1 AND e.id <> $2 ORDER BY e.id`, [servicio.incidente_id ?? id, id])
        ]);
        servicio.turno = turno.rows[0] || null;
        servicio.incidente = incidente.rows;
        servicio.detalle = detalle.rows[0] || {};
        servicio.insumos = insumos.rows;
        servicio.tripulacion = tripulacion.rows;
        servicio.historial = historial.rows;
        servicio.certificaciones = certificaciones.rows;
        servicio.faltantes = ['en_curso', 'pendiente', 'completa'].includes(servicio.estado)
            ? faltantes({ ...servicio.detalle, ...servicio }) : [];
        res.json(servicio);
    } catch (error) {
        console.error('Error al obtener servicio:', error);
        res.status(500).json({ mensaje: 'Error al consultar el servicio' });
    }
};

// ── BOLETAS POR COMPLETAR (Inicio) ───────────────
// Cabina y operativo ven solo las del turno de guardia activo (las del turno
// anterior ya no les corresponden); la administración las ve todas para avisar.
const porCompletar = async (req, res) => {
    try {
        const delTurno = req.query.alcance !== 'todas';
        const r = await query(`
      SELECT e.id FROM emergencias e
      WHERE e.estado = 'pendiente'
        ${delTurno ? 'AND e.turno_id = (SELECT id FROM turnos WHERE fin IS NULL LIMIT 1)' : ''}
      ORDER BY e.regreso_en NULLS LAST, e.id LIMIT ${delTurno ? 50 : 200}`);
        const filas = [];
        for (const { id } of r.rows) {
            const f = await leerFila({ query }, id);
            const trip = await query(`
        SELECT p.nombre_completo FROM boleta_tripulacion t JOIN personal p ON p.id = t.personal_id
        WHERE t.emergencia_id = $1 ORDER BY p.nombre_completo`, [id]);
            const s = f.sector_id ? await query('SELECT nombre FROM sectores WHERE id = $1', [f.sector_id]) : { rows: [] };
            filas.push({
                id, numero_control: f.numero_control, tipo_servicio: f.tipo_servicio, fecha: f.fecha,
                hora_entrada: f.hora_entrada, regreso_en: f.regreso_en, direccion: f.direccion,
                sector: s.rows[0]?.nombre || null, unidad: f.unidad, turno_id: f.turno_id,
                tripulacion: trip.rows.map(x => x.nombre_completo), faltantes: faltantes(f)
            });
        }
        res.json(filas);
    } catch (error) {
        console.error('Error al listar boletas por completar:', error);
        res.status(500).json({ mensaje: 'Error al consultar las boletas por completar' });
    }
};

// ── REVISIÓN DIARIA (entrevista 59:43) ───────────
// Por tipo: las boletas cuyo regreso se registró ese día, en orden de número,
// y los números que faltan en la secuencia del año hasta ese día.
const revision = async (req, res) => {
    const fecha = FECHA_ISO.test(req.query.fecha || '') ? req.query.fecha : hoyGuatemala();
    try {
        const r = await query(`
      SELECT e.id, e.numero_control, e.secuencia, e.anio_secuencia, e.tipo_servicio, e.estado, e.impresa_en,
             e.regreso_en, e.hora_entrada, e.unidad, e.motivo_anulacion, COALESCE(s.nombre, e.zona) AS sector
      FROM emergencias e LEFT JOIN sectores s ON s.id = e.sector_id
      WHERE e.secuencia IS NOT NULL AND e.regreso_en::date = $1::date
      ORDER BY e.tipo_servicio, e.secuencia`, [fecha]);

        // Huecos: números del año que no existen, entre 1 y el mayor asignado hasta ese día
        const huecos = await query(`
      WITH maximos AS (
        SELECT tipo_servicio, anio_secuencia, MAX(secuencia) AS maximo
        FROM emergencias WHERE secuencia IS NOT NULL AND anio_secuencia = EXTRACT(YEAR FROM $1::date)
          AND regreso_en::date <= $1::date
        GROUP BY 1, 2)
      SELECT m.tipo_servicio, g.n AS secuencia
      FROM maximos m CROSS JOIN LATERAL generate_series(1, m.maximo) AS g(n)
      WHERE NOT EXISTS (SELECT 1 FROM emergencias e WHERE e.tipo_servicio = m.tipo_servicio
                        AND e.anio_secuencia = m.anio_secuencia AND e.secuencia = g.n)
        AND NOT EXISTS (SELECT 1 FROM numeros_liberados l WHERE l.tipo_servicio = m.tipo_servicio
                        AND l.anio = m.anio_secuencia AND l.secuencia = g.n)
      ORDER BY 1, 2`, [fecha]);

        // Números que dejó libres un cambio de tipo ese día: no son un error
        const liberados = await query(`
      SELECT l.tipo_servicio, l.secuencia, l.numero_control, l.paso_a, l.emergencia_id
      FROM numeros_liberados l WHERE l.creado_en::date = $1::date ORDER BY l.tipo_servicio, l.secuencia`, [fecha]);

        // Pendientes de días anteriores: siguen esperando a la tripulación
        const atrasadas = await query(`
      SELECT e.id, e.numero_control, e.tipo_servicio, e.subtipo, e.estado, e.regreso_en, e.unidad,
             COALESCE(s.nombre, e.zona) AS sector, ($1::date - e.regreso_en::date) AS dias
      FROM emergencias e LEFT JOIN sectores s ON s.id = e.sector_id
      WHERE e.estado IN ('pendiente', 'completa') AND e.regreso_en::date < $1::date
      ORDER BY e.regreso_en`, [fecha]);

        const tipos = Object.keys(TABLAS_DETALLE).map(t => ({
            tipo_servicio: t,
            boletas: r.rows.filter(x => x.tipo_servicio === t),
            huecos: huecos.rows.filter(x => x.tipo_servicio === t).map(x => x.secuencia),
            liberados: liberados.rows.filter(x => x.tipo_servicio === t)
        }));
        res.json({
            fecha, tipos, atrasadas: atrasadas.rows,
            resumen: {
                total: r.rows.length,
                firmadas: r.rows.filter(x => x.estado === 'firmada').length,
                por_firmar: r.rows.filter(x => x.estado === 'completa').length,
                por_completar: r.rows.filter(x => x.estado === 'pendiente').length,
                huecos: huecos.rows.length
            }
        });
    } catch (error) {
        console.error('Error en la revisión diaria:', error);
        res.status(500).json({ mensaje: 'Error al preparar la revisión' });
    }
};

// ── COPIA CERTIFICADA ────────────────────────────
const certificar = async (req, res) => {
    const id = entero(req.params.id);
    const solicitante = req.body.solicitante?.trim();
    if (!solicitante) return res.status(400).json({ mensaje: 'Indique a nombre de quién se extiende la copia' });
    const fecha = FECHA_ISO.test(req.body.fecha || '') ? req.body.fecha : hoyGuatemala();
    try {
        const e = await query('SELECT estado FROM emergencias WHERE id = $1', [id]);
        if (!e.rows.length) return res.status(404).json({ mensaje: 'Servicio no encontrado' });
        if (!['completa', 'firmada'].includes(e.rows[0].estado)) {
            return res.status(400).json({ mensaje: 'Solo se certifica una boleta completa o firmada' });
        }
        const r = await query(`
      INSERT INTO certificaciones (emergencia_id, solicitante, destino, fecha, usuario_id)
      VALUES ($1, $2, $3, $4, $5) RETURNING *`, [id, solicitante, req.body.destino?.trim() || null, fecha, req.usuario.id]);
        await query('UPDATE emergencias SET copia_certificada_a = $1, fecha_certificacion = $2 WHERE id = $3', [solicitante, fecha, id]);
        await registrarBitacora({ query }, req.usuario.id, 'certificar', 'emergencia', id, { solicitante, destino: req.body.destino });
        res.status(201).json(r.rows[0]);
    } catch (error) {
        console.error('Error al certificar:', error);
        res.status(500).json({ mensaje: 'Error al registrar la copia certificada' });
    }
};

// ── AGREGAR / QUITAR INSUMOS USADOS EN LA BOLETA ─
const agregarInsumo = async (req, res) => {
    const id = entero(req.params.id);
    const cliente = await getClient();
    try {
        await cliente.query('BEGIN');
        const e = await cliente.query('SELECT estado FROM emergencias WHERE id = $1', [id]);
        if (!e.rows.length) throw new ErrorNegocio('Servicio no encontrado', 404);
        if (!EDITABLES.has(e.rows[0].estado)) throw new ErrorNegocio('La boleta ya no se puede modificar');
        await verificarAutoria(cliente, req, id, e.rows[0].estado);
        const nombre = await registrarUso(cliente, id, req.body, req.usuario.id);
        await registrarBitacora(cliente, req.usuario.id, 'agregar_insumo', 'emergencia', id, { insumo: nombre, cantidad: Number(req.body.cantidad) });
        await cliente.query('COMMIT');
        res.status(201).json({ mensaje: 'Uso registrado' });
    } catch (err) {
        await cliente.query('ROLLBACK');
        responderError(res, err, 'Error al agregar insumo:');
    } finally {
        cliente.release();
    }
};

// Quita un uso registrado. Los consumos antiguos ("m…") eran salidas de bodega y se devuelven
const quitarInsumo = async (req, res) => {
    const id = entero(req.params.id);
    const ref = String(req.params.movId);
    const cliente = await getClient();
    try {
        await cliente.query('BEGIN');
        const e = await cliente.query('SELECT estado FROM emergencias WHERE id = $1', [id]);
        if (!e.rows.length) throw new ErrorNegocio('Servicio no encontrado', 404);
        if (!EDITABLES.has(e.rows[0].estado)) throw new ErrorNegocio('La boleta ya no se puede modificar');
        await verificarAutoria(cliente, req, id, e.rows[0].estado);
        if (ref.startsWith('m')) {
            const movId = entero(ref.slice(1));
            const m = await cliente.query('SELECT emergencia_id FROM movimientos_inventario WHERE id = $1', [movId]);
            if (!m.rows.length || m.rows[0].emergencia_id !== id) throw new ErrorNegocio('El consumo no pertenece a esta boleta', 404);
            await anularMovimiento(cliente, movId, req.usuario.id, 'Corrección de consumo en boleta');
        } else {
            const r = await cliente.query('DELETE FROM consumos_servicio WHERE id = $1 AND emergencia_id = $2 RETURNING insumo_id, cantidad',
                [entero(ref.replace(/^u/, '')), id]);
            if (!r.rows.length) throw new ErrorNegocio('El uso no pertenece a esta boleta', 404);
        }
        await registrarBitacora(cliente, req.usuario.id, 'quitar_insumo', 'emergencia', id, { referencia: ref });
        await cliente.query('COMMIT');
        res.json({ mensaje: 'Uso retirado' });
    } catch (err) {
        await cliente.query('ROLLBACK');
        responderError(res, err, 'Error al quitar insumo:');
    } finally {
        cliente.release();
    }
};

// ── LISTA SIMPLE PARA VINCULAR SALIDAS ───────────
const listarParaVinculo = async (req, res) => {
    const texto = req.query.texto?.trim();
    try {
        const r = await query(`
      SELECT e.id, e.numero_control, e.tipo_servicio, e.fecha, COALESCE(s.nombre, e.zona) AS sector
      FROM emergencias e LEFT JOIN sectores s ON s.id = e.sector_id
      WHERE ${contable('e')} ${texto ? 'AND (e.numero_control ILIKE $1 OR e.direccion ILIKE $1)' : ''}
      ORDER BY e.fecha DESC, e.id DESC
      LIMIT 50`, texto ? [`%${texto}%`] : []);
        res.json(r.rows);
    } catch (error) {
        console.error('Error al listar servicios:', error);
        res.status(500).json({ mensaje: 'Error al consultar los servicios' });
    }
};

// ── IMPRESIÓN ────────────────────────────────────
const marcarImpresa = async (req, res) => {
    const ids = (Array.isArray(req.body?.ids) ? req.body.ids : [req.params.id]).map(entero).filter(Boolean);
    if (!ids.length) return res.status(400).json({ mensaje: 'Indique las boletas impresas' });
    try {
        const r = await query(`
      UPDATE emergencias SET impresa_en = CURRENT_TIMESTAMP, impresiones = impresiones + 1
      WHERE id = ANY($1::int[]) AND estado IN ('completa', 'firmada') RETURNING id`, [ids]);
        res.json({ impresas: r.rows.length });
    } catch (error) {
        console.error('Error al marcar impresión:', error);
        res.status(500).json({ mensaje: 'Error al registrar la impresión' });
    }
};

// Contadores para el menú y el inicio
const contadores = async (req, res) => {
    try {
        const r = await query(`
      SELECT COUNT(*) FILTER (WHERE estado IN ('completa', 'firmada') AND impresa_en IS NULL)::int AS por_imprimir,
             COUNT(*) FILTER (WHERE estado = 'pendiente')::int AS por_completar,
             COUNT(*) FILTER (WHERE estado = 'completa')::int AS por_firmar,
             COUNT(*) FILTER (WHERE estado = 'en_curso')::int AS en_curso
      FROM emergencias`);
        res.json({ ...r.rows[0], n: r.rows[0].por_imprimir });
    } catch (error) {
        console.error('Error al contar boletas:', error);
        res.status(500).json({ mensaje: 'Error al consultar' });
    }
};

// ── SERVICIOS EN CURSO (unidades fuera de la estación) ─
const enCurso = async (req, res) => {
    try {
        const r = await query(`
      SELECT e.id, e.tipo_servicio, e.subtipo, e.fecha, e.hora_salida,
             e.direccion, COALESCE(s.nombre, e.zona) AS sector, e.unidad, e.unidad_id, e.piloto, e.piloto_id, e.creado_en, e.incidente_id,
             COALESCE((SELECT array_agg(bt.personal_id) FROM boleta_tripulacion bt WHERE bt.emergencia_id = e.id), '{}') AS tripulacion
      FROM emergencias e LEFT JOIN sectores s ON s.id = e.sector_id
      WHERE e.estado = 'en_curso'
      ORDER BY e.fecha, e.hora_salida NULLS LAST, e.id`);
        res.json(r.rows);
    } catch (error) {
        console.error('Error al listar servicios en curso:', error);
        res.status(500).json({ mensaje: 'Error al consultar los servicios en curso' });
    }
};

// ── LLAMANTE FRECUENTE: nombre de la última boleta con ese teléfono ─
// Solo se propone el nombre: la misma persona puede llamar desde lugares
// distintos y una dirección anterior quedaría como si fuera la del servicio.
const llamante = async (req, res) => {
    const telefono = (req.query.telefono || '').replace(/\D/g, '');
    if (telefono.length < 8) return res.json(null);
    try {
        const r = await query(`
      SELECT e.solicitante, e.fecha,
             (SELECT COUNT(*)::int FROM emergencias x
               WHERE regexp_replace(x.solicitud_por_telefono, '\\D', '', 'g') = $1) AS llamadas
      FROM emergencias e
      WHERE regexp_replace(e.solicitud_por_telefono, '\\D', '', 'g') = $1 AND e.estado <> 'anulada'
      ORDER BY e.fecha DESC, e.id DESC LIMIT 1`, [telefono]);
        res.json(r.rows[0] || null);
    } catch (error) {
        console.error('Error al buscar llamante:', error);
        res.status(500).json({ mensaje: 'Error al consultar' });
    }
};

module.exports = {
    enCurso, llamante, marcarImpresa, contadores, porCompletar, revision,
    registrar, registrarRegreso, guardar, cambiarTipo, verificarPin, firmar, anular, certificar,
    listar, obtenerPorId, agregarInsumo, quitarInsumo, listarParaVinculo,
    faltantes
};
