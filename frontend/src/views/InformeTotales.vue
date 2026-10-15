<template>
  <div class="animar">
    <div class="titulo-seccion">
      <div>
        <router-link to="/informes" class="volver no-imprimir"><Icono nombre="flecha_izq" :tam="13" />Informes</router-link>
        <h1>Totales de servicios por tipo</h1>
      </div>
      <div class="acciones no-imprimir">
        <button class="btn btn-secundario" :disabled="!datos" @click="exportar"><Icono nombre="descargar" :tam="16" />Excel</button>
        <button class="btn btn-primario" :disabled="!datos" @click="imprimir"><Icono nombre="imprimir" :tam="16" />Imprimir</button>
      </div>
    </div>

    <div class="barra-filtros no-imprimir"><SelectorPeriodo v-model="periodo" /></div>

    <EncabezadoInforme titulo="Totales de servicios por tipo" :periodo="describirPeriodo(periodo.desde, periodo.hasta)" destinatario="Capital" />

    <div v-if="datos" class="tabla-contenedor">
      <table>
        <thead><tr><th>Tipo</th><th class="num">Atendidos</th><th class="num">Anulados</th><th>Números de control</th><th>Causas</th></tr></thead>
        <tbody>
          <tr v-for="t in datos.tipos" :key="t.tipo_servicio">
            <td><span class="tipo" :class="`tipo-${t.tipo_servicio}`">{{ t.nombre }}</span></td>
            <td class="num"><strong>{{ t.atendidos }}</strong></td>
            <td class="num">{{ t.anuladas || '—' }}</td>
            <td class="mono">{{ t.primero }} a {{ t.ultimo }}</td>
            <td class="causas">{{ t.causas.map(c => `${c.causa} ${c.servicios}`).join(' · ') }}</td>
          </tr>
        </tbody>
        <tfoot><tr><td>Total</td><td class="num">{{ datos.tipos.reduce((a, t) => a + t.atendidos, 0) }}</td><td class="num">{{ datos.tipos.reduce((a, t) => a + t.anuladas, 0) || '—' }}</td><td colspan="2"></td></tr></tfoot>
      </table>
      <div v-if="!datos.tipos.length" class="vacio"><strong>Sin servicios en el periodo</strong></div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
import { informes, mensajeError } from '../services/api';
import { useNotificacionesStore } from '../stores/notificaciones';
import { periodosRapidos, describirPeriodo } from '../utils/formato';
import { exportarExcel } from '../utils/exportar';
import SelectorPeriodo from '../components/SelectorPeriodo.vue';
import Icono from '../components/Icono.vue';
import EncabezadoInforme from '../components/informes/EncabezadoInforme.vue';

const notif = useNotificacionesStore();
const { desde, hasta } = periodosRapidos()[0];
const periodo = ref({ desde, hasta });
const datos = ref(null);

const cargar = async () => {
  try {
    const { data } = await informes.totales(periodo.value);
    datos.value = data;
  } catch (e) {
    notif.error(mensajeError(e, 'No se pudo preparar el informe'));
  }
};

const exportar = () => exportarExcel('Totales_por_tipo', `Totales de servicios por tipo · ${describirPeriodo(periodo.value.desde, periodo.value.hasta)}`,
  ['Tipo', 'Atendidos', 'Anulados', 'Primer número', 'Último número', 'Causas'],
  datos.value.tipos.map(t => [t.nombre, t.atendidos, t.anuladas, t.primero, t.ultimo, t.causas.map(c => `${c.causa} ${c.servicios}`).join('; ')]));
const imprimir = () => window.print();

watch(periodo, cargar);
onMounted(cargar);
</script>

<style scoped>
.volver { display: inline-flex; align-items: center; gap: 4px; margin-bottom: 6px; font-size: 13.5px; color: var(--texto-tenue); text-decoration: none; }
.causas { font-size: 13.5px; color: var(--texto-suave); max-width: 520px; }
</style>
