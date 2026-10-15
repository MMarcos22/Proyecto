<template>
  <div class="animar">
    <div class="titulo-seccion">
      <div>
        <router-link to="/informes" class="volver no-imprimir"><Icono nombre="flecha_izq" :tam="13" />Informes</router-link>
        <h1>Resumen anual de inventario</h1>
      </div>
      <div class="acciones no-imprimir">
        <select v-model.number="anio" class="control control-sm" style="width:auto" aria-label="Año">
          <option v-for="a in anios" :key="a" :value="a">{{ a }}</option>
        </select>
        <button class="btn btn-secundario" :disabled="!datos" @click="exportar"><Icono nombre="descargar" :tam="16" />Excel</button>
        <button class="btn btn-primario" :disabled="!datos" @click="imprimir"><Icono nombre="imprimir" :tam="16" />Imprimir</button>
      </div>
    </div>

    <EncabezadoInforme titulo="Resumen anual de inventario" :periodo="`Año ${anio}`" destinatario="Capital y dirección" />

    <div class="segmentos mb no-imprimir">
      <button v-for="c in catalogos.categorias" :key="c.valor" :class="{ activo: categoria === c.valor }" @click="categoria = c.valor">{{ c.nombre }}</button>
    </div>

    <div v-if="cargando" class="esqueleto" style="height:300px"></div>
    <div v-else-if="datos" class="tabla-contenedor">
      <table class="anual">
        <thead>
          <tr><th>Insumo</th><th class="num">Inicio</th><th v-for="m in MESES_CORTOS" :key="m" class="num">{{ m }}</th><th class="num">Entró</th><th class="num">Salió</th><th class="num">Quedó</th></tr>
        </thead>
        <tbody>
          <tr v-for="i in filas" :key="i.id">
            <td class="celda-principal">{{ i.nombre }}</td>
            <td class="num">{{ i.inicial }}</td>
            <td v-for="(m, k) in i.meses" :key="k" class="num" :title="`Entró ${m.entradas} · Salió ${m.salidas}`">{{ m.salidas || '·' }}</td>
            <td class="num">{{ i.entradas }}</td>
            <td class="num">{{ i.salidas }}</td>
            <td class="num"><strong>{{ i.final }}</strong></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { informes, mensajeError } from '../services/api';
import { useCatalogosStore } from '../stores/catalogos';
import { useNotificacionesStore } from '../stores/notificaciones';
import { exportarExcel } from '../utils/exportar';
import Icono from '../components/Icono.vue';
import EncabezadoInforme from '../components/informes/EncabezadoInforme.vue';

const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const catalogos = useCatalogosStore();
const notif = useNotificacionesStore();
const actual = new Date().getFullYear();
const anios = [actual, actual - 1, actual - 2];
const anio = ref(actual);
const categoria = ref('prehospitalario');
const datos = ref(null);
const cargando = ref(true);

const filas = computed(() => (datos.value?.insumos || []).filter(i => i.categoria === categoria.value));

const cargar = async () => {
  cargando.value = true;
  try {
    const { data } = await informes.anual(anio.value);
    datos.value = data;
  } catch (e) {
    notif.error(mensajeError(e, 'No se pudo preparar el resumen'));
  } finally {
    cargando.value = false;
  }
};

const exportar = () => exportarExcel(`Resumen_anual_${anio.value}_${categoria.value}`, `Resumen anual de inventario ${anio.value} · ${catalogos.nombreCategoria(categoria.value)}`,
  ['Insumo', 'Inicio', ...MESES_CORTOS.map(m => `Salió ${m}`), 'Entró', 'Salió', 'Quedó'],
  filas.value.map(i => [i.nombre, i.inicial, ...i.meses.map(m => m.salidas), i.entradas, i.salidas, i.final]));
const imprimir = () => window.print();

watch(anio, cargar);
onMounted(() => { catalogos.cargar().catch(() => {}); cargar(); });
</script>

<style scoped>
.volver { display: inline-flex; align-items: center; gap: 4px; margin-bottom: 6px; font-size: 13.5px; color: var(--texto-tenue); text-decoration: none; }
.anual th, .anual td { padding-left: 8px; padding-right: 8px; }
.anual tbody td { height: 44px; }
.nota-tabla { padding: 10px 16px; font-size: 13px; color: var(--texto-tenue); }
@media print { .anual { font-size: 10px; } }
</style>
