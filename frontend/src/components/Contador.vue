<template>
  <div class="contador" :class="{ error: excede }">
    <button type="button" class="btn btn-secundario btn-icono" :disabled="modelValue <= min" @click="cambiar(-1)" aria-label="Menos">
      <Icono nombre="menos" :tam="20" :grosor="3" />
    </button>
    <input :value="modelValue" type="number" inputmode="numeric" :min="min" :max="max ?? undefined" :aria-label="etiqueta"
           @input="(e) => emit('update:modelValue', e.target.value === '' ? null : Number(e.target.value))" />
    <button type="button" class="btn btn-secundario btn-icono" :disabled="max != null && modelValue >= max" @click="cambiar(1)" aria-label="Más">
      <Icono nombre="mas" :tam="20" :grosor="3" />
    </button>
    <span v-if="unidad" class="unidad">{{ unidad }}</span>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import Icono from './Icono.vue';

const props = defineProps({
  modelValue: { type: Number, default: 0 },
  min: { type: Number, default: 0 },
  max: { type: Number, default: null },
  unidad: String,
  etiqueta: { type: String, default: 'Cantidad' }
});
const emit = defineEmits(['update:modelValue']);

const excede = computed(() => props.max != null && props.modelValue > props.max);
const cambiar = (d) => emit('update:modelValue', Math.max(props.min, (Number(props.modelValue) || 0) + d));
</script>

<style scoped>
.contador { display: inline-flex; align-items: center; gap: 10px; }

input {
  width: 96px; height: 50px; text-align: center;
  font: inherit; font-family: var(--fuente-mono); font-size: 22px; font-weight: 700; color: var(--texto);
  background: var(--superficie-alt); border: 1px solid var(--borde); border-radius: var(--radio);
  -moz-appearance: textfield;
}
input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; }
input:focus { outline: none; border-color: var(--azul); background: var(--superficie); }
.error input { border-color: var(--peligro); background: var(--peligro-fondo); }
.unidad { font-size: 15px; font-weight: 600; color: var(--texto-suave); }
</style>
