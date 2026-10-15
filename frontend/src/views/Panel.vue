<template>
  <div class="animar">
    <div class="titulo-seccion">
      <div>
        <h1>Resumen del periodo</h1>
        <p class="sub">Actividad de <strong>{{ describirPeriodo(periodo.desde, periodo.hasta) }}</strong>, comparada con los {{ d?.periodo?.dias || '—' }} días anteriores.</p>
      </div>
      <div class="acciones">
        <SelectorPeriodo v-model="periodo" />
      </div>
    </div>

    <div v-if="catalogos.cargado && !catalogos.sectores.length && auth.esAdministrador" class="aviso aviso-alerta mb">
      <Icono nombre="alerta" />
      <div><strong>El catálogo de sectores está vacío.</strong> Las boletas exigen un sector y el análisis de zonas depende de él.
        <router-link to="/catalogos" class="btn-enlace">Cargar sectores</router-link></div>
    </div>
    <div v-else-if="d?.resumen?.sin_sector" class="aviso aviso-info mb">
      <Icono nombre="info" />
      <div><strong>{{ plural(d.resumen.sin_sector, 'boleta no tiene', 'boletas no tienen') }} sector asignado</strong> en este periodo y no cuentan en el análisis por zona.
        <router-link v-if="auth.esAdministrador" to="/catalogos?pestana=pendientes" class="btn-enlace">Asignar</router-link></div>
    </div>

    <section class="indicadores mb" aria-label="Indicadores del periodo">
      <div class="indicador">
        <span class="rotulo">Servicios atendidos</span>
        <div class="valor">{{ cargando ? '…' : numero(d.resumen.servicios) }}</div>
        <div class="pie" v-if="!cargando">
          <span class="delta" :class="variacion(d.resumen.variacion).clase">{{ variacion(d.resumen.variacion).texto }}</span>
          <span>vs. {{ d.resumen.servicios_anterior }}</span>
        </div>
      </div>
      <div class="indicador">
        <span class="rotulo">Tiempo promedio</span>
        <div class="valor">{{ cargando || d.resumen.minutos_promedio == null ? '—' : d.resumen.minutos_promedio }}<small v-if="d?.resumen?.minutos_promedio != null">min</small></div>
        <div class="pie">por servicio, salida a entrada</div>
      </div>
      <div class="indicador">
        <span class="rotulo">Sectores atendidos</span>
        <div class="valor">{{ cargando ? '…' : d.resumen.sectores_con_servicio }}</div>
        <div class="pie">de {{ catalogos.sectores.length }} en el catálogo</div>
      </div>
      <router-link to="/inventario?estado=agotado" class="indicador" :class="{ critico: d?.inventario?.agotados }">
        <span class="rotulo">Insumos agotados</span>
        <div class="valor">{{ cargando ? '…' : d.inventario.agotados }}</div>
        <div class="pie">{{ cargando ? '' : `${d.inventario.bajos} más bajo el mínimo` }}</div>
      </router-link>
      <router-link to="/lotes?estado=vencidos" class="indicador" :class="{ critico: d?.inventario?.lotes_vencidos, atencion: !d?.inventario?.lotes_vencidos && d?.inventario?.lotes_por_vencer }">
        <span class="rotulo">Lotes vencidos</span>
        <div class="valor">{{ cargando ? '…' : d.inventario.lotes_vencidos }}</div>
        <div class="pie">{{ cargando ? '' : `${d.inventario.lotes_por_vencer} vencen en 30 días` }}</div>
      </router-link>
    </section>

    <div class="rejilla-panel">
      <section class="tarjeta area-dias">
        <div class="tarjeta-cabecera">
          <h3>Servicios por día</h3>
          <span class="nota mono">{{ fechaCorta(periodo.desde) }} – {{ fechaCorta(periodo.hasta) }}</span>
        </div>
        <div class="tarjeta-cuerpo">
          <div v-if="cargando" class="esqueleto" style="height:200px"></div>
          <ColumnasApiladas v-else :datos="serieDiaria" :series="[{ clave: 'total', nombre: 'Servicios', color: 'var(--acento)' }]"
                            :alto="200" descripcion="Servicios atendidos por día" />
        </div>
      </section>

      <section class="tarjeta area-tipos">
        <div class="tarjeta-cabecera"><h3>Por tipo de servicio</h3><span class="nota">vs. periodo anterior</span></div>
        <div class="tarjeta-cuerpo">
          <div v-if="cargando" class="esqueleto" style="height:150px"></div>
          <div v-else-if="!d.por_tipo.length" class="vacio"><p>Sin servicios en el periodo</p></div>
          <BarrasH v-else :items="barrasTipo" descripcion="Servicios por tipo" />
        </div>
      </section>

      <section class="tarjeta area-sectores">
        <div class="tarjeta-cabecera">
          <h3>Sectores con mayor incidencia</h3>
          <router-link v-if="auth.esAdministrador" to="/servicios" class="btn btn-plano btn-sm">Ver análisis <Icono nombre="flecha_der" :tam="13" /></router-link>
        </div>
        <div class="tarjeta-cuerpo">
          <div v-if="cargando" class="esqueleto" style="height:150px"></div>
          <div v-else-if="!d.por_sector.length" class="vacio"><p>Sin servicios en el periodo</p></div>
          <BarrasH v-else :items="barrasSector" descripcion="Servicios por sector" />
          <p v-if="!cargando && d.por_sector.length" class="nota-color">El color indica el tipo de servicio que predomina en el sector.</p>
        </div>
      </section>

      <section class="tarjeta area-recientes">
        <div class="tarjeta-cabecera">
          <h3>Últimos servicios</h3>
          <router-link to="/historial" class="btn btn-plano btn-sm">Historial <Icono nombre="flecha_der" :tam="13" /></router-link>
        </div>
        <div v-if="!cargando && !d.recientes.length" class="vacio">
          <strong>Aún no hay boletas</strong>
          <router-link to="/registrar" class="btn btn-rojo btn-sm"><Icono nombre="mas" :tam="14" />Registrar la primera</router-link>
        </div>
        <ul v-else class="recientes">
          <li v-for="r in d?.recientes || []" :key="r.id">
            <router-link :to="`/historial/${r.id}`">
              <span class="principal-r">
                <span class="tipo" :class="`tipo-${r.tipo_servicio}`">{{ corteTipo(r.tipo_servicio) }}</span>
                <span class="sector-r">{{ r.sector || 'Sin sector' }}</span>
              </span>
              <span class="lado-r">
                <span class="mono control-n">{{ r.numero_control }}</span>
                <span class="mono fecha-r">{{ fechaCorta(r.fecha) }} {{ r.hora_salida ? hora(r.hora_salida) : '' }}</span>
              </span>
            </router-link>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { reportes, mensajeError } from '../services/api';
import { useAuthStore } from '../stores/auth';
import { useCatalogosStore, corteTipo, colorTipo, nombreTipo } from '../stores/catalogos';
import { useNotificacionesStore } from '../stores/notificaciones';
import { periodosRapidos, describirPeriodo, numero, plural, variacion, fechaCorta, hora } from '../utils/formato';
import SelectorPeriodo from '../components/SelectorPeriodo.vue';
import ColumnasApiladas from '../components/graficos/ColumnasApiladas.vue';
import BarrasH from '../components/graficos/BarrasH.vue';
import Icono from '../components/Icono.vue';

const auth = useAuthStore();
const catalogos = useCatalogosStore();
const notif = useNotificacionesStore();

const { desde, hasta } = periodosRapidos()[0];
const periodo = ref({ desde, hasta });
const d = ref(null);
const cargando = ref(true);

const serieDiaria = computed(() => {
  const dias = d.value?.por_dia || [];
  const cada = dias.length > 62 ? 14 : dias.length > 31 ? 7 : dias.length > 16 ? 3 : 1;
  return dias.map((x, i) => ({
    clave: x.fecha,
    etiqueta: i % cada === 0 ? String(Number(x.fecha.slice(8))) : '',
    detalle: fechaCorta(x.fecha),
    valores: { total: x.total }
  }));
});

const barrasTipo = computed(() => d.value.por_tipo.map(t => ({
  clave: t.tipo_servicio, etiqueta: nombreTipo(t.tipo_servicio), valor: t.total,
  color: colorTipo(t.tipo_servicio), secundario: variacion(t.variacion).texto,
  to: `/historial?tipo_servicio=${t.tipo_servicio}&desde=${periodo.value.desde}&hasta=${periodo.value.hasta}`
})));

const barrasSector = computed(() => d.value.por_sector.map(s => ({
  clave: s.sector_id ?? 'sin', etiqueta: s.sector, valor: s.total, color: colorTipo(s.tipo_predominante),
  to: s.sector_id ? `/historial?sector_id=${s.sector_id}&desde=${periodo.value.desde}&hasta=${periodo.value.hasta}` : null
})));

const cargar = async () => {
  cargando.value = true;
  try {
    const { data } = await reportes.panel(periodo.value);
    d.value = data;
  } catch (e) {
    notif.error(mensajeError(e, 'No se pudo cargar el panel'));
  } finally {
    cargando.value = false;
  }
};

watch(periodo, cargar);
onMounted(cargar);
</script>

<style scoped>
.rejilla-panel {
  display: grid;
  grid-template-columns: minmax(0, 1.55fr) minmax(0, 1fr);
  gap: 16px;
}
.area-dias { grid-column: 1; }
.area-tipos { grid-column: 2; }
.area-sectores { grid-column: 1; }
.area-recientes { grid-column: 2; }

.nota-color { margin-top: 14px; font-size: 11.5px; color: var(--texto-tenue); }

.recientes { list-style: none; }
.recientes li + li { border-top: 1px solid var(--borde); }
.recientes a {
  display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 12px;
  padding: 11px 20px; text-decoration: none; font-size: 14px;
}
.principal-r, .lado-r { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.lado-r { align-items: flex-end; }
.recientes a:hover { background: var(--superficie-alt); }
.control-n { font-size: 13px; font-weight: 600; }
.sector-r { color: var(--texto-suave); font-size: 13.5px; }
.fecha-r { font-size: 11.5px; color: var(--texto-tenue); }

@media (max-width: 1100px) {
  .rejilla-panel { grid-template-columns: 1fr; }
  .rejilla-panel > * { grid-column: 1 !important; }
}
</style>
