// ═══════════════════════════════════════════════════════════════
// DATOS SIMULADOS PARA PRUEBAS
//   Genera ~6 meses de operación realista de la 39ª Compañía:
//   sectores, personal, unidades, turnos de 24 h, boletas de los 5 tipos,
//   inventario por lote (FEFO), compras, uso interno, bajas, anulaciones,
//   control de impresión. Sigue el modelo de la entrevista: escuadras con
//   turnos de 24 h que cambian a las 8:00, número de control asignado en el
//   orden de regreso, tripulación por boleta y estados del ciclo de vida.
//   Todo el personal simulado tiene el PIN 1234 (solo para pruebas).
//
//   npm run simular               → solo si la base no tiene boletas
//   npm run simular -- --reiniciar → borra la operación y vuelve a generar
//                                    (conserva usuarios y el catálogo de insumos)
//
//   Las salidas usan el mismo servicio de inventario que la aplicación,
//   así se respetan lotes, FEFO y existencias.
// ═══════════════════════════════════════════════════════════════
const { pool } = require('../config/database');
const bcrypt = require('bcrypt');
const { SUBTIPOS, CAMPOS_BOLETA } = require('../config/dominio');
const { hoyGuatemala, sumarDias } = require('../utils/comun');
const { ErrorNegocio, registrarEntrada, registrarSalida, anularMovimiento } = require('../services/inventarioService');

const INICIO = '2026-04-01';
const ESTACION = 'Estación 39ª Compañía';

// ── Azar reproducible ─────────────────────────────────────────
let semilla = 39039;
const azar = () => {
    semilla = (semilla * 1664525 + 1013904223) % 4294967296;
    return semilla / 4294967296;
};
const entre = (a, b) => a + Math.floor(azar() * (b - a + 1));
const uno = (lista) => lista[Math.floor(azar() * lista.length)];
const prob = (p) => azar() < p;
const ponderado = (pesos) => {
    const total = Object.values(pesos).reduce((s, v) => s + v, 0);
    let r = azar() * total;
    for (const [k, v] of Object.entries(pesos)) { if ((r -= v) <= 0) return k; }
    return Object.keys(pesos)[0];
};
const poisson = (l) => { let k = 0, p = 1; const L = Math.exp(-l); do { k++; p *= azar(); } while (p > L); return k - 1; };
const hhmm = (min) => `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

// ── Catálogos ─────────────────────────────────────────────────
// peso = qué tanto genera emergencias (define los puntos calientes del análisis de zonas)
const SECTORES = [
    ['Zona 1 (Centro)', 'zona', 'Parque central, mercado municipal, catedral', 14],
    ['Zona 2', 'zona', 'Salida a Esquipulas', 6],
    ['Zona 3', 'zona', 'Terminal de buses', 8],
    ['Zona 4', 'zona', null, 5],
    ['Zona 5', 'zona', null, 4],
    ['Barrio El Molino', 'barrio', 'Junto al río Tacó', 6],
    ['Barrio La Democracia', 'barrio', null, 5],
    ['Barrio San Antonio', 'barrio', null, 3],
    ['Colonia El Zapotillo', 'colonia', null, 5],
    ['Colonia Las Victorias', 'colonia', null, 3],
    ['Colonia Bethania', 'colonia', null, 2],
    ['Colonia El Maestro', 'colonia', null, 2],
    ['Ruta CA-10 (Chiquimula–Vado Hondo)', 'otro', 'Tramo carretero de alta siniestralidad', 9],
    ['Aldea Vado Hondo', 'aldea', 'Cruce a Esquipulas y Zacapa', 4],
    ['Aldea Petapilla', 'aldea', null, 3],
    ['Aldea Maraxcó', 'aldea', null, 3],
    ['Aldea San Esteban', 'aldea', null, 3],
    ['Aldea Sabana Grande', 'aldea', null, 2],
    ['Aldea El Ingeniero', 'aldea', null, 2],
    ['Aldea Santa Bárbara', 'aldea', null, 2],
    ['Aldea Shusho Arriba', 'aldea', null, 2],
    ['Aldea Conacaste', 'aldea', null, 1],
    ['Caserío Los Planes', 'caserio', null, 1],
    ['Colonia Pradera', 'colonia', 'Entrada a Pradera', 5]
];

// Puntos concretos que la compañía ya reconoce como críticos (entrevista 1:00:32)
const LUGARES = [
    ['Entrada a la colonia Pradera', 'Colonia Pradera', 'entrada a pradera, ingreso a pradera'],
    ['Curva del puente Tacó', 'Barrio El Molino', 'puente taco, curva del rio'],
    ['Kilómetro 174, cruce a Vado Hondo', 'Ruta CA-10 (Chiquimula–Vado Hondo)', 'km 174, cruce vado hondo'],
    ['Terminal de buses', 'Zona 3', 'terminal']
];

const PERSONAL = [
    ['Carlos Enrique Morales Paiz', 'Jefe de servicio'], ['Marvin Estuardo Cordón Lemus', 'Jefe de servicio'],
    ['Edgar Rolando Guerra Sagastume', 'Jefe de servicio'],
    ['Ana Lucía Pinto Vásquez', 'Radiotelefonista'], ['Luis Fernando Castillo Ramos', 'Radiotelefonista'],
    ['Wendy Paola Aldana Cerna', 'Radiotelefonista'],
    ['José Manuel Lemus Portillo', 'Piloto'], ['Erick Rodrigo Interiano Díaz', 'Piloto'],
    ['Byron Alexander Súchite Pérez', 'Piloto'], ['Mario René Galdámez Ortiz', 'Piloto'],
    ['Kevin Josué Ramírez Monroy', 'Piloto'],
    ['Sofía Alejandra Monroy Linares', 'Paramédico'], ['Diego Armando Pérez Villeda', 'Paramédico'],
    ['Gerson Iván Vásquez Recinos', 'Paramédico'], ['María José Sagastume Franco', 'Paramédico'],
    ['Julio César Franco Espino', 'Bombero'], ['Héctor Daniel Recinos Peña', 'Bombero'],
    ['Oscar Leonel Villeda Torres', 'Bombero'], ['Brenda Yesenia Cerna Aldana', 'Bombero'],
    ['Jonathan Eduardo Torres Guzmán', 'Bombero'], ['Selvin Omar Espino Chacón', 'Bombero']
];

// código, descripción, piloto, tipos que atiende, estado
// 3 unidades en servicio y 2 de reposición (entrevista 18:49)
const UNIDADES = [
    ['1151', 'Ambulancia Toyota Hiace 2019', 'José Manuel Lemus Portillo', ['ambulancia', 'rescate', 'varios'], 'servicio'],
    ['1314', 'Ambulancia Nissan Urvan 2015', 'Erick Rodrigo Interiano Díaz', ['ambulancia', 'rescate', 'varios'], 'servicio'],
    ['1208', 'Ambulancia Toyota Hiace 2012', 'Kevin Josué Ramírez Monroy', ['ambulancia', 'varios'], 'servicio'],
    ['1097', 'Ambulancia Ford E-350 2009', 'Kevin Josué Ramírez Monroy', [], 'reposicion'],
    ['1042', 'Ambulancia Toyota Hiace 2008', 'Mario René Galdámez Ortiz', [], 'taller'],
    ['MB-01', 'Motobomba International 4900', 'Byron Alexander Súchite Pérez', ['incendio'], 'servicio'],
    ['CT-01', 'Unidad de agua Freightliner 2,000 galones', 'Mario René Galdámez Ortiz', ['agua', 'incendio'], 'servicio'],
    ['R-01', 'Unidad de rescate Toyota Hilux', 'Kevin Josué Ramírez Monroy', ['rescate'], 'servicio']
];

// Tres escuadras que rotan cada 24 h (cambio a las 8:00)
const GRUPOS = [
    { escuadra: 'Escuadra A', radio: 'Ana Lucía Pinto Vásquez', jefe: 'Carlos Enrique Morales Paiz',
        gente: ['José Manuel Lemus Portillo', 'Byron Alexander Súchite Pérez', 'Sofía Alejandra Monroy Linares', 'Julio César Franco Espino', 'Héctor Daniel Recinos Peña'] },
    { escuadra: 'Escuadra B', radio: 'Luis Fernando Castillo Ramos', jefe: 'Marvin Estuardo Cordón Lemus',
        gente: ['Erick Rodrigo Interiano Díaz', 'Mario René Galdámez Ortiz', 'Diego Armando Pérez Villeda', 'Oscar Leonel Villeda Torres', 'Brenda Yesenia Cerna Aldana'] },
    { escuadra: 'Escuadra C', radio: 'Wendy Paola Aldana Cerna', jefe: 'Edgar Rolando Guerra Sagastume',
        gente: ['Kevin Josué Ramírez Monroy', 'Gerson Iván Vásquez Recinos', 'María José Sagastume Franco', 'Jonathan Eduardo Torres Guzmán', 'Selvin Omar Espino Chacón'] }
];

// ── Generadores de texto ──────────────────────────────────────
const NOMBRES_H = ['José', 'Juan', 'Luis', 'Carlos', 'Mario', 'Pedro', 'Jorge', 'Marvin', 'Edwin', 'Óscar', 'Rony', 'Wilson', 'Selvin', 'Byron', 'Elmer', 'Santos', 'Francisco', 'Miguel'];
const NOMBRES_M = ['María', 'Ana', 'Rosa', 'Marta', 'Gloria', 'Sandra', 'Karla', 'Lesly', 'Yesenia', 'Dora', 'Elvia', 'Cindy', 'Ingrid', 'Blanca', 'Olga', 'Juana'];
const APELLIDOS = ['López', 'García', 'Pérez', 'Ramírez', 'Morales', 'Ramos', 'Lemus', 'Guerra', 'Sagastume', 'Cerna', 'Portillo', 'Vásquez', 'Interiano', 'Súchite', 'Aldana', 'Paiz', 'Espino', 'Chacón', 'Villeda', 'Recinos', 'Pinto', 'Linares', 'Guzmán', 'Díaz'];
const persona = () => `${prob(0.5) ? uno(NOMBRES_H) : uno(NOMBRES_M)} ${uno(APELLIDOS)} ${uno(APELLIDOS)}`;
const telefono = () => `${prob(0.2) ? '7942' : uno(['3', '4', '5']) + entre(100, 999)}-${String(entre(0, 9999)).padStart(4, '0')}`;

const direccionEn = (sector, tipo) => {
    if (tipo === 'otro') return `Kilómetro ${entre(169, 182)}, ${sector}`;
    if (tipo === 'zona' || tipo === 'barrio' || tipo === 'colonia') {
        const via = uno(['calle', 'avenida']);
        return `${entre(1, 12)}a. ${via} ${entre(1, 14)}-${String(entre(1, 80)).padStart(2, '0')}, ${sector}`;
    }
    return `${uno(['Frente a la escuela', 'A un costado de la iglesia', 'Cerca de la cancha', 'Entrada principal', 'Por la tienda', 'Calle principal'])}, ${sector}`;
};

const LETRAS = { 50: 'Cincuenta', 100: 'Cien', 150: 'Ciento cincuenta', 200: 'Doscientos', 250: 'Doscientos cincuenta', 300: 'Trescientos', 500: 'Quinientos' };

// ── Comportamiento por tipo ───────────────────────────────────
// mes 4-5 = verano (incendios forestales y escasez de agua); 6-10 = invierno (lluvias)
const pesosTipo = (mes) => ({
    ambulancia: 56,
    incendio: mes <= 5 ? 16 : 6,
    rescate: 8,
    varios: mes >= 6 ? 15 : 9,
    agua: mes <= 5 ? 16 : 6
});

const pesosSubtipo = (tipo, mes, sectorTipo) => {
    const rural = ['aldea', 'caserio'].includes(sectorTipo);
    const carretera = sectorTipo === 'otro';
    return {
        ambulancia: { accidente_moto: carretera ? 40 : 15, accidente_vehiculo: carretera ? 30 : 7, atropello: carretera ? 6 : 4, accidente_trabajo: 6, maternidad: rural ? 14 : 9, enfermedad_comun: 24, caida: 12, herida_arma: 4, intoxicacion: 4, traslado_programado: 8, otro: 2 },
        incendio: { estructural: rural ? 10 : 25, vehicular: carretera ? 60 : 10, forestal: mes <= 5 ? (rural ? 55 : 20) : 4, basura: 22, electrico: 10, otro: 3 },
        rescate: { vehicular: carretera ? 60 : 15, acuatico: mes >= 6 ? 14 : 4, altura: 12, estructura: 4, animal: 18, busqueda: 6, otro: 3 },
        varios: { falsa_alarma: 9, sin_traslado: 14, insectos: 20, arbol_caido: mes >= 6 ? 24 : 6, fuga_gas: 8, inundacion: mes >= 6 ? 18 : 1, prevencion: 12, apoyo_institucional: 10, limpieza_via: carretera ? 30 : 8, otro: 3 },
        agua: { domicilio: 30, centro_asistencial: 10, establecimiento: 15, comunidad: rural ? 45 : 15, otro: 3 }
    }[tipo];
};

const DURACION = {
    ambulancia: [30, 110], incendio: [40, 200], rescate: [35, 160], varios: [20, 100], agua: [60, 170]
};

const OBSERVACIONES = {
    accidente_moto: ['Colisión entre motocicleta y pickup', 'Motorista derrapó en curva', 'Motocicleta impactó contra poste'],
    accidente_vehiculo: ['Volcadura de vehículo liviano', 'Choque entre camión y automóvil', 'Colisión de bus extraurbano'],
    atropello: ['Atropello de peatón en la vía', 'Peatón atropellado por motocicleta'],
    falsa_alarma: ['Se reportó accidente; al llegar no había servicio', 'Llamada sin emergencia en el lugar'],
    sin_traslado: ['Paciente valorado en el lugar; no requirió traslado', 'Atención prehospitalaria sin traslado'],
    accidente_trabajo: ['Trabajador cayó de andamio', 'Herida cortante con machete en labores agrícolas', 'Golpe con material de construcción'],
    maternidad: ['Paciente en labor de parto activo', 'Embarazo de 38 semanas con contracciones', 'Ruptura de membranas'],
    enfermedad_comun: ['Dificultad respiratoria', 'Dolor abdominal agudo', 'Hipertensión descompensada', 'Hiperglucemia en paciente diabético', 'Desmayo en vía pública', 'Fiebre alta y deshidratación'],
    caida: ['Adulto mayor cayó en su domicilio', 'Caída de su propia altura con trauma en cadera', 'Niño cayó de árbol'],
    herida_arma: ['Herida por arma blanca en riña', 'Herida por arma de fuego en extremidad'],
    intoxicacion: ['Intoxicación por plaguicida', 'Intoxicación alcohólica', 'Ingesta de medicamentos'],
    traslado_programado: ['Traslado para hemodiálisis', 'Traslado a consulta de especialidad', 'Traslado de paciente referido'],
    estructural: ['Incendio en cocina de vivienda', 'Incendio en local comercial', 'Fuego en bodega de materiales'],
    vehicular: ['Vehículo en llamas en carretera', 'Incendio en motor de bus extraurbano'],
    forestal: ['Incendio de maleza en ladera', 'Incendio forestal por quema agrícola', 'Fuego en potrero'],
    basura: ['Quema de basura fuera de control', 'Incendio en basurero clandestino'],
    electrico: ['Cortocircuito en poste de tendido eléctrico', 'Transformador en llamas'],
    acuatico: ['Persona arrastrada por la corriente del río', 'Menor en dificultades en poza'],
    altura: ['Persona atrapada en barranco', 'Trabajador atrapado en techo'],
    estructura: ['Colapso parcial de muro de adobe'],
    animal: ['Gato atrapado en árbol', 'Perro caído en pozo', 'Ganado atascado en zanja'],
    busqueda: ['Búsqueda de adulto mayor extraviado'],
    insectos: ['Enjambre de abejas en vivienda', 'Panal de avispas en escuela'],
    arbol_caido: ['Árbol caído obstruyendo la vía', 'Rama sobre tendido eléctrico'],
    fuga_gas: ['Fuga en cilindro de gas propano'],
    inundacion: ['Vivienda inundada por lluvias', 'Desbordamiento de quebrada'],
    prevencion: ['Cobertura preventiva en feria', 'Prevención en actividad deportiva', 'Cobertura en procesión'],
    apoyo_institucional: ['Apoyo a la PNC', 'Apoyo a CONRED en evaluación de daños', 'Apoyo a la municipalidad'],
    limpieza_via: ['Limpieza de combustible derramado en la vía', 'Retiro de derrumbe menor'],
    domicilio: ['Abastecimiento de agua a vivienda'],
    centro_asistencial: ['Abastecimiento de agua a centro de salud'],
    establecimiento: ['Abastecimiento de agua a escuela'],
    comunidad: ['Distribución de agua a la comunidad por escasez'],
    otro: ['Servicio atendido sin novedad']
};

// insumo → probabilidad y cantidad según la clasificación del caso
const CONSUMO = {
    trauma: [['Guantes Wolf talla M', 0.12, 1, 1], ['Venda gasa 4x10 Prosan', 0.7, 1, 3], ['Compresa quirúrgica 12"x12"', 0.5, 1, 2],
        ['Bolsa de solución salina', 0.45, 1, 2], ['Venoset', 0.4, 1, 1], ['Catéter #20', 0.4, 1, 1], ['Esparadrapo', 0.25, 1, 1],
        ['Venda elástica', 0.3, 1, 2], ['Agua oxigenada 480 ml', 0.15, 1, 1], ['Solución Hartmann 500ml', 0.25, 1, 1]],
    clinico: [['Guantes Wolf talla M', 0.08, 1, 1], ['Bolsa de solución salina', 0.35, 1, 1], ['Venoset', 0.3, 1, 1],
        ['Catéter #20', 0.3, 1, 1], ['Microporous / Micropore', 0.3, 1, 1], ['Algodón', 0.1, 1, 1]],
    maternidad: [['Batas hospitalarias', 0.3, 1, 1], ['Compresa quirúrgica 12"x12"', 0.6, 1, 3], ['Guantes Wolf talla S', 0.2, 1, 1],
        ['Bolsa de solución Hartman', 0.4, 1, 1]],
    leve: [['Venda gasa 4x10 absorbente', 0.3, 1, 1], ['Bolsa de solución salina', 0.15, 1, 1], ['Guantes Wolf talla L', 0.05, 1, 1]]
};
const perfilConsumo = (tipo, sub) => {
    if (tipo === 'ambulancia') {
        if (['accidente_moto', 'accidente_vehiculo', 'atropello', 'accidente_trabajo', 'caida', 'herida_arma'].includes(sub)) return 'trauma';
        if (sub === 'maternidad') return 'maternidad';
        return 'clinico';
    }
    if (tipo === 'rescate') return ['vehicular', 'altura', 'estructura'].includes(sub) ? 'trauma' : 'leve';
    if (tipo === 'incendio') return prob(0.3) ? 'leve' : null;
    return null;
};

// ── Detalle por tipo (como lo guarda el formulario por pasos) ──
const detalleDe = (tipo, sub, ctx) => {
    const nombreSub = SUBTIPOS[tipo][sub];
    const obs = ctx.observaciones;
    if (tipo === 'ambulancia') {
        const transito = ['accidente_moto', 'accidente_vehiculo', 'atropello'].includes(sub);
        const n = transito && prob(0.35) ? 2 : 1;
        const pacientes = Array.from({ length: n }, () => persona());
        const edades = pacientes.map(() => sub === 'maternidad' ? entre(17, 38) : sub === 'caida' && prob(0.5) ? entre(65, 90) : entre(4, 78));
        const d = {
            nombres_pacientes: pacientes.join('; '), edades: edades.join('; '),
            domicilios: pacientes.map(() => ctx.sector).join('; '),
            acompanantes: prob(0.6) ? persona() : null,
            hubo_fallecidos: false, fallecidos: null
        };
        const casilla = { maternidad: 'serv_maternidad', accidente_moto: 'acc_transito', accidente_vehiculo: 'acc_transito', atropello: 'acc_transito', accidente_trabajo: 'acc_trabajo' }[sub] || 'otros';
        d[casilla] = casilla === 'otros' ? `${nombreSub}: ${obs}` : obs;
        if (sub === 'traslado_programado') d.otro_traslado = uno(['Hospital Roosevelt, Guatemala', 'Hospital San Juan de Dios, Guatemala', 'Hospital de Zacapa']);
        else {
            const destino = ponderado({ modular: 70, igss: 18, privado: 8, ninguno: 4 });
            if (destino === 'modular') d.hosp_modular = 'X';
            if (destino === 'igss') d.hosp_igss = 'X';
            if (destino === 'privado') d.hosp_privado = uno(['Sanatorio privado San José', 'Centro Médico de Oriente']);
        }
        if (transito && prob(0.03)) {
            d.hubo_fallecidos = true;
            d.fallecidos = pacientes[0];
        }
        return d;
    }
    if (tipo === 'incendio') {
        const d = { causas: sub === 'forestal' ? uno(['Quema de basura', 'Descuido humano', 'En investigación']) : sub === 'electrico' ? 'Cortocircuito' : uno(['Cortocircuito', 'Descuido humano', 'Fuga de gas', 'Quema de basura', 'En investigación']) };
        if (['estructural', 'electrico'].includes(sub)) {
            const valor = entre(8, 60) * 5000;
            Object.assign(d, {
                prop_propietario: persona(), sitio_inicio: uno(['Cocina', 'Dormitorio', 'Bodega', 'Sala', 'Área de medidores']),
                valor_inmueble: valor, perdidas_inmueble: Math.round(valor * entre(5, 45) / 100), aseguradora_inmueble: prob(0.15) ? 'Seguros El Roble' : null
            });
        } else if (sub === 'vehicular') {
            const marca = uno([['Toyota', 'Hilux'], ['Nissan', 'Frontier'], ['Mazda', 'BT-50'], ['Honda', 'Civic'], ['Isuzu', 'NPR']]);
            const valor = entre(6, 30) * 5000;
            Object.assign(d, {
                veh_propietario: persona(), conductor: persona(), descripcion_tipo: marca[1] === 'NPR' ? 'Camión' : uno(['Pickup', 'Automóvil']),
                marca: marca[0], modelo: marca[1], placas: `${uno(['P', 'C', 'M'])}-${entre(100, 999)}${uno(['BCD', 'FGH', 'JKL', 'DTR', 'GWZ'])}`,
                valor_vehiculo: valor, perdidas_vehiculo: Math.round(valor * entre(20, 90) / 100)
            });
        } else {
            d.sitio_inicio = sub === 'forestal' ? uno(['Ladera del cerro', 'Potrero', 'Terreno baldío']) : 'Terreno baldío';
        }
        return d;
    }
    if (tipo === 'rescate') {
        const n = sub === 'animal' ? 0 : 1;
        const nombres = Array.from({ length: n }, () => persona());
        return {
            nombres_rescatados: n ? nombres.join('; ') : null, edades: n ? String(entre(6, 70)) : null,
            domicilios: n ? ctx.sector : null,
            traslado_a: n ? (prob(0.6) ? 'Hospital Modular' : 'No requirió traslado') : null,
            forma_aviso: ponderado({ 'Teléfono': 60, 'Radio': 10, 'Personalmente': 12, 'PNC': 12, 'Otra institución': 6 })
        };
    }
    if (tipo === 'varios') return { clase_servicio: `${nombreSub}: ${obs}` };
    // agua
    const campo = { domicilio: 'residencia', establecimiento: 'nombre_establecimiento', centro_asistencial: 'centro_asistencial', comunidad: 'colonia' }[sub];
    const d = {
        galones_distribuidos: entre(2, 20) * 100, servicio_autorizado_por: ctx.jefe,
        forma_distribucion: uno(['Cisterna a depósito', 'Toneles', 'Directo a tinaco', 'Por cubetas'])
    };
    if (campo) d[campo] = { residencia: persona(), nombre_establecimiento: uno(['Escuela Oficial Rural Mixta', 'Instituto Nacional de Educación Básica', 'Mercado municipal']), centro_asistencial: uno(['Centro de Salud de Chiquimula', 'Puesto de Salud']), colonia: ctx.sector }[campo];
    else d.nota = obs;
    if (sub === 'domicilio' || prob(0.3)) {
        const monto = uno([50, 100, 150, 200, 250, 300, 500]);
        d.donativo = monto;
        d.donativo_letras = `${LETRAS[monto]} quetzales exactos`;
    }
    return d;
};

const TABLA_DETALLE = { ambulancia: 'detalle_ambulancia', incendio: 'detalle_incendio', rescate: 'detalle_rescate', varios: 'detalle_varios', agua: 'detalle_agua' };
const PREFIJO = { ambulancia: 'AMB', incendio: 'INC', rescate: 'RES', varios: 'VAR', agua: 'AGU' };

// ═══════════════════════════════════════════════════════════════
const main = async () => {
    const reiniciar = process.argv.includes('--reiniciar');
    const db = await pool.connect();

    // La bitácora toma la hora del servidor; se reubica en la fecha simulada
    const fecharBitacora = async (ts, fn) => {
        const antes = (await db.query('SELECT COALESCE(MAX(id), 0) AS m FROM bitacora')).rows[0].m;
        const r = await fn();
        await db.query('UPDATE bitacora SET creado_en = $1 WHERE id > $2', [ts, antes]);
        return r;
    };

    try {
        const existentes = (await db.query('SELECT COUNT(*)::int AS n FROM emergencias')).rows[0].n;
        if (existentes && !reiniciar) {
            console.log(`La base ya tiene ${existentes} boletas. Use "npm run simular -- --reiniciar" para borrar la operación y regenerar.`);
            return;
        }

        await db.query('BEGIN');
        if (reiniciar) {
            await db.query(`TRUNCATE bitacora, movimientos_inventario, documentos_inventario, cierres_mensuales, consumos_servicio, lotes, certificaciones, boleta_tripulacion,
                detalle_ambulancia, detalle_incendio, detalle_rescate, detalle_varios, detalle_agua,
                emergencias, turnos, unidades, personal, escuadras, lugares_criticos, sectores RESTART IDENTITY CASCADE`);
            await db.query('UPDATE insumos SET stock_actual = 0');
        }

        const usuarios = (await db.query(`SELECT id, rol FROM usuarios WHERE activo ORDER BY id`)).rows;
        const admin = usuarios.find(u => u.rol === 'administrador').id;
        const operativo = (usuarios.find(u => u.rol === 'operativo') || { id: admin }).id;

        // ── Catálogos ─────────────────────────────────────────
        const sectores = [];
        for (const [nombre, tipo, referencias, peso] of SECTORES) {
            const r = await db.query('INSERT INTO sectores (nombre, tipo, referencias, creado_en) VALUES ($1, $2, $3, $4) RETURNING id',
                [nombre, tipo, referencias, `${INICIO} 08:00`]);
            sectores.push({ id: r.rows[0].id, nombre, tipo, peso });
        }
        const lugares = [];
        for (const [nombre, sectorNombre, referencias] of LUGARES) {
            const sec = sectores.find(x => x.nombre === sectorNombre);
            const r = await db.query('INSERT INTO lugares_criticos (sector_id, nombre, referencias, creado_en) VALUES ($1, $2, $3, $4) RETURNING id',
                [sec.id, nombre, referencias, `${INICIO} 08:00`]);
            lugares.push({ id: r.rows[0].id, sector_id: sec.id });
        }
        for (const g of GRUPOS) {
            g.escuadra_id = (await db.query('INSERT INTO escuadras (nombre, creado_en) VALUES ($1, $2) RETURNING id', [g.escuadra, `${INICIO} 08:00`])).rows[0].id;
        }
        const escuadraDe = (nombre) => GRUPOS.find(g => [g.radio, g.jefe, ...g.gente].includes(nombre))?.escuadra_id || null;
        const pinPrueba = await bcrypt.hash('1234', 10);
        const idPersonal = {};
        for (const [nombre, cargo] of PERSONAL) {
            const r = await db.query(`INSERT INTO personal (nombre_completo, cargo, escuadra_id, es_piloto, pin_hash, creado_en)
                VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`, [nombre, cargo, escuadraDe(nombre), cargo === 'Piloto', pinPrueba, `${INICIO} 08:00`]);
            idPersonal[nombre] = r.rows[0].id;
        }
        const unidades = [];
        for (const [codigo, descripcion, piloto, tipos, estado] of UNIDADES) {
            const r = await db.query('INSERT INTO unidades (codigo, descripcion, piloto_id, estado, servicios, creado_en) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
                [codigo, descripcion, idPersonal[piloto], estado, tipos, `${INICIO} 08:00`]);
            unidades.push({ id: r.rows[0].id, codigo, piloto, tipos });
        }

        const insumos = (await db.query('SELECT id, nombre, categoria, stock_minimo, unidad_medida FROM insumos WHERE activo ORDER BY id')).rows;
        const porNombre = Object.fromEntries(insumos.map(i => [i.nombre, i]));
        const EQUIPO = /Glucómetro|Estetoscopio|Esfigmomanómetro|Traje overol|Escobas|Pala|Botes|Palos/;

        // ── Inventario inicial (1 de abril) ───────────────────
        let nLote = 1;
        const lote = (fecha) => `L${fecha.slice(2, 4)}${fecha.slice(5, 7)}-${String(nLote++).padStart(4, '0')}`;
        const vence = (fecha, i) => {
            if (EQUIPO.test(i.nombre)) return null;
            if (i.categoria === 'libreria') return null;
            return sumarDias(fecha, entre(i.categoria === 'cafeteria' ? 90 : 240, i.categoria === 'cafeteria' ? 240 : 760));
        };
        // Documentos de inventario: constancia de ingreso, vale, baja (entrevista 00:42 y 01:41)
        const secDoc = {};
        const documento = async (tipo, fecha, extra = {}) => {
            const anio = Number(fecha.slice(0, 4));
            secDoc[tipo + anio] = (secDoc[tipo + anio] || 0) + 1;
            const numero = `${{ entrada: 'E', vale: 'V', baja: 'B', ajuste: 'A' }[tipo]}-${anio}-${String(secDoc[tipo + anio]).padStart(4, '0')}`;
            const d = await db.query(`INSERT INTO documentos_inventario (tipo, numero, secuencia, anio, fecha, categoria, origen, donante,
                constancia, escuadra_id, recibe_id, entrega, observaciones, usuario_id, creado_en)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING id`,
                [tipo, numero, secDoc[tipo + anio], anio, fecha, extra.categoria || null, extra.origen || null, extra.donante || null,
                    extra.constancia || null, extra.escuadra_id || null, extra.recibe_id || null, extra.entrega || null,
                    extra.observaciones || null, admin, `${fecha} ${extra.hora || '09:00'}`]);
            return { id: d.rows[0].id, numero };
        };
        const entrada = (i, fecha, cantidad, motivo, extra = {}) =>
            registrarEntrada(db, {
                insumo_id: i.id, cantidad, motivo, fecha_movimiento: fecha,
                numero_lote: lote(fecha), fecha_vencimiento: extra.vencimiento !== undefined ? extra.vencimiento : vence(fecha, i),
                documento: extra.doc?.numero || null, documento_id: extra.doc?.id || null, observaciones: extra.observaciones || null
            }, admin);

        await fecharBitacora(`${INICIO} 09:00`, async () => {
            const doc = await documento('entrada', INICIO, { origen: 'inventario_inicial', constancia: 'Conteo físico inicial' });
            for (const i of insumos) {
                const base = i.categoria === 'prehospitalario' ? i.stock_minimo * entre(3, 5) : i.stock_minimo * entre(2, 4);
                await entrada(i, INICIO, base, 'inventario_inicial', { doc });
            }
            // Lotes antiguos: uno se da de baja al vencer y otro sigue vencido en bodega (alerta)
            await entrada(porNombre['Galón de clorhexidina 5%'], INICIO, 3, 'inventario_inicial', { vencimiento: '2026-07-31', doc, observaciones: 'Lote antiguo de donación' });
            await entrada(porNombre['Venoset'], INICIO, 10, 'inventario_inicial', { vencimiento: '2026-04-20', doc, observaciones: 'Encontrado en bodega, por vencer' });
            await entrada(porNombre['Agua oxigenada 960 ml'], INICIO, 6, 'inventario_inicial', { vencimiento: '2026-09-30', doc });
        });
        // Lo usado en servicios desde el último vale: el vale semanal lo repone
        const usoPendiente = {};

        // ── Simulación día a día ──────────────────────────────
        const hoy = hoyGuatemala();
        const ahoraGt = new Date(Date.now() - 6 * 3600 * 1000);
        const minutoAhora = ahoraGt.getUTCHours() * 60 + ahoraGt.getUTCMinutes();
        const PESO_HORA = [1, 1, 1, 1, 1, 2, 3, 4, 5, 5, 5, 6, 6, 6, 7, 7, 7, 7, 8, 8, 6, 4, 3, 2];
        const telefonosFrecuentes = Array.from({ length: 35 }, () => ({ tel: telefono(), nombre: persona(), sector: null }));
        // Compra de septiembre y octubre atrasada para estos insumos: deben quedar bajos o agotados
        const SIN_COMPRA = ['Bolsa de solución salina', 'Venda gasa 4x10 Prosan', 'Guantes Wolf talla M', 'Esparadrapo', 'Bolsa de azúcar', 'Nescafé'];
        const totales = { boletas: 0, anuladas: 0, enCurso: 0, salidas: 0, sinExistencia: 0, compras: 0 };

        let turno = null;
        for (let fecha = INICIO; fecha <= hoy; fecha = sumarDias(fecha, 1)) {
            const mes = Number(fecha.slice(5, 7));
            const dia = Number(fecha.slice(8, 10));
            const finde = [0, 6].includes(new Date(fecha + 'T12:00:00Z').getUTCDay());
            const g = GRUPOS[Math.round((new Date(fecha) - new Date(INICIO)) / 86400000) % 3];

            // Servicios del día; los de antes de las 08:00 pertenecen al turno que viene del día anterior
            const lluvia = mes >= 6 ? 1.15 : 1;
            const n = poisson(2.1 * (finde ? 1.3 : 1) * lluvia * (mes <= 5 ? 1.1 : 1));
            const horas = Array.from({ length: n }, () => Number(ponderado(Object.fromEntries(PESO_HORA.map((p, h) => [h, p])))) * 60 + entre(0, 59));
            if (fecha === hoy && minutoAhora >= 480) horas.push(minutoAhora - 50); // unidad fuera ahora mismo
            horas.sort((a, b) => a - b);
            for (const inicio of horas.filter(h => h < 480)) await atender(fecha, mes, inicio);

            // Turno 08:00 → 08:00 del día siguiente (entrevista 16:45)
            if (fecha < hoy || minutoAhora >= 480) {
                const usuario = g === GRUPOS[0] ? admin : operativo;
                turno = await fecharBitacora(`${fecha} 08:05`, async () => {
                    if (turno) await db.query('UPDATE turnos SET fin = $1, cerrado_por = $2 WHERE id = $3', [`${fecha} 08:00`, usuario, turno.id]);
                    const r = await db.query(`INSERT INTO turnos (inicio, radiotelefonista, jefe_servicio, personal, usuario_id, escuadra_id)
                        VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`, [`${fecha} 08:00`, g.radio, g.jefe, g.gente, usuario, g.escuadra_id]);
                    await db.query(`INSERT INTO bitacora (usuario_id, accion, entidad, entidad_id, detalle) VALUES ($1, 'crear', 'turno', $2, $3)`,
                        [usuario, r.rows[0].id, JSON.stringify({ radiotelefonista: g.radio, jefe_servicio: g.jefe })]);
                    return { id: r.rows[0].id, grupo: g, usuario };
                });
            }

            // Compras mensuales (días 3–6) de lo que está bajo 2× el mínimo
            if (dia === 3 + (mes % 4)) {
                await fecharBitacora(`${fecha} 10:30`, async () => {
                    const stock = (await db.query('SELECT id, nombre, stock_actual, stock_minimo, categoria FROM insumos WHERE activo')).rows;
                    let doc = null;
                    for (const s of stock) {
                        if (EQUIPO.test(s.nombre) && s.stock_actual > 0) continue;
                        if (mes >= 9 && SIN_COMPRA.some(n => s.nombre.startsWith(n))) continue;
                        if (s.stock_actual <= s.stock_minimo * 2) {
                            doc ||= await documento('entrada', fecha, { origen: 'envio_capital', constancia: `Constancia de ingreso ${entre(100, 999)}-${fecha.slice(0, 4)}`, hora: '10:30' });
                            await entrada(porNombre[s.nombre], fecha, s.stock_minimo * entre(3, 5), 'envio_capital', { doc });
                            totales.compras++;
                        }
                    }
                });
            }
            // Donación de insumos médicos a mitad del periodo
            if (fecha === '2026-06-18') {
                await fecharBitacora(`${fecha} 15:00`, async () => {
                    const doc = await documento('entrada', fecha, { origen: 'donacion', donante: 'Comité pro-bomberos', constancia: 'Acta de donación 12-2026', hora: '15:00' });
                    for (const n of ['Venda gasa 4x10 Prosan', 'Compresa quirúrgica 12"x12"', 'Bolsa de solución salina', 'Guantes Wolf talla M', 'Venda elástica']) {
                        await entrada(porNombre[n], fecha, entre(15, 40), 'donacion', { doc });
                    }
                });
            }
            // Donación de lotes con vencimiento corto: deben verse como «por vencer»
            if (fecha === '2026-09-22') {
                await fecharBitacora(`${fecha} 14:00`, async () => {
                    const doc = await documento('entrada', fecha, { origen: 'donacion', donante: 'Hospital privado', constancia: 'Acta de donación 19-2026', observaciones: 'Vencimiento corto', hora: '14:00' });
                    await entrada(porNombre['Solución Hartmann 500ml'], fecha, 40, 'donacion', { vencimiento: '2026-10-28', doc });
                    await entrada(porNombre['Catéter #20'], fecha, 60, 'donacion', { vencimiento: '2026-11-05', doc });
                });
            }

            // Vales de los lunes (en horario de oficina): la comisión de la escuadra de turno retira
            // lo de la semana y repone el botiquín con lo usado en los servicios (entrevista 00:42, 07:22)
            if (new Date(fecha + 'T12:00:00Z').getUTCDay() === 1 && turno) {
                await fecharBitacora(`${fecha} 09:15`, async () => {
                    const comision = turno.grupo.gente.slice(0, 2);
                    for (const cat of ['prehospitalario', 'cafeteria', 'limpieza', 'libreria']) {
                        const lineas = cat === 'prehospitalario'
                            ? Object.entries(usoPendiente).map(([id, cant]) => [insumos.find(x => x.id === Number(id)), cant]).filter(([i]) => i?.categoria === cat)
                            : insumos.filter(x => x.categoria === cat && !EQUIPO.test(x.nombre) && prob(x.categoria === 'cafeteria' ? 0.8 : 0.35))
                                .map(i => [i, i.nombre === 'Papel higiénico' ? entre(4, 8) : i.categoria === 'cafeteria' ? entre(1, 3) : 1]);
                        if (!lineas.length) continue;
                        const doc = await documento('vale', fecha, {
                            categoria: cat, escuadra_id: turno.grupo.escuadra_id, recibe_id: idPersonal[uno(comision)],
                            entrega: 'Encargada administrativa', hora: '09:15'
                        });
                        for (const [i, cant] of lineas) {
                            await db.query('SAVEPOINT s');
                            try {
                                await registrarSalida(db, { insumo_id: i.id, cantidad: cant, motivo: 'entrega_escuadra', fecha_movimiento: fecha, documento_id: doc.id }, admin);
                                await db.query('RELEASE SAVEPOINT s');
                                totales.salidas++;
                            } catch (e) {
                                if (!(e instanceof ErrorNegocio)) throw e;
                                await db.query('ROLLBACK TO SAVEPOINT s');
                                totales.sinExistencia++;
                            }
                            if (cat === 'prehospitalario') delete usoPendiente[i.id];
                        }
                    }
                });
            }

            // Bajas de lotes que vencieron
            const baja = async (nombre, vencimiento, nota) => {
                const i = porNombre[nombre];
                const l = (await db.query('SELECT id, saldo FROM lotes WHERE insumo_id = $1 AND fecha_vencimiento = $2', [i.id, vencimiento])).rows[0];
                if (!l?.saldo) return;
                const doc = await documento('baja', fecha, { categoria: i.categoria, observaciones: nota, hora: '11:00' });
                await registrarSalida(db, { insumo_id: i.id, lote_id: l.id, cantidad: l.saldo, motivo: 'baja_vencimiento', fecha_movimiento: fecha, documento_id: doc.id }, admin);
            };
            if (fecha === '2026-04-22') await fecharBitacora(`${fecha} 11:00`, () => baja('Venoset', '2026-04-20', 'Lote vencido el 20/04/2026'));
            if (fecha === '2026-08-03') await fecharBitacora(`${fecha} 11:00`, () => baja('Galón de clorhexidina 5%', '2026-07-31', 'Lote vencido el 31/07/2026, enviado a destrucción'));
            if (fecha === '2026-07-14') {
                await fecharBitacora(`${fecha} 16:20`, async () => {
                    const doc = await documento('baja', fecha, { categoria: 'prehospitalario', observaciones: 'Se dañó la perilla durante un servicio', hora: '16:20' });
                    await registrarSalida(db, { insumo_id: porNombre['Esfigmomanómetro'].id, cantidad: 1, motivo: 'baja_dano', fecha_movimiento: fecha, documento_id: doc.id }, admin);
                });
            }

            for (const inicio of horas.filter(h => h >= 480)) await atender(fecha, mes, inicio);
        }

        // ── Un servicio: boleta, detalle, insumos y posible anulación ──
        async function atender(fecha, mes, inicio) {
            if (fecha === hoy && inicio > minutoAhora - 45) return;
            if (!turno) return;
            const tipo = ponderado(pesosTipo(mes));
            const sector = sectores[Number(ponderado(Object.fromEntries(sectores.map((s, k) => {
                let p = s.peso;
                if (tipo === 'agua' && ['aldea', 'caserio', 'colonia'].includes(s.tipo)) p *= 2.5;
                if (tipo === 'incendio' && mes <= 5 && ['aldea', 'caserio'].includes(s.tipo)) p *= 2;
                if (tipo === 'agua' && s.tipo === 'otro') p = 0;
                return [k, p];
            }))))];
            const sub = ponderado(pesosSubtipo(tipo, mes, sector.tipo));
            const grupo = turno.grupo;
            const unidad = uno(unidades.filter(u => u.tipos.includes(tipo)));
            const [dmin, dmax] = DURACION[tipo];
            const duracion = sub === 'traslado_programado' ? entre(240, 420) : sub === 'forestal' ? entre(120, 420) : entre(dmin, dmax);
            const salida = inicio;
            const regreso = salida + duracion;
            const observaciones = uno(OBSERVACIONES[sub] || OBSERVACIONES.otro);

            const frecuente = prob(0.25) ? uno(telefonosFrecuentes) : null;
            if (frecuente && !frecuente.sector && sector.tipo !== 'otro') frecuente.sector = sector;
            const sectorFinal = frecuente?.sector && tipo !== 'incendio' ? frecuente.sector : sector;
            const tel = frecuente ? frecuente.tel : prob(0.85) ? telefono() : null;
            const solicitante = frecuente ? frecuente.nombre : tipo === 'rescate' && prob(0.15) ? 'PNC Chiquimula' : persona();

            const enCurso = fecha === hoy && salida > minutoAhora - 120 && totales.enCurso < 2;
            const salieron = [unidad.piloto, ...grupo.gente.filter(x => x !== unidad.piloto).sort(() => azar() - 0.5).slice(0, entre(1, 3))];
            // El número se asigna al final, en el orden de regreso (ver renumeración)
            const numero = enCurso ? null : `${PREFIJO[tipo]}-tmp-${totales.boletas + 1}`;
            const creado = `${fecha} ${hhmm(salida)}`;
            const terminado = enCurso ? creado : `${sumarDias(fecha, regreso >= 1440 ? 1 : 0)} ${hhmm(regreso)}`;

            // Estado: las viejas están firmadas; las recientes pueden esperar a la tripulación
            const viejo = fecha < sumarDias(hoy, -3);
            const pendiente = !enCurso && !viejo && prob(0.3);
            const estado = enCurso ? 'en_curso' : pendiente ? 'pendiente' : viejo ? (prob(0.97) ? 'firmada' : 'completa') : (prob(0.5) ? 'firmada' : 'completa');
            const impresa = ['completa', 'firmada'].includes(estado) && (estado === 'firmada' || prob(0.3));
            const lugar = lugares.find(l => l.sector_id === sectorFinal.id) && prob(0.45) ? lugares.find(l => l.sector_id === sectorFinal.id) : null;

            const r = await db.query(`
                INSERT INTO emergencias (numero_control, tipo_servicio, subtipo, fecha, minutos_trabajados, solicitud_por_telefono,
                    personal, salida_de, hora_salida, entrada_a, hora_entrada, direccion, zona, sector_id, solicitante,
                    radiotelefonista, piloto, piloto_id, unidad, unidad_id, observaciones,
                    reporte_formulado_por, conforme_piloto, vobo_jefe_servicio, responsable, jefes_servicio,
                    usuario_id, estado, turno_id, creado_en, impresa_en, impresiones,
                    regreso_en, completada_en, firmada_en, firmada_por, lugar_critico_id, hora_aviso)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,
                    $33,$34,$35,$36,$37,$38)
                RETURNING id`, [
                numero, tipo, sub, fecha, enCurso ? null : duracion, tel,
                salieron.join('; '), ESTACION, hhmm(salida), enCurso ? null : ESTACION, enCurso ? null : hhmm(regreso),
                direccionEn(sectorFinal.nombre, sectorFinal.tipo), sectorFinal.nombre, sectorFinal.id, solicitante,
                grupo.radio, unidad.piloto, idPersonal[unidad.piloto], unidad.codigo, unidad.id, pendiente ? null : observaciones,
                grupo.radio, unidad.piloto, grupo.jefe, salieron[1] || unidad.piloto, grupo.jefe,
                turno.usuario, estado, turno.id, creado,
                impresa ? terminado : null, impresa ? (prob(0.06) ? 2 : 1) : 0,
                enCurso ? null : terminado, ['completa', 'firmada'].includes(estado) ? terminado : null,
                estado === 'firmada' ? `${sumarDias(fecha, 1)} 08:30` : null, estado === 'firmada' ? admin : null,
                lugar?.id || null, hhmm(Math.max(0, salida - entre(2, 6)))]);
            const id = r.rows[0].id;
            for (const nombre of salieron) {
                await db.query('INSERT INTO boleta_tripulacion (emergencia_id, personal_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [id, idPersonal[nombre]]);
            }
            totales.boletas++;
            if (enCurso) totales.enCurso++;

            const det = detalleDe(tipo, sub, { observaciones, sector: sectorFinal.nombre, jefe: grupo.jefe });
            if (pendiente) { delete det.acompanantes; delete det.edades; }
            const campos = Object.keys(det);
            await db.query(`INSERT INTO ${TABLA_DETALLE[tipo]} (emergencia_id, ${campos.join(', ')}) VALUES ($1, ${campos.map((_, k) => `$${k + 2}`).join(', ')})`,
                [id, ...campos.map(c => det[c])]);
            // En una boleta completa, lo que quedó vacío es porque no aplicaba
            if (!pendiente && !enCurso) {
                const fila = (await db.query(`SELECT e.*, d.* FROM emergencias e JOIN ${TABLA_DETALLE[tipo]} d ON d.emergencia_id = e.id WHERE e.id = $1`, [id])).rows[0];
                const noAplica = CAMPOS_BOLETA[tipo].filter(c => c.campos.every(k => fila[k] == null || String(fila[k]).trim() === '')).map(c => c.clave);
                await db.query('UPDATE emergencias SET no_aplica = $1 WHERE id = $2', [JSON.stringify(noAplica), id]);
            }

            // Insumos usados (solo al cerrar el servicio)
            const perfil = enCurso ? null : perfilConsumo(tipo, sub);
            let usados = 0;
            await fecharBitacora(terminado, async () => {
                for (const [nombre, p, a, b] of perfil ? CONSUMO[perfil] : []) {
                    if (!prob(p) || !porNombre[nombre]) continue;
                    // Uso en el servicio: no descuenta de bodega (ya salió por vale); el vale del lunes lo repone
                    const cant = entre(a, b);
                    await db.query('INSERT INTO consumos_servicio (emergencia_id, insumo_id, cantidad, usuario_id, creado_en) VALUES ($1, $2, $3, $4, $5)',
                        [id, porNombre[nombre].id, cant, turno.usuario, terminado]);
                    usoPendiente[porNombre[nombre].id] = (usoPendiente[porNombre[nombre].id] || 0) + cant;
                    usados++;
                }
                await db.query(`INSERT INTO bitacora (usuario_id, accion, entidad, entidad_id, detalle) VALUES ($1, 'crear', 'emergencia', $2, $3)`,
                    [turno.usuario, id, JSON.stringify({ insumos: usados, estado })]);
            });

            // Algunas boletas se anulan por duplicado o error de registro
            if (!enCurso && prob(0.012)) {
                const cuando = `${sumarDias(fecha, 1)} 09:${String(entre(10, 59))}`;
                await fecharBitacora(cuando, async () => {
                    const consumos = (await db.query(`SELECT id FROM movimientos_inventario WHERE emergencia_id = $1 AND tipo_movimiento = 'salida'`, [id])).rows;
                    for (const m of consumos) await anularMovimiento(db, m.id, admin, `Anulación de boleta ${numero}`);
                    const motivo = uno(['Boleta duplicada, el servicio ya estaba registrado', 'Error en el tipo de servicio; se registró de nuevo', 'Llamada falsa registrada por error como servicio']);
                    await db.query(`UPDATE emergencias SET estado = 'anulada', motivo_anulacion = $1, anulada_por = $2, anulada_en = $3, impresa_en = NULL, impresiones = 0, firmada_en = NULL WHERE id = $4`, [motivo, admin, cuando, id]);
                    await db.query(`INSERT INTO bitacora (usuario_id, accion, entidad, entidad_id, detalle) VALUES ($1, 'anular', 'emergencia', $2, $3)`,
                        [admin, id, JSON.stringify({ motivo, insumos_devueltos: consumos.length })]);
                });
                totales.anuladas++;
            }
        }

        // Número de control en el orden de regreso, correlativo por tipo y año (regla de la capital)
        await db.query(`
            WITH orden AS (
                SELECT id, EXTRACT(YEAR FROM fecha)::int AS anio,
                       ROW_NUMBER() OVER (PARTITION BY tipo_servicio, EXTRACT(YEAR FROM fecha) ORDER BY regreso_en, id) AS n
                FROM emergencias WHERE regreso_en IS NOT NULL)
            UPDATE emergencias e SET secuencia = o.n, anio_secuencia = o.anio,
                numero_control = CASE e.tipo_servicio WHEN 'ambulancia' THEN 'AMB' WHEN 'incendio' THEN 'INC'
                    WHEN 'rescate' THEN 'RES' WHEN 'varios' THEN 'VAR' ELSE 'AGU' END || '-' || o.anio || '-' || LPAD(o.n::text, 4, '0')
            FROM orden o WHERE o.id = e.id`);
        // Usuario de consulta para la dirección
        await db.query(`INSERT INTO usuarios (usuario, password_hash, nombre_completo, rol)
            SELECT 'direccion', crypt('direccion123', gen_salt('bf', 10)), 'Jefe de la compañía', 'direccion'
            WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE usuario = 'direccion')`);

        // Horas reales en lotes y movimientos (el servicio usa la hora del servidor)
        await db.query(`UPDATE lotes SET creado_en = fecha_ingreso + TIME '09:00'`);
        await db.query(`UPDATE movimientos_inventario m SET creado_en = COALESCE(
            (SELECT e.creado_en + make_interval(mins => COALESCE(e.minutos_trabajados, 0)) FROM emergencias e WHERE e.id = m.emergencia_id),
            m.fecha_movimiento + TIME '10:00')`);

        await db.query('COMMIT');

        const resumen = (await db.query(`
            SELECT tipo_servicio, COUNT(*)::int AS boletas FROM emergencias GROUP BY 1 ORDER BY 2 DESC`)).rows;
        const bajos = (await db.query(`SELECT COUNT(*)::int AS n FROM insumos WHERE activo AND stock_actual <= stock_minimo`)).rows[0].n;
        console.log(`\nSimulación ${INICIO} → ${hoy}`);
        console.table(resumen);
        console.log(`Boletas: ${totales.boletas} (en curso: ${totales.enCurso}, anuladas: ${totales.anuladas})`);
        console.log(`Salidas por servicio: ${totales.salidas} · sin existencia al momento: ${totales.sinExistencia} · compras: ${totales.compras}`);
        console.log(`Insumos en o bajo el mínimo: ${bajos}`);
    } catch (e) {
        await db.query('ROLLBACK');
        throw e;
    } finally {
        db.release();
        await pool.end();
    }
};

main().catch((e) => { console.error('Error en la simulación:', e); process.exit(1); });
