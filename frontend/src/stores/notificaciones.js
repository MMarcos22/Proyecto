import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useNotificacionesStore = defineStore('notificaciones', () => {
    const lista = ref([]);
    let contador = 0;

    const mostrar = (mensaje, tipo = 'info', duracion = 4200) => {
        const id = ++contador;
        lista.value.push({ id, mensaje, tipo });
        setTimeout(() => cerrar(id), duracion);
    };

    const cerrar = (id) => {
        const i = lista.value.findIndex(n => n.id === id);
        if (i !== -1) lista.value.splice(i, 1);
    };

    const exito = (m) => mostrar(m, 'exito');
    const error = (m) => mostrar(m, 'peligro', 5200);
    const alerta = (m) => mostrar(m, 'alerta', 5200);
    const info = (m) => mostrar(m, 'info');

    return { lista, mostrar, cerrar, exito, error, alerta, info };
});