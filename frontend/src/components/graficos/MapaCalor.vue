<template>
  <div class="calor" ref="raiz" @mouseleave="activo = null">
    <div class="rejilla-c" role="table" aria-label="Servicios por día de la semana y hora de salida">
      <div class="cab" role="row">
        <span></span>
        <span v-for="h in 24" :key="h" class="hora mono" role="columnheader">{{ (h - 1) % 3 === 0 ? String(h - 1).padStart(2, '0') : '' }}</span>
      </div>
      <div v-for="d in 7" :key="d" class="fila-c" role="row">
        <span class="dia mono" role="rowheader">{{ DIAS_ISO[d] }}</span>
        <span v-for="h in 24" :key="h" class="celda" role="cell"
              :style="{ background: color(valor(d, h - 1)) }"
              :aria-label="`${DIAS_ISO[d]} ${h - 1}:00, ${valor(d, h - 1)} servicios`"
              @mouseenter="(e) => mostrar(e, d, h - 1)"></span>
      </div>
    </div>
    <div class="escala">
      <span class="mono">0</span>
      <span v-for="i in 5" :key="i" class="paso" :style="{ background: color((i / 5) * maximo) }"></span>
      <span class="mono">{{ maximo }}</span>
      <span class="tenue">servicios por franja de una hora</span>
    </div>
    <Tooltip :visible="!!activo" :x="activo?.x" :y="activo?.y">
      <template v-if="activo">
        <strong>{{ DIAS_LARGOS[activo.d] }} · {{ String(activo.h).padStart(2, '0') }}:00–{{ String(activo.h).padStart(2, '0') }}:59</strong>
        <div class="fila-t"><span>Servicios</span><span class="mono">{{ activo.v }}</span></div>
      </template>
    </Tooltip>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import Tooltip from './Tooltip.vue';
import { DIAS_ISO } from '../../utils/formato';

// datos: [{ dia: 1..7 (ISO, lunes = 1), hora: 0..23, total }]
const props = defineProps({ datos: { type: Array, default: () => [] } });

const DIAS_LARGOS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const raiz = ref(null);
const activo = ref(null);

const mapa = computed(() => {
  const m = {};
  for (const r of props.datos) m[`${r.dia}-${r.hora}`] = r.total;
  return m;
});
const maximo = computed(() => Math.max(1, ...props.datos.map(r => r.total)));
const valor = (d, h) => mapa.value[`${d}-${h}`] || 0;

// Escala secuencial de un solo tono (azul) sobre la superficie
const color = (v) => v
  ? `color-mix(in srgb, var(--acento) ${Math.round(14 + (v / maximo.value) * 86)}%, var(--superficie))`
  : 'var(--superficie-hundida)';

const mostrar = (e, d, h) => {
  const r = raiz.value.getBoundingClientRect();
  const c = e.target.getBoundingClientRect();
  activo.value = { d, h, v: valor(d, h), x: c.left - r.left + c.width / 2, y: c.top - r.top };
};
</script>

<style scoped>
.calor { position: relative; }
.rejilla-c { display: flex; flex-direction: column; gap: 3px; }
.cab, .fila-c { display: grid; grid-template-columns: 34px repeat(24, minmax(0, 1fr)); gap: 3px; align-items: center; }
.hora { font-size: 9.5px; color: var(--texto-tenue); }
.dia { font-size: 10.5px; color: var(--texto-suave); }
.celda { aspect-ratio: 1.25; min-height: 12px; border-radius: 2px; transition: outline-color 100ms; outline: 1.5px solid transparent; outline-offset: 0; }
.celda:hover { outline-color: var(--texto); }
.escala { display: flex; align-items: center; gap: 4px; margin-top: 12px; font-size: 11px; }
.escala .mono { font-size: 10.5px; color: var(--texto-tenue); }
.paso { width: 18px; height: 9px; border-radius: 2px; }
.escala .tenue { margin-left: 8px; }
</style>
