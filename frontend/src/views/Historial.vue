<template>
  <div class="animar">
    <div class="titulo-seccion">
      <div>
        <h1>Historial de servicios</h1>
      </div>
      <div class="acciones">
        <button class="btn btn-secundario" @click="imprimir" :disabled="!servicios.length"><Icono nombre="imprimir" :tam="15" />Imprimir listado</button>
      </div>
    </div>

    <div class="barra-filtros no-imprimir">
      <div class="busqueda">
        <Icono nombre="buscar" :tam="15" />
        <input v-model="texto" class="control" type="search" placeholder="Control, dirección, solicitante, paciente…" aria-label="Buscar" />
      </div>
      <div class="segmentos" role="group" aria-label="Tipo de servicio">
        <button :class="{ activo: !f.tipo_servicio }" @click="f.tipo_servicio = ''">Todos</button>
        <button v-for="t in TIPOS" :key="t.valor" :class="{ activo: f.tipo_servicio === t.valor }" @click="f.tipo_servicio = t.valor">
          <span class="tipo" :class="`tipo-${t.valor}`" style="font-size:inherit">{{ t.corto }}</span>
        </button>
      </div>
      <button class="btn btn-secundario" :class="{ 'con-filtros': filtrosActivos }" @click="masFiltros = !masFiltros" :aria-expanded="masFiltros">
        <Icono nombre="filtro" :tam="14" />Filtros<span v-if="filtrosActivos" class="mono cuenta-f">{{ filtrosActivos }}</span>
      </button>
    </div>

    <div v-if="masFiltros" class="tarjeta filtros-extra no-imprimir">
      <div class="campo">
        <label>Causa</label>
        <select v-model="f.subtipo" class="control control-sm" :disabled="!f.tipo_servicio">
          <option value="">Todas</option>
          <option v-for="s in catalogos.subtipos(f.tipo_servicio)" :key="s.valor" :value="s.valor">{{ s.nombre }}</option>
        </select>
      </div>
      <div class="campo">
        <label>Sector</label>
        <select v-model="f.sector_id" class="control control-sm">
          <option value="">Todos</option>
          <option value="sin">— Sin sector asignado</option>
          <option v-for="s in catalogos.sectores" :key="s.id" :value="String(s.id)">{{ s.nombre }}</option>
        </select>
      </div>
      <div class="campo">
        <label>Unidad</label>
        <select v-model="f.unidad_id" class="control control-sm">
          <option value="">Todas</option>
          <option v-for="u in catalogos.unidades" :key="u.id" :value="String(u.id)">{{ u.codigo }}</option>
        </select>
      </div>
      <div class="campo">
        <label>Desde</label>
        <input v-model="f.desde" type="date" class="control control-sm mono" :max="f.hasta || hoy()" />
      </div>
      <div class="campo">
        <label>Hasta</label>
        <input v-model="f.hasta" type="date" class="control control-sm mono" :min="f.desde" :max="hoy()" />
      </div>
      <div class="campo">
        <label>Estado</label>
        <select v-model="f.estado" class="control control-sm">
          <option value="">Vigentes</option>
          <option value="en_curso">Unidad fuera</option>
          <option value="pendiente">Por completar</option>
          <option value="completa">Completas sin firmar</option>
          <option value="firmada">Firmadas</option>
          <option value="anulada">Anuladas</option>
          <option value="todas">Todas</option>
        </select>
      </div>
      <button class="btn btn-plano btn-sm" @click="limpiarFiltros" :disabled="!filtrosActivos">Quitar filtros</button>
    </div>

    <div class="solo-impresion encabezado-impresion">
      <h2>39ª Compañía de Bomberos Voluntarios · Listado de servicios</h2>
      <p>{{ resumenFiltros }} · {{ total }} registros · generado el {{ fechaLarga(hoy()) }}</p>
    </div>

    <div class="tabla-contenedor">
      <table>
        <thead>
          <tr>
            <th>Número</th>
            <th>Fecha y hora</th>
            <th>Tipo y causa</th>
            <th>Sector y dirección</th>
            <th>Unidad</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          <template v-if="cargando && !servicios.length">
            <tr v-for="i in 6" :key="i"><td colspan="6"><div class="esqueleto" style="height:14px"></div></td></tr>
          </template>
          <tr v-for="s in servicios" :key="s.id" class="fila-clic" :class="{ atenuada: s.estado === 'anulada' }"
              @click="$router.push(`/historial/${s.id}`)" tabindex="0" @keydown.enter="$router.push(`/historial/${s.id}`)">
            <td>
              <span v-if="s.numero_control" class="mono celda-principal">{{ s.numero_control }}</span>
              <span v-else class="tenue">Sin número</span>
            </td>
            <td class="mono nowrap">{{ fecha(s.fecha) }}<span class="celda-sec">{{ s.hora_salida ? hora(s.hora_salida) : '' }}</span></td>
            <td>
              <span class="tipo" :class="`tipo-${s.tipo_servicio}`">{{ corteTipo(s.tipo_servicio) }}</span>
              <span class="celda-sec">{{ s.subtipo ? catalogos.nombreSubtipo(s.tipo_servicio, s.subtipo) : 'Sin causa' }}</span>
            </td>
            <td class="col-dir">
              <span :class="s.sector ? '' : 'sin-sector'">{{ s.sector || 'Sin sector' }}</span>
              <span class="celda-sec">{{ s.direccion }}</span>
            </td>
            <td class="mono">{{ s.unidad || '—' }}</td>
            <td><span class="etiqueta" :class="CLASE_ESTADO[s.estado]">{{ catalogos.nombreEstado(s.estado) }}</span></td>
          </tr>
        </tbody>
      </table>
      <div v-if="!cargando && !servicios.length" class="vacio">
        <Icono nombre="historial" :tam="28" />
        <strong>{{ filtrosActivos || texto ? 'Ninguna boleta coincide con la búsqueda' : 'Aún no hay boletas registradas' }}</strong>
        <p v-if="filtrosActivos || texto">Pruebe con otros filtros o un periodo más amplio.</p>
        <button v-if="filtrosActivos || texto" class="btn btn-secundario btn-sm" @click="limpiarFiltros">Quitar filtros</button>
      </div>
      <Paginador :total="total" :pagina="pagina" :tamano="tamano" @update:pagina="(p) => { pagina = p; cargar(); }" class="no-imprimir" />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { emergencias, mensajeError } from '../services/api';
import { useNotificacionesStore } from '../stores/notificaciones';
import { useCatalogosStore, TIPOS, corteTipo, nombreTipo } from '../stores/catalogos';
import { fecha, fechaLarga, hora, hoy, describirPeriodo } from '../utils/formato';
import Paginador from '../components/Paginador.vue';
import Icono from '../components/Icono.vue';

const ruta = useRoute();
const router = useRouter();
const notif = useNotificacionesStore();
const catalogos = useCatalogosStore();

const CLASE_ESTADO = { en_curso: 'et-info', pendiente: 'et-alerta', completa: 'et-neutra', firmada: 'et-exito', anulada: 'et-peligro' };
const CLAVES = ['tipo_servicio', 'subtipo', 'sector_id', 'unidad_id', 'desde', 'hasta', 'estado'];
const f = reactive(Object.fromEntries(CLAVES.map(k => [k, ruta.query[k] || ''])));
const texto = ref(ruta.query.texto || '');
const masFiltros = ref(['subtipo', 'sector_id', 'unidad_id', 'desde', 'hasta', 'estado'].some(k => f[k]));

const servicios = ref([]);
const total = ref(0);
const pagina = ref(1);
const tamano = 25;
const cargando = ref(false);

const filtrosActivos = computed(() => ['subtipo', 'sector_id', 'unidad_id', 'desde', 'hasta', 'estado'].filter(k => f[k]).length);

const resumenFiltros = computed(() => [
  f.tipo_servicio ? nombreTipo(f.tipo_servicio) : 'Todos los tipos',
  f.sector_id && f.sector_id !== 'sin' ? catalogos.sector(f.sector_id)?.nombre : null,
  f.desde || f.hasta ? describirPeriodo(f.desde || '2000-01-01', f.hasta || hoy()) : null
].filter(Boolean).join(' · '));

const cargar = async () => {
  cargando.value = true;
  try {
    const params = { pagina: pagina.value, tamano, texto: texto.value || undefined };
    for (const k of CLAVES) if (f[k]) params[k === 'desde' ? 'fecha_inicio' : k === 'hasta' ? 'fecha_fin' : k] = f[k];
    const { data } = await emergencias.listar(params);
    servicios.value = data.servicios;
    total.value = data.total;
  } catch (e) {
    notif.error(mensajeError(e, 'No se pudo consultar el historial'));
  } finally {
    cargando.value = false;
  }
};

// Los filtros viven en la URL: se pueden compartir y el botón "atrás" los conserva
const sincronizarUrl = () => {
  const query = Object.fromEntries(Object.entries({ ...f, texto: texto.value }).filter(([, v]) => v));
  router.replace({ query });
};

watch(f, () => {
  if (!f.tipo_servicio) f.subtipo = '';
  pagina.value = 1;
  sincronizarUrl();
  cargar();
});

let espera = null;
watch(texto, () => {
  clearTimeout(espera);
  espera = setTimeout(() => { pagina.value = 1; sincronizarUrl(); cargar(); }, 300);
});

const limpiarFiltros = () => {
  texto.value = '';
  Object.assign(f, Object.fromEntries(CLAVES.map(k => [k, k === 'tipo_servicio' ? f.tipo_servicio : ''])));
};

const imprimir = () => window.print();

onMounted(cargar);
</script>

<style scoped>
.filtros-extra {
  display: flex; flex-wrap: wrap; align-items: flex-end; gap: 12px;
  padding: 12px 14px; margin: -4px 0 14px;
}
.filtros-extra .campo { margin: 0; min-width: 140px; }
.filtros-extra .campo label { font-size: 11px; }
.con-filtros { border-color: var(--texto); }
.cuenta-f {
  min-width: 18px; height: 18px; padding: 0 4px; display: inline-flex; align-items: center; justify-content: center;
  font-size: 10.5px; background: var(--texto); color: var(--superficie); border-radius: 3px;
}
.nowrap { white-space: nowrap; }
.col-dir { max-width: 340px; }
.col-dir .celda-sec { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 340px; }
.sin-sector { color: var(--alerta); font-weight: 600; }
.encabezado-impresion { margin-bottom: 12px; }
.encabezado-impresion h2 { font-size: 14px; }
.encabezado-impresion p { font-size: 11px; color: #444; }

@media print {
  .tabla-contenedor { border: none; }
  table { font-size: 10px; }
  tbody td { height: auto; padding: 4px 6px; }
}
</style>
