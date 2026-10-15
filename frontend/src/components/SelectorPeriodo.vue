<template>
  <div class="selector-periodo">
    <div class="segmentos" role="group" aria-label="Periodo">
      <button v-for="p in rapidos" :key="p.clave" type="button"
              :class="{ activo: actual === p.clave }" @click="elegir(p)">{{ p.nombre }}</button>
      <button type="button" :class="{ activo: actual === 'otro' }" @click="actual = 'otro'">Rango…</button>
    </div>
    <div v-if="actual === 'otro'" class="rango">
      <input type="date" class="control control-sm mono" :value="modelValue.desde" :max="modelValue.hasta"
             @change="(e) => emitir(e.target.value, modelValue.hasta)" aria-label="Desde" />
      <span class="tenue">a</span>
      <input type="date" class="control control-sm mono" :value="modelValue.hasta" :min="modelValue.desde" :max="hoyIso"
             @change="(e) => emitir(modelValue.desde, e.target.value)" aria-label="Hasta" />
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { periodosRapidos, hoy } from '../utils/formato';

const props = defineProps({ modelValue: { type: Object, required: true } });
const emit = defineEmits(['update:modelValue']);

const rapidos = periodosRapidos();
const hoyIso = hoy();
const coincide = rapidos.find(p => p.desde === props.modelValue.desde && p.hasta === props.modelValue.hasta);
const actual = ref(coincide ? coincide.clave : 'otro');

const emitir = (desde, hasta) => {
  if (desde && hasta && desde <= hasta) emit('update:modelValue', { desde, hasta });
};
const elegir = (p) => {
  actual.value = p.clave;
  emitir(p.desde, p.hasta);
};
</script>

<style scoped>
.selector-periodo { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.rango { display: flex; align-items: center; gap: 6px; }
.rango .control { width: 140px; }
</style>
