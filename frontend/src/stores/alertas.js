import { defineStore } from 'pinia';
import { ref } from 'vue';
import { inventario } from '../services/api';

export const useAlertasStore = defineStore('alertas', () => {
    const datos = ref({
        resumen: { agotados: 0, bajos: 0, vencidos: 0, por_vencer: 0, total: 0 },
        insumos_agotados: [], existencia_baja: [],
        lotes_vencidos: [], lotes_por_vencer: []
    });
    const cargando = ref(false);

    const cargar = async () => {
        cargando.value = true;
        try {
            const { data } = await inventario.alertasDetalle();
            datos.value = data;
        } catch { /* silencioso */ }
        finally { cargando.value = false; }
    };

    return { datos, cargando, cargar };
});