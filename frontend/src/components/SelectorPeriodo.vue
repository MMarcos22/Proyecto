<template>
  <!-- Periodo de un informe o análisis: un mes, un trimestre, un semestre, un año o cualquier rango -->
  <div class="selector-periodo">
    <div class="segmentos" role="group" aria-label="Periodo">
      <button v-for="t in TIPOS_PERIODO" :key="t.clave" type="button"
              :class="{ activo: tipo === t.clave }" @click="cambiarTipo(t.clave)">{{ t.nombre }}</button>
    </div>

    <div class="detalle-periodo">
      <select v-if="tipo === 'mes'" v-model.number="mes" class="control control-sm" aria-label="Mes" @change="aplicar">
        <option v-for="(m, i) in MESES" :key="m" :value="i + 1" :disabled="anio === anioHoy && i + 1 > mesHoy">{{ mayuscula(m) }}</option>
      </select>
      <select v-if="tipo === 'trimestre'" v-model.number="parte" class="control control-sm" aria-label="Trimestre" @change="aplicar">
        <option v-for="q in 4" :key="q" :value="q" :disabled="anio === anioHoy && (q - 1) * 3 + 1 > mesHoy">{{ ORDINAL[q] }} trimestre ({{ MESES_CORTOS[(q - 1) * 3] }}–{{ MESES_CORTOS[(q - 1) * 3 + 2] }})</option>
      </select>
      <select v-if="tipo === 'semestre'" v-model.number="parte" class="control control-sm" aria-label="Semestre" @change="aplicar">
        <option :value="1">1.er semestre (ene–jun)</option>
        <option :value="2" :disabled="anio === anioHoy && mesHoy < 7">2.º semestre (jul–dic)</option>
      </select>
      <select v-if="tipo !== 'rango'" v-model.number="anio" class="control control-sm" aria-label="Año" @change="aplicar">
        <option v-for="a in anios" :key="a" :value="a">{{ a }}</option>
      </select>

      <template v-if="tipo === 'rango'">
        <input type="date" class="control control-sm mono" :value="modelValue.desde" :max="modelValue.hasta"
               @change="(e) => emitir(e.target.value, modelValue.hasta)" aria-label="Desde" />
        <span class="tenue">a</span>
        <input type="date" class="control control-sm mono" :value="modelValue.hasta" :min="modelValue.desde" :max="hoyIso"
               @change="(e) => emitir(modelValue.desde, e.target.value)" aria-label="Hasta" />
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { hoy, isoLocal, MESES, MESES_CORTOS } from '../utils/formato';

const props = defineProps({ modelValue: { type: Object, required: true } });
const emit = defineEmits(['update:modelValue']);

const TIPOS_PERIODO = [
  { clave: 'mes', nombre: 'Mes' },
  { clave: 'trimestre', nombre: 'Trimestre' },
  { clave: 'semestre', nombre: 'Semestre' },
  { clave: 'anio', nombre: 'Año' },
  { clave: 'rango', nombre: 'Rango…' }
];
const ORDINAL = { 1: '1.er', 2: '2.º', 3: '3.er', 4: '4.º' };
const mayuscula = (t) => t[0].toUpperCase() + t.slice(1);

const hoyIso = hoy();
const anioHoy = Number(hoyIso.slice(0, 4));
const mesHoy = Number(hoyIso.slice(5, 7));
const anios = Array.from({ length: 6 }, (_, i) => anioHoy - i);
const finDeMes = (a, m) => isoLocal(new Date(a, m, 0));
// El periodo en curso termina hoy; uno pasado, en su último día
const tope = (iso) => (iso > hoyIso ? hoyIso : iso);

// Reconoce qué tipo de periodo es el valor inicial
const reconocer = ({ desde, hasta }) => {
  const [a, m, d] = (desde || '').split('-').map(Number);
  const fin = (mesFinal) => tope(finDeMes(a, mesFinal)) === hasta;
  if (d === 1) {
    if (m === 1 && fin(12)) return { tipo: 'anio', anio: a, mes: 1, parte: 1 };
    if ((m === 1 || m === 7) && fin(m + 5)) return { tipo: 'semestre', anio: a, mes: m, parte: m === 1 ? 1 : 2 };
    if ((m - 1) % 3 === 0 && fin(m + 2)) return { tipo: 'trimestre', anio: a, mes: m, parte: (m - 1) / 3 + 1 };
    if (fin(m)) return { tipo: 'mes', anio: a, mes: m, parte: 1 };
  }
  return { tipo: 'rango', anio: anioHoy, mes: mesHoy, parte: 1 };
};
const inicial = reconocer(props.modelValue);
const tipo = ref(inicial.tipo);
const anio = ref(inicial.anio);
const mes = ref(inicial.mes);
const parte = ref(inicial.parte);

const emitir = (desde, hasta) => {
  if (desde && hasta && desde <= hasta) emit('update:modelValue', { desde, hasta });
};

const dos = (n) => String(n).padStart(2, '0');
const meses = () => ({
  mes: [mes.value, mes.value],
  trimestre: [(parte.value - 1) * 3 + 1, (parte.value - 1) * 3 + 3],
  semestre: [parte.value === 1 ? 1 : 7, parte.value === 1 ? 6 : 12],
  anio: [1, 12]
})[tipo.value];

const aplicar = () => {
  if (!meses()) return;
  // Un periodo que todavía no empieza se cambia por el que está en curso
  if (`${anio.value}-${dos(meses()[0])}-01` > hoyIso) {
    anio.value = anioHoy;
    mes.value = mesHoy;
    parte.value = tipo.value === 'trimestre' ? Math.ceil(mesHoy / 3) : mesHoy >= 7 ? 2 : 1;
  }
  const [mi, mf] = meses();
  emitir(`${anio.value}-${dos(mi)}-01`, tope(finDeMes(anio.value, mf)));
};

const cambiarTipo = (t) => {
  tipo.value = t;
  if (t === 'rango') return;
  if (t === 'mes') mes.value = anio.value === anioHoy ? Math.min(mes.value, mesHoy) : mes.value;
  if (t === 'trimestre') parte.value = anio.value === anioHoy ? Math.ceil(mesHoy / 3) : 1;
  if (t === 'semestre') parte.value = anio.value === anioHoy && mesHoy >= 7 ? 2 : 1;
  aplicar();
};
</script>

<style scoped>
.selector-periodo { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.detalle-periodo { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.detalle-periodo .control { width: auto; }
.detalle-periodo input.control { width: 140px; }
</style>
