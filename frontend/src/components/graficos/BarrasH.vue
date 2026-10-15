<template>
  <ol class="barras" :aria-label="descripcion">
    <li v-for="(f, i) in filas" :key="f.clave ?? i" :class="{ clic: !!f.to }" @click="f.to && $router.push(f.to)">
      <span class="etiqueta-b" :title="f.etiqueta">
        <i v-if="f.color" :style="{ background: f.color }"></i>{{ f.etiqueta }}
      </span>
      <span class="pista"><span class="relleno" :style="{ width: f.porc + '%', background: f.color || 'var(--acento)' }"></span></span>
      <span class="valor-b num">{{ f.valorTexto }}</span>
      <span v-if="f.secundario" class="sec num">{{ f.secundario }}</span>
    </li>
  </ol>
</template>

<script setup>
import { computed } from 'vue';
import { numero } from '../../utils/formato';

// items: [{ clave, etiqueta, valor, color?, secundario?, to? }]
const props = defineProps({
  items: { type: Array, default: () => [] },
  maximo: { type: Number, default: null },
  sufijo: { type: String, default: '' },
  descripcion: { type: String, default: 'Gráfico de barras' }
});

const filas = computed(() => {
  const max = props.maximo || Math.max(1, ...props.items.map(i => i.valor));
  return props.items.map(i => ({
    ...i,
    porc: Math.max(i.valor > 0 ? 1.5 : 0, (i.valor / max) * 100),
    valorTexto: numero(i.valor) + props.sufijo
  }));
});
</script>

<style scoped>
.barras { list-style: none; display: flex; flex-direction: column; gap: 9px; }
li {
  display: grid;
  grid-template-columns: minmax(90px, 36%) 1fr 44px auto;
  align-items: center; gap: 10px;
  font-size: 12.5px;
}
li.clic { cursor: pointer; }
li.clic:hover .etiqueta-b { color: var(--texto); text-decoration: underline; text-underline-offset: 2px; }
li:hover .relleno { filter: brightness(1.12); }
.etiqueta-b {
  display: flex; align-items: center; gap: 7px;
  color: var(--texto-suave);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.etiqueta-b i { width: 8px; height: 8px; border-radius: 2px; flex-shrink: 0; }
.pista { height: 10px; background: var(--superficie-hundida); border-radius: 0 2px 2px 0; overflow: hidden; }
.relleno { display: block; height: 100%; border-radius: 0 2px 2px 0; transition: width 500ms cubic-bezier(.3,0,.2,1); }
.valor-b { text-align: right; font-family: var(--fuente-mono); font-size: 12px; font-weight: 500; color: var(--texto); }
.sec { font-family: var(--fuente-mono); font-size: 11px; color: var(--texto-tenue); min-width: 42px; text-align: right; }
</style>
