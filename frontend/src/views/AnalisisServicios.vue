<template>
  <div class="animar">
    <div class="titulo-seccion">
      <div>
        <h1>Análisis de servicios</h1>
      </div>
      <div class="acciones no-imprimir">
        <button class="btn btn-secundario" @click="imprimir" :disabled="!ind?.servicios"><Icono nombre="imprimir" :tam="16" />Imprimir</button>
      </div>
    </div>

    <div class="barra-filtros no-imprimir">
      <SelectorPeriodo v-model="periodo" />
      <select v-model="tipo" class="control control-sm" style="width:auto" aria-label="Tipo de servicio">
        <option value="">Todos los tipos</option>
        <option v-for="t in TIPOS" :key="t.valor" :value="t.valor">{{ t.nombre }}</option>
      </select>
    </div>

    <header class="solo-impresion membrete">
      <img src="/LogoBomberos.png" alt="" />
      <div>
        <strong>Benemérito Cuerpo Voluntario de Bomberos · 39ª Compañía, Chiquimula</strong>
        <span>Análisis de servicios · {{ describirPeriodo(periodo.desde, periodo.hasta) }}{{ tipo ? ` · ${nombreTipo(tipo)}` : '' }} · {{ ind?.servicios }} servicios</span>
      </div>
    </header>

    <div v-if="cargando && !ind" class="esqueleto" style="height:320px"></div>

    <div v-else-if="ind && !ind.servicios" class="tarjeta vacio">
      <Icono nombre="mapa" :tam="34" />
      <strong>No hay servicios en este periodo</strong>
      <p>Elija otro periodo o tipo de servicio. Las boletas anuladas no se cuentan.</p>
    </div>

    <template v-else-if="ind">
      <div v-if="ind.calidad_datos.sin_sector" class="aviso aviso-alerta mb no-imprimir">
        <Icono nombre="alerta" />
        <div><strong>{{ plural(ind.calidad_datos.sin_sector, 'boleta', 'boletas') }} sin sector</strong> en el periodo. No cuentan para las zonas de mayor incidencia.
          <router-link to="/catalogos?pestana=pendientes" class="btn-enlace">Asignarles sector</router-link></div>
      </div>

      <section class="indicadores mb">
        <router-link :to="aHistorial()" class="indicador">
          <span class="rotulo">Servicios</span>
          <div class="valor">{{ ind.servicios }}</div>
          <div class="pie"><span class="delta" :class="cambio(ind).clase">{{ cambio(ind).texto }}</span> frente a {{ ind.servicios_periodo_anterior }} del periodo anterior</div>
        </router-link>
        <div class="indicador">
          <span class="rotulo">Zonas de mayor incidencia</span>
          <div class="valor">{{ ind.zonas_mayor_incidencia.sectores }}<small>de {{ ind.zonas_mayor_incidencia.de }} sectores</small></div>
          <div class="pie">reúnen el {{ ind.zonas_mayor_incidencia.porcentaje }} % de los servicios</div>
        </div>
        <div class="indicador">
          <span class="rotulo">Franja con más servicios</span>
          <div class="valor valor-texto">{{ franjaPico?.servicios ? nombreFranja(franjaPico.franja) : '—' }}</div>
          <div class="pie">{{ franjaPico?.servicios ? `${franjaPico.servicios} servicios · ${horasFranja(franjaPico.franja)}` : '' }}</div>
        </div>
        <div class="indicador" :class="{ atencion: completitud < 90 }">
          <span class="rotulo">Datos completos</span>
          <div class="valor">{{ completitud }}<small>%</small></div>
          <div class="pie">boletas con sector, clasificación y hora</div>
        </div>
      </section>

      <section class="tarjeta mb hallazgos">
        <div class="tarjeta-cabecera">
          <h3>Hallazgos del periodo</h3>
          <span class="nota">calculados con los criterios descritos abajo</span>
        </div>
        <ul>
          <li v-for="(h, i) in ind.hallazgos" :key="i"><strong>{{ h.titulo }}</strong><p>{{ h.detalle }}</p></li>
        </ul>
      </section>

      <div class="rejilla rejilla-2 mb">
          <section class="tarjeta">
            <div class="tarjeta-cabecera"><h3>Franjas horarias</h3><span class="nota">hora de salida</span></div>
            <div class="tarjeta-cuerpo">
              <BarrasH :items="ind.franjas_horarias.map(f => ({ clave: f.franja, etiqueta: `${nombreFranja(f.franja)} · ${horasFranja(f.franja)}`, valor: f.servicios }))"
                       descripcion="Servicios por franja horaria" />
            </div>
          </section>

          <section class="tarjeta">
            <div class="tarjeta-cabecera"><h3>Tipo de incidente</h3><span class="nota">los 10 más frecuentes</span></div>
            <div class="tarjeta-cuerpo">
              <BarrasH v-if="ind.por_subtipo.length" :items="subtipos" descripcion="Servicios por tipo de incidente" />
              <p v-else class="tenue">Ninguna boleta del periodo tiene clasificación.</p>
            </div>
          </section>
      </div>

      <div>
        <section class="tarjeta">
          <div class="tarjeta-cabecera">
            <h3>Servicios por sector</h3>
            <span class="nota">comparado con {{ fechaCorta(ind.periodo.comparado_con.desde) }} – {{ fechaCorta(ind.periodo.comparado_con.hasta) }}</span>
          </div>
          <div class="tabla-contenedor">
            <table>
              <thead>
                <tr><th>Sector</th><th class="num">Servicios</th><th class="col-barra"><span class="sr">Proporción</span></th><th class="num">Cambio</th><th>Predomina</th><th class="num">Hora pico</th></tr>
              </thead>
              <tbody>
                <template v-for="(s, i) in sectores" :key="s.sector">
                  <tr class="fila-clic" @click="router.push(aHistorial({ sector_id: s.sector_id }))">
                    <td class="celda-principal">
                      <span :class="{ 'sin-sector': !s.sector_id }">{{ s.sector }}</span>
                    </td>
                    <td class="num"><strong>{{ s.servicios }}</strong><span class="celda-sec">{{ s.porcentaje }} %</span></td>
                    <td class="col-barra"><div class="barra"><span :style="{ width: (s.servicios / maxSector) * 100 + '%', '--c': colorDe(s.tipo_predominante) }"></span></div></td>
                    <td class="num"><span class="delta" :class="cambio(s).clase">{{ cambio(s).texto }}</span></td>
                    <td>
                      <span class="tipo" :style="{ '--c': colorDe(s.tipo_predominante) }">{{ s.tipo_predominante || '—' }}</span>
                      <span class="celda-sec">{{ s.incidente_predominante || '' }}</span>
                    </td>
                    <td class="num">{{ s.hora_pico || '—' }}</td>
                  </tr>
                  <tr v-if="i === ultimoPareto" class="corte">
                    <td colspan="6"><Icono nombre="mapa" :tam="14" />Zonas de mayor incidencia: reúnen el {{ ind.zonas_mayor_incidencia.porcentaje }} % de los servicios con sector</td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
          <div class="tarjeta-pie">
            <strong>Criterios.</strong> Zonas de mayor incidencia: los sectores que, ordenados de mayor a menor, reúnen el {{ ind.criterios.corte_pareto }} % de los servicios con sector.
            El cambio se expresa en porcentaje solo si el periodo anterior tuvo al menos {{ ind.criterios.base_minima_variacion }} servicios; si no, como diferencia de servicios.
          </div>
        </section>

      </div>

      <section class="tarjeta mt">
        <div class="tarjeta-cabecera"><h3>Lugares críticos</h3><span class="nota">puntos que la compañía ya reconoce</span></div>
        <div v-if="ind.por_lugar.length" class="tabla-contenedor">
          <table>
            <thead><tr><th>Lugar</th><th>Sector</th><th class="num">Servicios</th><th>Causa más frecuente</th></tr></thead>
            <tbody>
              <tr v-for="l in ind.por_lugar" :key="l.id">
                <td class="celda-principal">{{ l.nombre }}</td><td>{{ l.sector }}</td>
                <td class="num"><strong>{{ l.servicios }}</strong></td><td>{{ l.causa || '—' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="tarjeta-cuerpo tenue">Ningún servicio del periodo se marcó en un lugar crítico. Los lugares se registran en Configuración › Catálogos.</p>
      </section>

      <section class="tarjeta mt calor-tarjeta">
        <div class="tarjeta-cabecera"><h3>Día y hora de salida</h3><span class="nota">cada celda es una hora; más oscuro, más servicios</span></div>
        <div class="tarjeta-cuerpo">
          <MapaCalor :datos="ind.dia_hora" />
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { reportes, mensajeError } from '../services/api';
import { TIPOS, nombreTipo, colorTipo } from '../stores/catalogos';
import { useNotificacionesStore } from '../stores/notificaciones';
import { periodosRapidos, describirPeriodo, fechaCorta, plural, variacion } from '../utils/formato';
import SelectorPeriodo from '../components/SelectorPeriodo.vue';
import BarrasH from '../components/graficos/BarrasH.vue';
import MapaCalor from '../components/graficos/MapaCalor.vue';
import Icono from '../components/Icono.vue';

const router = useRouter();
const ruta = useRoute();
const notif = useNotificacionesStore();

// El periodo puede venir en la dirección (p. ej. el trimestre para la mesa interinstitucional)
const { desde, hasta } = periodosRapidos()[2];
const periodo = ref({ desde: ruta.query.desde || desde, hasta: ruta.query.hasta || hasta });
const tipo = ref('');
const ind = ref(null);
const cargando = ref(true);

const sectores = computed(() => ind.value.por_sector.filter(s => s.servicios > 0));
const maxSector = computed(() => Math.max(1, ...sectores.value.map(s => s.servicios)));
const ultimoPareto = computed(() => {
  let ultimo = -1;
  sectores.value.forEach((s, i) => { if (s.mayor_incidencia) ultimo = i; });
  return ultimo;
});
const franjaPico = computed(() => [...(ind.value?.franjas_horarias || [])].sort((a, b) => b.servicios - a.servicios)[0]);
const completitud = computed(() => {
  const c = ind.value?.calidad_datos;
  if (!c?.total) return 0;
  return Math.round((1 - (c.sin_sector + c.sin_clasificar + c.sin_hora) / (c.total * 3)) * 100);
});
const subtipos = computed(() => ind.value.por_subtipo.slice(0, 10).map(s => ({
  clave: `${s.tipo_servicio}-${s.subtipo}`, etiqueta: s.nombre, valor: s.servicios,
  color: colorTipo(s.tipo_servicio), to: aHistorial({ tipo_servicio: s.tipo_servicio, subtipo: s.subtipo })
})));

// "madrugada (00:00–05:59)" → "Madrugada" y "00–06 h"
const nombreFranja = (t) => { const n = t.split(' ')[0]; return n[0].toUpperCase() + n.slice(1); };
const horasFranja = (t) => {
  const m = t.match(/\((\d\d):\d\d–(\d\d):\d\d\)/);
  return m ? `${m[1]}–${String(Number(m[2]) + 1).padStart(2, '0')} h` : '';
};

// Porcentaje solo con base suficiente; si no, la diferencia en servicios
const cambio = (x) => {
  const anterior = x.periodo_anterior ?? x.servicios_periodo_anterior;
  if (x.variacion_porcentual != null) return variacion(x.variacion_porcentual);
  if (!anterior) return { texto: x.servicios ? 'sin servicios antes' : '—', clase: 'igual' };
  const d = x.diferencia;
  return { texto: d === 0 ? 'igual' : `${d > 0 ? '+' : '−'}${Math.abs(d)} servicios`, clase: d > 0 ? 'sube' : d < 0 ? 'baja' : 'igual' };
};

const colorDe = (nombre) => colorTipo(TIPOS.find(t => t.nombre === nombre)?.valor);

const aHistorial = (extra = {}) => ({
  path: '/historial',
  query: { desde: periodo.value.desde, hasta: periodo.value.hasta, ...(tipo.value ? { tipo_servicio: tipo.value } : {}), ...extra }
});

const cargar = async () => {
  cargando.value = true;
  try {
    const { data } = await reportes.servicios({ ...periodo.value, tipo_servicio: tipo.value || undefined });
    ind.value = data;
  } catch (e) {
    notif.error(mensajeError(e, 'No se pudo calcular el análisis'));
  } finally {
    cargando.value = false;
  }
};

const imprimir = () => window.print();

watch([periodo, tipo], cargar);
onMounted(cargar);
</script>

<style scoped>
.valor-texto { font-family: var(--fuente) !important; font-size: 22px !important; line-height: 1.3 !important; }
.indicador .valor small { font-family: var(--fuente); }

.hallazgos ul { list-style: none; }
.hallazgos li { padding: 14px 20px; border-bottom: 1px solid var(--borde); }
.hallazgos li:last-child { border-bottom: none; }
.hallazgos li strong { font-size: 15px; }
.hallazgos li p { margin-top: 3px; font-size: 14px; color: var(--texto-suave); line-height: 1.5; }

.celda-principal { min-width: 170px; }
.sin-sector { color: var(--alerta); }
.col-barra { width: 16%; min-width: 80px; }
.corte td { height: auto; padding: 8px 16px; font-size: 13px; font-weight: 600; color: var(--texto); background: var(--superficie-hundida); border-top: 2px solid var(--texto-tenue); }
.corte td svg { vertical-align: -2px; margin-right: 6px; }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
.tarjeta-pie { line-height: 1.5; }

.membrete { display: none; }
@media print {
  .membrete { display: flex; gap: 14px; align-items: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 14px; }
  .membrete img { width: 54px; }
  .membrete strong { display: block; font-size: 13px; }
  .membrete span { font-size: 11px; }
  .calor-tarjeta { break-inside: avoid; }
}
</style>
