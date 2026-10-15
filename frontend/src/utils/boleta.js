// Traducción entre el formulario por pasos (datos estructurados) y las líneas
// de la boleta oficial en papel. El formulario guarda elecciones; la boleta
// impresa recibe el texto en la línea que le corresponde.

export const SEP = '; ';
export const ESTACION = 'Estación 39ª Compañía';

const vacio = (v) => v === null || v === undefined || String(v).trim() === '';
const unir = (lista) => lista.map(x => (x || '').trim()).filter(Boolean).join(SEP);
const partir = (texto) => (texto ? String(texto).split(/\s*;\s*/) : []);

// ── Ambulancia ───────────────────────────────────────────────
// La casilla del tipo de caso en papel corresponde a la clasificación elegida
const CASILLA_AMBULANCIA = {
    maternidad: 'serv_maternidad',
    accidente_moto: 'acc_transito',
    accidente_vehiculo: 'acc_transito',
    atropello: 'acc_transito',
    accidente_trabajo: 'acc_trabajo'
};

export const DESTINOS_AMBULANCIA = [
    { valor: 'modular', nombre: 'Hospital Modular', campo: 'hosp_modular' },
    { valor: 'igss', nombre: 'Hospital IGSS', campo: 'hosp_igss' },
    { valor: 'privado', nombre: 'Hospital privado', campo: 'hosp_privado', pideNombre: 'Nombre del hospital' },
    { valor: 'otro', nombre: 'Otro lugar', campo: 'otro_traslado', pideNombre: '¿A dónde?' },
    { valor: 'ninguno', nombre: 'No hubo traslado', campo: null }
];

// ── Agua ─────────────────────────────────────────────────────
export const DESTINOS_AGUA = {
    domicilio: 'residencia',
    establecimiento: 'nombre_establecimiento',
    centro_asistencial: 'centro_asistencial',
    comunidad: 'colonia',
    otro: 'nota'
};

export const FORMAS_AVISO = ['Teléfono', 'Radio', 'Personalmente', 'PNC', 'Otra institución'];
export const CAUSAS_INCENDIO = ['Cortocircuito', 'Quema de basura', 'Descuido humano', 'Fuga de gas', 'Pirotecnia', 'Intencional', 'En investigación'];
export const FORMAS_DISTRIBUCION = ['Cisterna a depósito', 'Toneles', 'Directo a tinaco', 'Por cubetas'];

// Convierte el estado del formulario a los campos de la boleta (los que guarda la BD)
export const aBoleta = (d, nombreSubtipo) => {
    const b = { ...d };
    const detalle = (d.detalle_caso || '').trim();

    if (d.tipo_servicio === 'ambulancia') {
        b.nombres_pacientes = unir(d.pacientes.map(p => p.nombre));
        b.edades = unir(d.pacientes.map(p => p.edad));
        b.domicilios = unir(d.pacientes.map(p => p.domicilio));
        for (const c of ['serv_maternidad', 'acc_transito', 'acc_trabajo', 'otros']) b[c] = null;
        if (d.subtipo) {
            const casilla = CASILLA_AMBULANCIA[d.subtipo] || 'otros';
            b[casilla] = casilla === 'otros' ? [nombreSubtipo, detalle].filter(Boolean).join(': ') : (detalle || 'X');
        }
        for (const x of DESTINOS_AMBULANCIA) if (x.campo) b[x.campo] = null;
        const dest = DESTINOS_AMBULANCIA.find(x => x.valor === d.destino?.tipo);
        if (dest?.campo) b[dest.campo] = d.destino.detalle?.trim() || 'X';
        if (!d.hubo_fallecidos) b.fallecidos = null;
    }

    if (d.tipo_servicio === 'rescate') {
        b.nombres_rescatados = unir(d.pacientes.map(p => p.nombre));
        b.edades = unir(d.pacientes.map(p => p.edad));
        b.domicilios = unir(d.pacientes.map(p => p.domicilio));
    }

    if (d.tipo_servicio === 'varios') {
        b.clase_servicio = [nombreSubtipo, detalle].filter(Boolean).join(': ') || detalle || null;
    }

    if (d.tipo_servicio === 'agua') {
        for (const c of Object.values(DESTINOS_AGUA)) if (c !== 'nota') b[c] = null;
        const campo = DESTINOS_AGUA[d.subtipo];
        if (campo && campo !== 'nota') b[campo] = detalle || 'X';
        if (d.subtipo === 'otro' && detalle) b.nota = [detalle, d.nota].filter(Boolean).join('. ');
        b.donativo_letras = vacio(d.donativo) ? null : quetzalesEnLetras(Number(d.donativo));
    }

    if (d.tipo_servicio === 'incendio') {
        if (!d.hay_inmueble) for (const c of ['prop_propietario', 'sitio_inicio', 'valor_inmueble', 'perdidas_inmueble', 'aseguradora_inmueble']) b[c] = null;
        if (!d.hay_vehiculo) for (const c of ['veh_propietario', 'conductor', 'descripcion_tipo', 'marca', 'modelo', 'placas', 'valor_vehiculo', 'perdidas_vehiculo', 'aseguradora_vehiculo']) b[c] = null;
    }

    b.personal = unir(d.salieron);
    return b;
};

// Reconstruye el estado del formulario a partir de una boleta guardada (para editar o cerrar)
export const desdeBoleta = (s) => {
    const det = s.detalle || {};
    const f = { ...det, ...s };
    const nombres = partir(s.tipo_servicio === 'rescate' ? det.nombres_rescatados : det.nombres_pacientes);
    const edades = partir(det.edades);
    const domicilios = partir(det.domicilios);
    f.pacientes = nombres.map((n, i) => ({ nombre: n, edad: edades[i] || '', domicilio: domicilios[i] || '' }));
    f.salieron = partir(s.personal);

    f.detalle_caso = '';
    if (s.tipo_servicio === 'ambulancia') {
        const casilla = CASILLA_AMBULANCIA[s.subtipo] || 'otros';
        const v = det[casilla] || '';
        f.detalle_caso = casilla === 'otros' ? v.split(': ').slice(1).join(': ') : (v === 'X' ? '' : v);
        const dest = DESTINOS_AMBULANCIA.find(x => x.campo && det[x.campo]);
        f.destino = dest ? { tipo: dest.valor, detalle: det[dest.campo] === 'X' ? '' : det[dest.campo] } : { tipo: 'ninguno', detalle: '' };
    }
    if (s.tipo_servicio === 'varios') f.detalle_caso = (det.clase_servicio || '').split(': ').slice(1).join(': ') || '';
    if (s.tipo_servicio === 'agua') {
        const campo = DESTINOS_AGUA[s.subtipo];
        if (campo && campo !== 'nota' && det[campo] !== 'X') f.detalle_caso = det[campo] || '';
    }
    if (s.tipo_servicio === 'incendio') {
        f.hay_inmueble = ['prop_propietario', 'sitio_inicio', 'valor_inmueble', 'perdidas_inmueble'].some(c => !vacio(det[c]));
        f.hay_vehiculo = ['veh_propietario', 'conductor', 'marca', 'placas'].some(c => !vacio(det[c]));
        // Una boleta abierta aún no tiene estos datos: se propone inmueble, como en una boleta nueva
        if (!f.hay_inmueble && !f.hay_vehiculo) f.hay_inmueble = true;
    }
    f.hora_salida = s.hora_salida?.slice(0, 5) || '';
    f.hora_entrada = s.hora_entrada?.slice(0, 5) || '';
    return f;
};

// ── Números a letras (para el donativo) ──────────────────────
const UNIDADES = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez',
    'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte',
    'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve'];
const DECENAS = ['', '', '', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
const CENTENAS = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

const menorMil = (n) => {
    if (n === 0) return '';
    if (n === 100) return 'cien';
    const c = Math.floor(n / 100), r = n % 100;
    let t = CENTENAS[c];
    if (r) {
        const parte = r < 30 ? UNIDADES[r] : DECENAS[Math.floor(r / 10)] + (r % 10 ? ` y ${UNIDADES[r % 10]}` : '');
        t = t ? `${t} ${parte}` : parte;
    }
    return t;
};

export const enLetras = (n) => {
    n = Math.floor(Math.abs(n));
    if (n === 0) return 'cero';
    const millones = Math.floor(n / 1e6), miles = Math.floor((n % 1e6) / 1000), resto = n % 1000;
    const partes = [];
    if (millones) partes.push(millones === 1 ? 'un millón' : `${menorMil(millones).replace(/uno$/, 'un')} millones`);
    if (miles) partes.push(miles === 1 ? 'mil' : `${menorMil(miles).replace(/uno$/, 'un')} mil`);
    if (resto) partes.push(menorMil(resto));
    return partes.join(' ');
};

export const quetzalesEnLetras = (monto) => {
    if (!Number.isFinite(monto)) return '';
    const entero = Math.floor(monto);
    const centavos = Math.round((monto - entero) * 100);
    const base = `${enLetras(entero).replace(/uno$/, 'un')} ${entero === 1 ? 'quetzal' : 'quetzales'}`;
    const texto = centavos ? `${base} con ${String(centavos).padStart(2, '0')}/100` : `${base} exactos`;
    return texto.charAt(0).toUpperCase() + texto.slice(1);
};

// ── Campos en blanco y "No aplica" ───────────────────────────
// Misma regla que el servidor: cada campo de la boleta oficial lleva un valor
// o "No aplica"; un grupo de casillas se cumple si cualquiera tiene valor.
export const NO_APLICA = 'No aplica';

export const faltantesDe = (fila, campos, noAplica = []) => {
    const marcados = new Set(noAplica);
    const lista = [];
    if (!fila.sector_id) lista.push({ clave: 'sector_id', etiqueta: 'Sector del municipio', admiteNoAplica: false });
    if (!fila.subtipo) lista.push({ clave: 'subtipo', etiqueta: 'Causa del servicio', admiteNoAplica: false });
    for (const c of campos) {
        if (marcados.has(c.clave)) continue;
        if (c.campos.some(k => !vacio(fila[k]))) continue;
        lista.push({ clave: c.clave, etiqueta: c.etiqueta, admiteNoAplica: true });
    }
    return lista;
};

// Escribe "No aplica" en el primer campo de cada grupo marcado que quedó vacío
export const conNoAplica = (fila, campos, noAplica = []) => {
    const marcados = new Set(noAplica);
    const r = { ...fila };
    for (const c of campos) {
        if (marcados.has(c.clave) && c.campos.every(k => vacio(r[k]))) r[c.campos[0]] = NO_APLICA;
    }
    return r;
};
