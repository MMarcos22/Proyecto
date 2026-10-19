// Vocabulario controlado del sistema. El frontend lo obtiene de /api/catalogos/dominio,
// así existe una sola fuente para las clasificaciones que alimentan el análisis.

const TIPOS_SERVICIO = {
    ambulancia: 'Ambulancia',
    incendio: 'Incendio',
    rescate: 'Rescate',
    varios: 'Servicios varios',
    agua: 'Servicio de agua'
};

// Causas de cada tipo. Reemplazan el Excel por causa que lleva el jefe de
// servicio (entrevista 34:31): moto y vehículo se cuentan por separado.
const SUBTIPOS = {
    ambulancia: {
        accidente_moto: 'Accidente de motocicleta',
        accidente_vehiculo: 'Accidente de vehículo',
        atropello: 'Atropello',
        caida: 'Caída',
        enfermedad_comun: 'Enfermedad común',
        maternidad: 'Maternidad',
        herida_arma: 'Herida por arma',
        intoxicacion: 'Intoxicación',
        accidente_trabajo: 'Accidente de trabajo',
        traslado_programado: 'Traslado programado',
        otro: 'Otra causa'
    },
    incendio: {
        estructural: 'Estructural (vivienda o local)',
        vehicular: 'Vehicular',
        forestal: 'Forestal o de maleza',
        basura: 'Basura o desechos',
        electrico: 'Eléctrico',
        otro: 'Otro'
    },
    rescate: {
        vehicular: 'Personas atrapadas en vehículo',
        acuatico: 'Acuático',
        altura: 'En altura o barranco',
        estructura: 'Estructura colapsada',
        animal: 'Rescate de animal',
        busqueda: 'Búsqueda de persona',
        otro: 'Otro'
    },
    varios: {
        falsa_alarma: 'Falsa alarma',
        sin_traslado: 'Atendido sin traslado',
        insectos: 'Enjambre o insectos',
        arbol_caido: 'Árbol caído',
        fuga_gas: 'Fuga de gas',
        inundacion: 'Inundación',
        prevencion: 'Prevención en evento',
        apoyo_institucional: 'Apoyo institucional',
        limpieza_via: 'Limpieza de vía',
        otro: 'Otro'
    },
    agua: {
        establecimiento: 'Institución de gobierno (con carta)',
        centro_asistencial: 'Centro de salud u hospital',
        domicilio: 'Domicilio',
        comunidad: 'Comunidad',
        otro: 'Incendio menor u otro'
    }
};

// Ciclo de vida de la boleta (análisis §9.1)
const ESTADOS_BOLETA = {
    en_curso: 'Unidad fuera',
    pendiente: 'Por completar',
    completa: 'Completa',
    firmada: 'Firmada',
    anulada: 'Anulada'
};
// Estados que cuentan como servicio atendido en informes y análisis
const ESTADOS_CONTABLES = ['pendiente', 'completa', 'firmada'];

const ESTADOS_UNIDAD = { servicio: 'En servicio', reposicion: 'De reposición', taller: 'En taller' };

// Prefijo del número de control por tipo: AMB-2026-0001
const PREFIJOS_CONTROL = { ambulancia: 'AMB', incendio: 'INC', rescate: 'RES', varios: 'VAR', agua: 'AGU' };

// Campos de cada boleta oficial que deben tener un valor (o "No aplica") para
// completarla: la encargada revisa que no queden espacios en blanco (54:22).
// Un grupo con varios campos se cumple si cualquiera tiene valor (casillas).
const c = (clave, etiqueta, campos = [clave]) => ({ clave, etiqueta, campos });
const COMUNES = [
    c('solicitud_por_telefono', 'Solicitud por teléfono'),
    c('solicitante', 'Nombre del solicitante'),
    c('personal', 'Personal'),
    c('hora_salida', 'Hora de salida'),
    c('hora_entrada', 'Hora de entrada'),
    c('direccion', 'Dirección'),
    c('radiotelefonista', 'Radiotelefonista'),
    c('observaciones', 'Observaciones')
];
const UNIDAD = [c('unidad', 'Unidad'), c('piloto', 'Piloto'), c('personal_destacado', 'Personal destacado')];
const FIRMAS = [
    c('informe_formulado_por', 'Informe formulado por'),
    c('conforme_piloto', 'Es conforme el piloto'),
    c('vobo_jefe_servicio', 'Vo. Bo. jefe de servicio')
];
const CAMPOS_BOLETA = {
    ambulancia: [...COMUNES, ...UNIDAD,
        c('nombres_pacientes', 'Nombre de los pacientes'), c('edades', 'Edades'), c('domicilios', 'Domicilios'),
        c('acompanantes', 'Acompañantes'),
        c('caso', 'Tipo de caso (maternidad, tránsito, trabajo u otros)', ['serv_maternidad', 'acc_transito', 'acc_trabajo', 'otros']),
        c('traslado', 'Traslado a', ['hosp_modular', 'hosp_privado', 'hosp_igss', 'otro_traslado']),
        ...FIRMAS],
    incendio: [...COMUNES,
        c('prop_propietario', 'Propietario del inmueble'), c('sitio_inicio', 'Sitio donde principió'), c('causas', 'Causas'),
        c('valor_inmueble', 'Valor aproximado del inmueble'), c('perdidas_inmueble', 'Pérdidas del inmueble'),
        c('aseguradora_inmueble', 'Aseguradora del inmueble'),
        c('veh_propietario', 'Propietario del vehículo'), c('conductor', 'Conductor'), c('descripcion_tipo', 'Tipo de vehículo'),
        c('marca', 'Marca'), c('modelo', 'Modelo'), c('placas', 'Placas'),
        c('valor_vehiculo', 'Valor del vehículo'), c('perdidas_vehiculo', 'Pérdidas del vehículo'),
        c('aseguradora_vehiculo', 'Aseguradora del vehículo'),
        c('responsable', 'Responsable'), c('jefes_servicio', 'Jefes de servicio')],
    rescate: [...COMUNES, ...UNIDAD,
        c('forma_aviso', 'Forma de aviso'), c('nombres_rescatados', 'Nombre de los rescatados'),
        c('edades', 'Edades'), c('domicilios', 'Domicilios'), c('traslado_a', 'Traslado a'),
        ...FIRMAS],
    varios: [...COMUNES, ...UNIDAD, c('clase_servicio', 'Clase de servicio'), ...FIRMAS],
    agua: [...COMUNES, ...UNIDAD,
        c('destino', 'Residencia, establecimiento, centro asistencial o colonia', ['residencia', 'nombre_establecimiento', 'centro_asistencial', 'colonia']),
        c('servicio_autorizado_por', 'Servicio autorizado por'), c('galones_distribuidos', 'Galones distribuidos'),
        c('forma_distribucion', 'Forma en que se distribuyó'), c('donativo', 'Donativo'), c('nota', 'Nota'),
        ...FIRMAS]
};

const MOTIVOS = {
    entrada: {
        envio_capital: 'Envío de la capital',
        compra: 'Compra',
        donacion: 'Donación',
        inventario_inicial: 'Inventario inicial',
        ajuste: 'Ajuste (conteo físico)'
    },
    salida: {
        entrega_escuadra: 'Entrega por vale a escuadra',
        consumo_servicio: 'Consumo en servicio',
        uso_interno: 'Uso interno',
        baja_vencimiento: 'Baja por vencimiento',
        baja_dano: 'Baja por daño o pérdida',
        ajuste: 'Ajuste (conteo físico)'
    }
};

// Salidas que representan uso real (para consumo promedio y reabastecimiento)
const MOTIVOS_CONSUMO = ['entrega_escuadra', 'consumo_servicio', 'uso_interno'];

// Clase de insumo: el equipo no se consume ni lleva lote; el consumible con
// vencimiento exige lote y fecha al entrar (RN-07)
const CLASES_INSUMO = {
    consumible_vence: 'Consumible con vencimiento',
    consumible: 'Consumible',
    equipo: 'Equipo'
};

// Documentos de inventario y su prefijo de numeración
const DOCUMENTOS = {
    entrada: { nombre: 'Entrada', prefijo: 'E' },
    vale: { nombre: 'Vale de entrega', prefijo: 'V' },
    baja: { nombre: 'Baja', prefijo: 'B' },
    ajuste: { nombre: 'Ajuste por conteo', prefijo: 'A' }
};
const ORIGENES_ENTRADA = { envio_capital: 'Envío de la capital', compra: 'Compra del comité', donacion: 'Donación', inventario_inicial: 'Inventario inicial' };

const CATEGORIAS = {
    prehospitalario: 'Prehospitalario',
    cafeteria: 'Cafetería',
    libreria: 'Librería',
    limpieza: 'Limpieza'
};

const TIPOS_SECTOR = {
    zona: 'Zona', barrio: 'Barrio', colonia: 'Colonia',
    aldea: 'Aldea', caserio: 'Caserío', otro: 'Otro'
};

module.exports = {
    TIPOS_SERVICIO, SUBTIPOS, ESTADOS_BOLETA, ESTADOS_CONTABLES, ESTADOS_UNIDAD, PREFIJOS_CONTROL, CAMPOS_BOLETA,
    MOTIVOS, MOTIVOS_CONSUMO, CLASES_INSUMO, DOCUMENTOS, ORIGENES_ENTRADA, CATEGORIAS, TIPOS_SECTOR
};
