<template>
  <!-- Monto en quetzales: se escribe con coma de miles y punto decimal (Q 12,500.50) -->
  <div class="campo-q" :class="{ deshabilitado: disabled }">
    <span class="prefijo" aria-hidden="true">Q</span>
    <input ref="entrada" :id="id" class="control num" type="text" inputmode="decimal" autocomplete="off"
           :value="texto" :placeholder="placeholder" :disabled="disabled" :aria-label="etiqueta"
           @input="alEscribir" @blur="alSalir" />
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue';
import { miles, montoTexto } from '../utils/formato';

const props = defineProps({
  id: { type: String, default: undefined },
  etiqueta: { type: String, default: undefined },
  placeholder: { type: String, default: '0.00' },
  disabled: { type: Boolean, default: false }
});
const valor = defineModel({ default: null });
const entrada = ref(null);

// Solo cifras y un punto, con dos decimales como máximo
const limpiar = (t) => {
  let s = String(t).replace(/[^\d.]/g, '');
  const punto = s.indexOf('.');
  if (punto >= 0) s = s.slice(0, punto + 1) + s.slice(punto + 1).replace(/\./g, '').slice(0, 2);
  const [e, d] = s.split('.');
  const entero = e.replace(/^0+(?=\d)/, '');
  return d === undefined ? entero : `${entero || '0'}.${d}`;
};
const formatear = (s) => {
  if (!s) return '';
  const [e, d] = s.split('.');
  return `${miles(e)}${d === undefined ? '' : `.${d}`}`;
};
const aNumero = (s) => (s === '' || s === '.' ? null : Number(s));

const texto = ref(valor.value === null || valor.value === undefined || valor.value === '' || Number.isNaN(Number(valor.value)) ? '' : montoTexto(valor.value));

// Escribe en vivo con comas sin mover el cursor de lugar
const alEscribir = (e) => {
  const el = e.target;
  const cursor = el.selectionStart ?? el.value.length;
  const significativos = el.value.slice(0, cursor).replace(/[^\d.]/g, '').length;
  const limpio = limpiar(el.value);
  texto.value = formatear(limpio);
  el.value = texto.value;
  valor.value = aNumero(limpio);
  nextTick(() => {
    let vistos = 0, pos = 0;
    while (pos < texto.value.length && vistos < significativos) {
      if (/[\d.]/.test(texto.value[pos])) vistos++;
      pos++;
    }
    entrada.value?.setSelectionRange(pos, pos);
  });
};

// Al salir del campo se completan los centavos: 12,500 → 12,500.00
const alSalir = () => {
  if (valor.value !== null && valor.value !== undefined) texto.value = montoTexto(valor.value);
};

watch(valor, (v) => {
  const actual = aNumero(limpiar(texto.value));
  if (v === null || v === undefined || v === '') { if (actual !== null) texto.value = ''; return; }
  if (Number(v) !== actual) texto.value = Number.isNaN(Number(v)) ? '' : montoTexto(v);
});
</script>

<style scoped>
.campo-q { position: relative; display: flex; align-items: center; }
.prefijo {
  position: absolute; left: 12px; font-weight: 700; color: var(--texto-suave); pointer-events: none;
}
.campo-q .control { padding-left: 30px; text-align: right; }
.deshabilitado .prefijo { opacity: .5; }
</style>
