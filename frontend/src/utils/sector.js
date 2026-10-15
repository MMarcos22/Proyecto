// Reconoce el sector del catálogo a partir de la dirección escrita.
// Regla explícita y verificable: el nombre del sector o uno de sus lugares de
// referencia aparece en la dirección. Siempre la confirma la persona.

export const normalizar = (t) => (t || '').toString().toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9ñ\s]/g, ' ').replace(/\s+/g, ' ').trim();

export const referenciasDe = (s) => (s.referencias || '').split(/[,;\n]/).map(r => r.trim()).filter(Boolean);

// Devuelve { sector, coincidencia } o null
export const detectarSector = (direccion, sectores) => {
    const t = ` ${normalizar(direccion)} `;
    if (t.trim().length < 4) return null;
    let mejor = null;

    for (const s of sectores) {
        const nombre = normalizar(s.nombre);
        let puntos = 0;
        let coincidencia = null;

        if (nombre && t.includes(` ${nombre} `)) { puntos = 3; coincidencia = s.nombre; }

        // "zona 3", "z 3", "z3" contra un sector llamado "Zona 3"
        const zona = nombre.match(/^zona (\d+)/);
        if (!puntos && zona && new RegExp(`\\b(zona|z)\\s?${zona[1]}\\b`).test(t)) { puntos = 3; coincidencia = `zona ${zona[1]}`; }

        for (const ref of referenciasDe(s)) {
            const r = normalizar(ref);
            if (r.length > 2 && t.includes(` ${r} `) && puntos < 2) { puntos = 2; coincidencia = ref; }
        }

        if (puntos && (!mejor || puntos > mejor.puntos)) mejor = { sector: s, coincidencia, puntos };
    }
    return mejor && { sector: mejor.sector, coincidencia: mejor.coincidencia };
};

// Búsqueda en el selector: por nombre o por lugar de referencia
export const sectorCoincide = (s, texto) => {
    const t = normalizar(texto);
    return !t || normalizar(s.nombre).includes(t) || referenciasDe(s).some(r => normalizar(r).includes(t));
};
