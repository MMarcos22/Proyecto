import { ref, onMounted, onUnmounted } from 'vue';

// Ancho real del contenedor, para dibujar el SVG en píxeles sin deformar el texto
export const useAncho = (raiz, inicial = 640) => {
    const ancho = ref(inicial);
    let obs = null;
    onMounted(() => {
        obs = new ResizeObserver(([e]) => { ancho.value = Math.max(240, Math.floor(e.contentRect.width)); });
        if (raiz.value) obs.observe(raiz.value);
    });
    onUnmounted(() => obs?.disconnect());
    return ancho;
};
