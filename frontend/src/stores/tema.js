import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

export const useTemaStore = defineStore('tema', () => {
    const oscuro = ref(false);

    const cargar = () => {
        const guardado = localStorage.getItem('tema');
        // Claro por omisión: es el que se lee mejor de día y se parece a la hoja impresa
        oscuro.value = guardado === 'oscuro';
        aplicar();
    };

    const aplicar = () => {
        document.documentElement.setAttribute(
            'data-tema', oscuro.value ? 'oscuro' : 'claro'
        );
    };

    const alternar = () => {
        oscuro.value = !oscuro.value;
    };

    watch(oscuro, (valor) => {
        localStorage.setItem('tema', valor ? 'oscuro' : 'claro');
        aplicar();
    });

    return { oscuro, cargar, alternar };
});