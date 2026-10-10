import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

export const useTemaStore = defineStore('tema', () => {
    const oscuro = ref(false);

    const cargar = () => {
        const guardado = localStorage.getItem('tema');
        if (guardado) {
            oscuro.value = guardado === 'oscuro';
        } else {
            oscuro.value = window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
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