<template>
  <div class="grafico" ref="raiz" @mouseleave="activo = null">
    <div class="leyenda" v-if="series.length > 1">
      <span v-for="s in series" :key="s.clave" class="tipo" :style="{ '--c': s.color }">{{ s.nombre }}</span>
    </div>

    <svg :viewBox="`0 0 ${ancho} ${alto}`" class="lienzo" role="img"
         :aria-label="descripcion">
      <g v-for="t in marcas" :key="t">
        <line :x1="izq" :x2="ancho" :y1="y(t)" :y2="y(t)" class="rejilla" />
        <text :x="izq - 6" :y="y(t) + 3.5" class="eje" text-anchor="end">{{ t }}</text>
      </g>

      <g v-for="(c, i) in columnas" :key="c.clave">
        <rect :x="x(i)" :y="0" :width="paso" :height="base" class="zona-hover"
              @mouseenter="activo = i" />
        <template v-for="seg in c.segmentos" :key="seg.clave">
          <rect v-if="seg.alto > 0" :x="x(i) + hueco" :y="seg.y" :width="anchoBarra" :height="seg.alto"
                :fill="seg.color" :rx="seg.tope ? 2 : 0" class="segmento"
                :class="{ tenue: activo !== null && activo !== i }" />
        </template>
        <text v-if="c.total && (columnas.length <= 14 || i % 2 === 0)" :x="x(i) + paso / 2" :y="y(c.total) - 5"
              class="valor" text-anchor="middle">{{ c.total }}</text>
        <text :x="x(i) + paso / 2" :y="alto - 4" class="eje" text-anchor="middle">{{ c.etiqueta }}</text>
      </g>
      <line :x1="izq" :x2="ancho" :y1="base" :y2="base" class="linea-base" />
    </svg>

    <Tooltip :visible="activo !== null" :x="tipX" :y="tipY">
      <template v-if="activo !== null">
        <strong>{{ columnas[activo].detalle }}</strong>
        <div v-for="s in [...columnas[activo].segmentos].reverse()" :key="s.clave" class="fila-t">
          <i :style="{ background: s.color }"></i><span>{{ s.nombre }}</span><span class="mono">{{ s.valor }}</span>
        </div>
        <div class="fila-t" style="margin-top:3px;border-top:1px solid rgba(255,255,255,.2);padding-top:3px">
          <span>Total</span><span class="mono">{{ columnas[activo].total }}</span>
        </div>
      </template>
    </Tooltip>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import Tooltip from './Tooltip.vue';
import { useAncho } from './useAncho';

// datos: [{ clave, etiqueta, detalle, valores: { serie: n } }]
// series: [{ clave, nombre, color }] en el orden de apilado validado
const props = defineProps({
  datos: { type: Array, default: () => [] },
  series: { type: Array, default: () => [] },
  alto: { type: Number, default: 220 },
  descripcion: { type: String, default: 'Gráfico de columnas apiladas' }
});

const raiz = ref(null);
const activo = ref(null);
const ancho = useAncho(raiz);
const izq = 28;
const base = computed(() => props.alto - 20);
const hueco = 2;

const maximo = computed(() => {
  const m = Math.max(1, ...props.datos.map(d => Object.values(d.valores).reduce((a, b) => a + b, 0)));
  const paso = m <= 5 ? 1 : m <= 10 ? 2 : m <= 25 ? 5 : m <= 50 ? 10 : Math.ceil(m / 50) * 10;
  return Math.ceil(m / paso) * paso;
});
const marcas = computed(() => {
  const m = maximo.value;
  return [0, m / 2, m].map(v => Math.round(v));
});

const y = (v) => base.value - (v / maximo.value) * (base.value - 16);
const paso = computed(() => (ancho.value - izq) / Math.max(1, props.datos.length));
const anchoBarra = computed(() => Math.max(3, Math.min(34, paso.value - hueco * 2 - paso.value * 0.25)));
const x = (i) => izq + i * paso.value + (paso.value - anchoBarra.value - hueco * 2) / 2;

const columnas = computed(() => props.datos.map(d => {
  let acumulado = 0;
  const visibles = props.series.filter(s => (d.valores[s.clave] || 0) > 0);
  const segmentos = props.series.map(s => {
    const valor = d.valores[s.clave] || 0;
    const y0 = y(acumulado);
    acumulado += valor;
    const y1 = y(acumulado);
    // 2 px de separación entre segmentos apilados
    return {
      ...s, valor, y: y1 + (valor ? 1 : 0), alto: Math.max(0, y0 - y1 - (valor ? 2 : 0)),
      tope: s.clave === visibles[visibles.length - 1]?.clave
    };
  });
  return { ...d, total: acumulado, segmentos };
}));

const tipX = computed(() => activo.value === null ? 0
  : Math.min(ancho.value - 70, Math.max(70, x(activo.value) + anchoBarra.value / 2 + hueco)));
const tipY = computed(() => {
  if (activo.value === null || !raiz.value) return 0;
  return raiz.value.querySelector('svg').offsetTop + y(columnas.value[activo.value].total);
});
</script>

<style scoped>
.grafico { position: relative; }
.leyenda { display: flex; flex-wrap: wrap; gap: 6px 16px; margin-bottom: 12px; }
.leyenda .tipo { font-weight: 500; color: var(--texto-suave); font-size: 12px; }
.lienzo { width: 100%; height: v-bind('alto + "px"'); display: block; overflow: visible; }
.rejilla { stroke: var(--borde); stroke-width: 1; stroke-dasharray: 2 3; vector-effect: non-scaling-stroke; }
.linea-base { stroke: var(--borde-fuerte); stroke-width: 1; vector-effect: non-scaling-stroke; }
.eje { font-family: var(--fuente-mono); font-size: 10px; fill: var(--texto-tenue); }
.valor { font-family: var(--fuente-mono); font-size: 10px; fill: var(--texto-suave); }
.segmento { transition: opacity 120ms ease; }
.segmento.tenue { opacity: .35; }
.zona-hover { fill: transparent; }
</style>
