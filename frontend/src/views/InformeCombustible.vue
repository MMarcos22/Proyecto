<template>
  <div class="animar">
    <div class="titulo-seccion">
      <div>
        <router-link to="/informes" class="volver no-imprimir"><Icono nombre="flecha_izq" :tam="13" />Informes</router-link>
        <h1>Salidas por unidad</h1>
      </div>
      <div class="acciones no-imprimir">
        <button class="btn btn-secundario" :disabled="!datos" @click="exportar"><Icono nombre="descargar" :tam="16" />Excel</button>
        <button class="btn btn-primario" :disabled="!datos" @click="imprimir"><Icono nombre="imprimir" :tam="16" />Imprimir</button>
      </div>
    </div>

    <div class="tarjeta filtros no-imprimir">
      <div class="campo">
        <label for="c-unidad">Unidad</label>
        <select id="c-unidad" v-model="unidad" class="control mono">
          <option :value="null" disabled>Elija la unidad…</option>
          <option v-for="u in catalogos.unidades" :key="u.id" :value="u.id">{{ u.codigo }}{{ u.descripcion ? ` · ${u.descripcion}` : '' }}</option>
        </select>
      </div>
      <div class="rejilla rejilla-2">
        <div class="campo"><label for="c-desde">Desde (fecha de la carga)</label><input id="c-desde" v-model="desde" type="date" class="control mono" :max="hasta" /></div>
        <div class="campo"><label for="c-hasta">Hasta (día antes de la siguiente carga)</label><input id="c-hasta" v-model="hasta" type="date" class="control mono" :min="desde" :max="hoy()" /></div>
      </div>
    </div>

    <EncabezadoInforme :titulo="datos ? `Salidas de la unidad ${datos.unidad.codigo}` : ''" :periodo="datos ? `Del ${fecha(datos.desde)} al ${fecha(datos.hasta)}` : ''" destinatario="Capital (combustible)" />

    <template v-if="datos">
      <section class="indicadores mb mt">
        <div class="indicador"><span class="rotulo">Salidas de la unidad {{ datos.unidad.codigo }}</span><div class="valor">{{ datos.salidas }}</div>
          <div class="pie">{{ datos.por_tipo.map(t => `${t.servicios} ${t.tipo.toLowerCase()}`).join(' · ') || 'ninguna en el periodo' }}</div></div>
        <div class="indicador"><span class="rotulo">Tiempo en servicio</span><div class="valor">{{ minutos(datos.minutos) }}</div><div class="pie">de salida a entrada</div></div>
      </section>
      <div class="tabla-contenedor">
        <table>
          <thead><tr><th>Número</th><th>Fecha</th><th>Salida</th><th>Entrada</th><th>Tipo y causa</th><th>Lugar</th></tr></thead>
          <tbody>
            <tr v-for="s in datos.servicios" :key="s.id" class="fila-clic" @click="$router.push(`/historial/${s.id}`)">
              <td class="mono celda-principal">{{ s.numero_control }}</td>
              <td class="mono">{{ fecha(s.fecha) }}</td>
              <td class="mono">{{ s.hora_salida?.slice(0, 5) || '—' }}</td>
              <td class="mono">{{ s.hora_entrada?.slice(0, 5) || '—' }}</td>
              <td><span class="tipo" :class="`tipo-${s.tipo_servicio}`">{{ nombreTipo(s.tipo_servicio) }}</span><span class="celda-sec">{{ catalogos.nombreSubtipo(s.tipo_servicio, s.subtipo) }}</span></td>
              <td>{{ s.sector }}<span class="celda-sec">{{ s.direccion }}</span></td>
            </tr>
          </tbody>
        </table>
        <div v-if="!datos.servicios.length" class="vacio"><strong>La unidad no tuvo salidas en esas fechas</strong></div>
      </div>
    </template>
    <div v-else class="tarjeta vacio mt"><Icono nombre="ambulancia" :tam="30" /><strong>Elija la unidad y las fechas</strong></div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
import { informes, mensajeError } from '../services/api';
import { useCatalogosStore, nombreTipo } from '../stores/catalogos';
import { useNotificacionesStore } from '../stores/notificaciones';
import { fecha, minutos, hoy, sumarDias } from '../utils/formato';
import { exportarExcel } from '../utils/exportar';
import Icono from '../components/Icono.vue';
import EncabezadoInforme from '../components/informes/EncabezadoInforme.vue';

const catalogos = useCatalogosStore();
const notif = useNotificacionesStore();
const unidad = ref(null);
const desde = ref(sumarDias(hoy(), -7));
const hasta = ref(hoy());
const datos = ref(null);

const cargar = async () => {
  if (!unidad.value || !desde.value) return;
  try {
    const { data } = await informes.salidasUnidad({ unidad_id: unidad.value, desde: desde.value, hasta: hasta.value });
    datos.value = data;
  } catch (e) {
    notif.error(mensajeError(e, 'No se pudo preparar el informe'));
  }
};

const exportar = () => exportarExcel(`Salidas_${datos.value.unidad.codigo}_${desde.value}`, `Salidas de la unidad ${datos.value.unidad.codigo} del ${fecha(desde.value)} al ${fecha(hasta.value)}`,
  ['Número', 'Fecha', 'Salida', 'Entrada', 'Tipo', 'Causa', 'Sector', 'Dirección'],
  datos.value.servicios.map(s => [s.numero_control, fecha(s.fecha), s.hora_salida?.slice(0, 5), s.hora_entrada?.slice(0, 5), nombreTipo(s.tipo_servicio), catalogos.nombreSubtipo(s.tipo_servicio, s.subtipo), s.sector, s.direccion]));
const imprimir = () => window.print();

watch([unidad, desde, hasta], cargar);
onMounted(() => catalogos.cargar().catch(() => {}));
</script>

<style scoped>
.volver { display: inline-flex; align-items: center; gap: 4px; margin-bottom: 6px; font-size: 13.5px; color: var(--texto-tenue); text-decoration: none; }
.filtros { padding: 18px 20px 4px; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 2fr); gap: 0 16px; align-items: end; }
@media (max-width: 760px) { .filtros { grid-template-columns: 1fr; } }
</style>
