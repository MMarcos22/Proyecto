// Personal del turno de guardia. Piloto, tripulación, responsables y firmas solo
// se eligen de aquí, en todo el sistema: el listado completo confunde y deja
// anotar a alguien que no estaba (recomendación de la compañía).

// ¿La persona está de guardia? Anotada en el turno o de la escuadra del turno
export const estaDeTurno = (p, turno) => !!turno && !!p
    && (turno.personal?.includes(p.nombre_completo) || (!!turno.escuadra_id && p.escuadra_id === turno.escuadra_id));

// Lista para elegir: el personal del turno, más quienes ya están en la boleta
// (por ids o por nombre) para que una boleta anterior se siga viendo completa
export const personalDeTurno = (personal, turno, yaElegidos = []) => {
    const elegidos = new Set(yaElegidos.filter(Boolean).map(x => (typeof x === 'number' ? x : String(x))));
    return personal
        .filter(p => estaDeTurno(p, turno) || elegidos.has(p.id) || elegidos.has(p.nombre_completo))
        .sort((a, b) => a.nombre_completo.localeCompare(b.nombre_completo));
};
