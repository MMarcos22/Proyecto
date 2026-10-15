// Formatos y fechas. Guatemala usa UTC-6 todo el año; las fechas "de hoy" se
// calculan en hora local, nunca con toISOString (que usa UTC y adelanta el día).

export const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
export const DIAS_ISO = ['', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const dos = (n) => String(n).padStart(2, '0');

export const isoLocal = (d = new Date()) => `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
export const hoy = () => isoLocal();

export const sumarDias = (iso, n) => {
    const [a, m, d] = iso.split('-').map(Number);
    return isoLocal(new Date(a, m - 1, d + n));
};

const partes = (iso) => {
    if (!iso) return null;
    const [a, m, d] = String(iso).slice(0, 10).split('-').map(Number);
    return { a, m, d };
};

// 09/10/2026
export const fecha = (iso) => {
    const p = partes(iso);
    return p ? `${dos(p.d)}/${dos(p.m)}/${p.a}` : '—';
};

// 9 oct 2026
export const fechaCorta = (iso) => {
    const p = partes(iso);
    return p ? `${p.d} ${MESES_CORTOS[p.m - 1]} ${p.a}` : '—';
};

// 9 de octubre de 2026
export const fechaLarga = (iso) => {
    const p = partes(iso);
    return p ? `${p.d} de ${MESES[p.m - 1]} de ${p.a}` : '—';
};

export const fechaHora = (ts) => {
    if (!ts) return '—';
    const d = new Date(ts);
    return `${fecha(isoLocal(d))} ${dos(d.getHours())}:${dos(d.getMinutes())}`;
};

export const hora = (h) => (h ? String(h).slice(0, 5) : '—');

export const numero = (n, dec = 0) =>
    n == null || Number.isNaN(Number(n)) ? '—'
        : Number(n).toLocaleString('es-GT', { minimumFractionDigits: dec, maximumFractionDigits: dec });

export const quetzales = (n) => (n == null ? '—' : `Q ${numero(n, 2)}`);

// Monto con coma de miles y punto decimal, como se escribe en Guatemala: 12,500.50
export const miles = (entero) => String(entero).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
export const montoTexto = (n, decimales = 2) => {
    if (n === null || n === undefined || n === '' || Number.isNaN(Number(n))) return '';
    const [e, d] = Math.abs(Number(n)).toFixed(decimales).split('.');
    return `${Number(n) < 0 ? '-' : ''}${miles(e)}${d ? `.${d}` : ''}`;
};
// Para la boleta impresa: «Q 12,500.00»; un texto («No aplica») se deja tal cual
export const dinero = (v) => {
    if (v === null || v === undefined || String(v).trim() === '') return '';
    return Number.isNaN(Number(v)) ? String(v) : `Q ${montoTexto(v)}`;
};

// Teléfono de Guatemala: solo dígitos y no más de 8
export const telefonoTexto = (v) => String(v ?? '').replace(/\D/g, '').slice(0, 8);
export const telefonoCompleto = (v) => String(v ?? '').replace(/\D/g, '').length === 8;

export const minutos = (m) => {
    if (m == null) return '—';
    if (m < 60) return `${m} min`;
    return `${Math.floor(m / 60)} h ${dos(m % 60)} min`;
};

export const plural = (n, uno, varios) => `${numero(n)} ${n === 1 ? uno : varios}`;

export const iniciales = (nombre) =>
    (nombre || '').split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase();

// Periodos predefinidos para los selectores
export const periodosRapidos = () => {
    const h = hoy();
    const [a, m] = h.split('-').map(Number);
    const finMes = (anio, mes) => isoLocal(new Date(anio, mes, 0));
    const ma = m === 1 ? 12 : m - 1;
    const aa = m === 1 ? a - 1 : a;
    return [
        { clave: 'mes', nombre: 'Este mes', desde: `${a}-${dos(m)}-01`, hasta: h },
        { clave: 'anterior', nombre: 'Mes anterior', desde: `${aa}-${dos(ma)}-01`, hasta: finMes(aa, ma) },
        { clave: '90', nombre: 'Últimos 90 días', desde: sumarDias(h, -89), hasta: h },
        { clave: 'anio', nombre: 'Este año', desde: `${a}-01-01`, hasta: h }
    ];
};

// El mes, trimestre, semestre o año en curso, hasta hoy
export const periodoActual = (tipo = 'mes') => {
    const h = hoy();
    const [a, m] = h.split('-').map(Number);
    const inicio = { trimestre: Math.floor((m - 1) / 3) * 3 + 1, semestre: m >= 7 ? 7 : 1, anio: 1 }[tipo] || m;
    return { desde: `${a}-${dos(inicio)}-01`, hasta: h };
};

export const describirPeriodo = (desde, hasta) => {
    if (!desde || !hasta) return '';
    const a = partes(desde), b = partes(hasta);
    if (a.a === b.a && a.m === b.m && a.d === 1) {
        const ultimo = new Date(b.a, b.m, 0).getDate();
        if (b.d === ultimo || hasta === hoy()) return `${MESES[a.m - 1]} de ${a.a}`;
    }
    if (a.a === b.a && a.m === 1 && a.d === 1 && (hasta === hoy() || (b.m === 12 && b.d === 31))) return `año ${a.a}`;
    // Trimestre y semestre: empiezan el día 1 y terminan al fin de su último mes (o hoy, si está en curso)
    const cierra = (mesFinal) => hasta === hoy() || (b.m === mesFinal && b.d === new Date(b.a, mesFinal, 0).getDate());
    if (a.a === b.a && a.d === 1 && (a.m === 1 || a.m === 7) && b.m <= a.m + 5 && b.m > a.m + 2 && cierra(a.m + 5)) {
        return `${a.m === 1 ? 'primer' : 'segundo'} semestre de ${a.a}`;
    }
    if (a.a === b.a && a.d === 1 && (a.m - 1) % 3 === 0 && b.m <= a.m + 2 && cierra(a.m + 2)) {
        return `${['primer', 'segundo', 'tercer', 'cuarto'][(a.m - 1) / 3]} trimestre de ${a.a}`;
    }
    return `${fechaCorta(desde)} – ${fechaCorta(hasta)}`;
};

export const variacion = (v) => {
    if (v == null) return { texto: 'sin referencia', clase: 'igual' };
    if (v === 0) return { texto: '= 0 %', clase: 'igual' };
    return { texto: `${v > 0 ? '▲' : '▼'} ${numero(Math.abs(v), Math.abs(v) < 10 ? 1 : 0)} %`, clase: v > 0 ? 'sube' : 'baja' };
};
