// Impresión de boletas en el formato oficial y contadores de boletas.
// Carga las boletas, las coloca en el área de impresión, abre el diálogo del
// navegador y las marca como impresas. Los contadores alimentan el menú e Inicio.
import { defineStore } from 'pinia';
import { ref, nextTick } from 'vue';
import { emergencias } from '../services/api';

export const useImpresionStore = defineStore('impresion', () => {
    const lote = ref([]);          // boletas que se están imprimiendo
    const pendientes = ref(0);     // completas o firmadas que aún no se imprimen
    const cuentas = ref({ por_imprimir: 0, por_completar: 0, por_firmar: 0, en_curso: 0 });

    const contarPendientes = async () => {
        try {
            const { data } = await emergencias.contadores();
            cuentas.value = data;
            pendientes.value = data.por_imprimir;
        } catch { /* el contador es informativo */ }
    };

    const imprimir = async (ids) => {
        const lista = Array.isArray(ids) ? ids : [ids];
        const datos = await Promise.all(lista.map(id => emergencias.obtener(id).then(r => ({ ...r.data, ...r.data.detalle }))));
        lote.value = datos;
        await nextTick();
        // Espera a que el logo y las fuentes estén listos antes de abrir el diálogo
        await new Promise(r => setTimeout(r, 150));
        window.print();
        const registradas = datos.filter(b => ['completa', 'firmada'].includes(b.estado)).map(b => b.id);
        if (registradas.length) {
            try { await emergencias.marcarImpresas(registradas); } catch { /* no bloquea la impresión */ }
        }
        lote.value = [];
        contarPendientes();
        return registradas.length;
    };

    return { lote, pendientes, cuentas, contarPendientes, imprimir };
});
