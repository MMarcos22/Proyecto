<template>
  <div class="animar">
    <div class="titulo-seccion">
      <div>
        <router-link to="/informes" class="volver no-imprimir"><Icono nombre="flecha_izq" :tam="13" />Informes</router-link>
        <h1>Personas atendidas y accidentes</h1>
      </div>
      <div class="acciones no-imprimir">
        <button class="btn btn-secundario" :disabled="!datos" @click="exportar"><Icono nombre="descargar" :tam="16" />Excel</button>
        <button class="btn btn-primario" :disabled="!datos" @click="imprimir"><Icono nombre="imprimir" :tam="16" />Imprimir</button>
      </div>
    </div>

    <div class="barra-filtros no-imprimir"><SelectorPeriodo v-model="periodo" /></div>

    <EncabezadoInforme titulo="Personas atendidas y accidentes" :periodo="describirPeriodo(periodo.desde, periodo.hasta)" destinatario="Municipalidad de Chiquimula (convenio)" />

    <template v-if="datos">
      <section class="indicadores mb">
        <div class="indicador"><span class="rotulo">Servicios atendidos</span><div class="valor">{{ datos.total.servicios }}</div></div>
        <div class="indicador"><span class="rotulo">Personas atendidas</span><div class="valor">{{ datos.total.personas }}</div><div class="pie">pacientes y rescatados registrados</div></div>
        <div class="indicador"><span class="rotulo">Accidentes</span><div class="valor">{{ datos.total.accidentes }}</div><div class="pie">{{ datos.total.personas_accidentes }} personas atendidas en ellos</div></div>
      </section>
      <div class="rejilla rejilla-2">
        <section class="tarjeta">
          <div class="tarjeta-cabecera"><h3>Mes por mes</h3></div>
          <table>
            <thead><tr><th>Mes</th><th class="num">Servicios</th><th class="num">Personas</th><th class="num">Accidentes</th></tr></thead>
            <tbody>
              <tr v-for="m in datos.meses" :key="m.mes"><td>{{ nombreMes(m.mes) }}</td><td class="num">{{ m.servicios }}</td><td class="num">{{ m.personas }}</td><td class="num">{{ m.accidentes }}</td></tr>
            </tbody>
          </table>
        </section>
        <section class="tarjeta">
          <div class="tarjeta-cabecera"><h3>Accidentes por causa</h3></div>
          <div class="tarjeta-cuerpo">
            <BarrasH v-if="datos.accidentes_por_causa.length" :items="datos.accidentes_por_causa.map(c => ({ clave: c.causa, etiqueta: c.causa, valor: c.servicios }))" descripcion="Accidentes por causa" />
            <p v-else class="tenue">Sin accidentes en el periodo.</p>
          </div>
        </section>
      </div>
      <p class="nota-tabla">Las personas se cuentan con los nombres escritos en las boletas de ambulancia y rescate.</p>
    </template>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
import { informes, mensajeError } from '../services/api';
import { useNotificacionesStore } from '../stores/notificaciones';
import { periodosRapidos, describirPeriodo, MESES } from '../utils/formato';
import { exportarExcel } from '../utils/exportar';
import SelectorPeriodo from '../components/SelectorPeriodo.vue';
import BarrasH from '../components/graficos/BarrasH.vue';
import Icono from '../components/Icono.vue';
import EncabezadoInforme from '../components/informes/EncabezadoInforme.vue';

const notif = useNotificacionesStore();
const { desde, hasta } = periodosRapidos()[2];
const periodo = ref({ desde, hasta });
const datos = ref(null);

const nombreMes = (m) => `${MESES[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`;

const cargar = async () => {
  try {
    const { data } = await informes.personas(periodo.value);
    datos.value = data;
  } catch (e) {
    notif.error(mensajeError(e, 'No se pudo preparar el informe'));
  }
};

const exportar = () => exportarExcel('Personas_atendidas', `Personas atendidas y accidentes · ${describirPeriodo(periodo.value.desde, periodo.value.hasta)}`,
  ['Mes', 'Servicios', 'Personas atendidas', 'Accidentes', 'Personas en accidentes'],
  [...datos.value.meses.map(m => [nombreMes(m.mes), m.servicios, m.personas, m.accidentes, m.personas_accidentes]),
   ['Total', datos.value.total.servicios, datos.value.total.personas, datos.value.total.accidentes, datos.value.total.personas_accidentes]]);
const imprimir = () => window.print();

watch(periodo, cargar);
onMounted(cargar);
</script>

<style scoped>
.volver { display: inline-flex; align-items: center; gap: 4px; margin-bottom: 6px; font-size: 13.5px; color: var(--texto-tenue); text-decoration: none; }
.nota-tabla { margin-top: 12px; font-size: 13px; color: var(--texto-tenue); }
</style>
