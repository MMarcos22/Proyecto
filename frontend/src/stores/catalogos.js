// Vocabulario del dominio y catálogos (sectores, unidades, personal) compartidos
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { catalogos } from '../services/api';

export const TIPOS = [
    { valor: 'ambulancia', nombre: 'Ambulancia', corto: 'Ambulancia', titulo: 'REPORTE DE AMBULANCIA' },
    { valor: 'incendio', nombre: 'Incendio', corto: 'Incendio', titulo: 'REPORTE DE INCENDIO' },
    { valor: 'rescate', nombre: 'Rescate', corto: 'Rescate', titulo: 'SERVICIO DE RESCATE' },
    { valor: 'varios', nombre: 'Servicios varios', corto: 'Varios', titulo: 'REPORTE DE SERVICIOS VARIOS' },
    { valor: 'agua', nombre: 'Servicio de agua', corto: 'Agua', titulo: 'REPORTE DE SERVICIOS DE AGUA' }
];

// Orden de apilado validado para daltonismo: rojo y ámbar nunca quedan adyacentes
export const ORDEN_SERIE = ['incendio', 'ambulancia', 'rescate', 'varios', 'agua'];

export const nombreTipo = (t) => TIPOS.find(x => x.valor === t)?.nombre || t || '—';
export const corteTipo = (t) => TIPOS.find(x => x.valor === t)?.corto || t || '—';
export const colorTipo = (t) => `var(--t-${t})`;

export const useCatalogosStore = defineStore('catalogos', () => {
    const dominio = ref(null);
    const sectores = ref([]);
    const unidades = ref([]);
    const personal = ref([]);
    const lugares = ref([]);
    const escuadras = ref([]);
    const cargado = ref(false);
    let promesa = null;

    const cargar = (forzar = false) => {
        if (promesa && !forzar) return promesa;
        promesa = Promise.all([
            catalogos.dominio(), catalogos.sectores.listar(),
            catalogos.unidades.listar(), catalogos.personal.listar(),
            catalogos.lugares.listar(), catalogos.escuadras.listar()
        ]).then(([d, s, u, p, l, e]) => {
            dominio.value = d.data;
            sectores.value = s.data;
            unidades.value = u.data;
            personal.value = p.data;
            lugares.value = l.data;
            escuadras.value = e.data;
            cargado.value = true;
        }).catch((e) => {
            promesa = null;
            throw e;
        });
        return promesa;
    };

    const subtipos = (tipo) => Object.entries(dominio.value?.SUBTIPOS?.[tipo] || {})
        .map(([valor, nombre]) => ({ valor, nombre }));
    const nombreSubtipo = (tipo, sub) => dominio.value?.SUBTIPOS?.[tipo]?.[sub] || (sub ? sub : 'Sin clasificar');
    const nombreMotivo = (tipoMov, motivo) => dominio.value?.MOTIVOS?.[tipoMov]?.[motivo] || motivo;
    const motivos = (tipoMov) => Object.entries(dominio.value?.MOTIVOS?.[tipoMov] || {})
        .map(([valor, nombre]) => ({ valor, nombre }));
    const nombreCategoria = (c) => dominio.value?.CATEGORIAS?.[c] || c;
    const categorias = computed(() => Object.entries(dominio.value?.CATEGORIAS || {})
        .map(([valor, nombre]) => ({ valor, nombre })));
    const tiposSector = computed(() => Object.entries(dominio.value?.TIPOS_SECTOR || {})
        .map(([valor, nombre]) => ({ valor, nombre })));
    const sector = (id) => sectores.value.find(s => s.id === Number(id));
    const lugaresDe = (sectorId) => lugares.value.filter(l => l.sector_id === Number(sectorId));
    const persona = (id) => personal.value.find(p => p.id === Number(id));
    const camposBoleta = (tipo) => dominio.value?.CAMPOS_BOLETA?.[tipo] || [];
    const nombreEstado = (e) => dominio.value?.ESTADOS_BOLETA?.[e] || e;

    return {
        dominio, sectores, unidades, personal, lugares, escuadras, cargado, cargar,
        subtipos, nombreSubtipo, nombreMotivo, motivos, nombreCategoria, categorias, tiposSector, sector,
        lugaresDe, persona, camposBoleta, nombreEstado
    };
});
