<template>
  <div class="animar">
    <div class="titulo-seccion">
      <div>
        <h1>Demanda y recursos</h1>
      </div>
    </div>

    <div class="barra-filtros">
      <SelectorPeriodo v-model="periodo" />
      <select v-model="tipo" class="control control-sm" style="width:auto" aria-label="Tipo de servicio">
        <option value="">Todos los tipos</option>
        <option v-for="t in TIPOS" :key="t.valor" :value="t.valor">{{ t.nombre }}</option>
      </select>
      <select v-model="sector" class="control control-sm" style="width:auto" aria-label="Sector">
        <option value="">Todos los sectores</option>
        <option v-for="s in catalogos.sectores" :key="s.id" :value="String(s.id)">{{ s.nombre }}</option>
      </select>
    </div>

    <div v-if="cargando && !d" class="esqueleto" style="height:300px"></div>

    <div v-else-if="d" class="rejilla-demanda">
      <section class="tarjeta ancho-total">
        <div class="tarjeta-cabecera">
          <h3>Servicios por mes</h3>
          <span class="nota">12 meses hasta {{ fechaCorta(periodo.hasta) }}</span>
        </div>
        <div class="tarjeta-cuerpo">
          <ColumnasApiladas :datos="serieMensual" :series="series" :alto="230" descripcion="Servicios por mes y tipo de servicio" />
          <details class="ver-tabla">
            <summary>Ver como tabla</summary>
            <table>
              <thead><tr><th>Mes</th><th v-for="s in series" :key="s.clave" class="num">{{ s.nombre }}</th><th class="num">Total</th></tr></thead>
              <tbody>
                <tr v-for="m in serieMensual" :key="m.clave">
                  <td>{{ m.detalle }}</td>
                  <td v-for="s in series" :key="s.clave" class="num">{{ m.valores[s.clave] || 0 }}</td>
                  <td class="num"><strong>{{ Object.values(m.valores).reduce((a, b) => a + b, 0) }}</strong></td>
                </tr>
              </tbody>
            </table>
          </details>
        </div>
      </section>

      <section class="tarjeta">
        <div class="tarjeta-cabecera">
          <h3>Día y hora de salida</h3>
          <span class="nota">{{ describirPeriodo(periodo.desde, periodo.hasta) }}</span>
        </div>
        <div class="tarjeta-cuerpo">
          <MapaCalor :datos="d.calor" />
          <p v-if="d.sin_hora" class="nota-pie">{{ plural(d.sin_hora, 'boleta no tiene', 'boletas no tienen') }} hora de salida y no aparecen en el mapa.</p>
          <p v-if="pico" class="hallazgo"><strong>Mayor demanda:</strong> {{ pico }}</p>
        </div>
      </section>

      <section class="tarjeta">
        <div class="tarjeta-cabecera"><h3>Clasificación de incidentes</h3><span class="nota">{{ describirPeriodo(periodo.desde, periodo.hasta) }}</span></div>
        <div class="tarjeta-cuerpo">
          <div v-if="!subtiposBarras.length" class="vacio"><p>Sin servicios en el periodo</p></div>
          <BarrasH v-else :items="subtiposBarras" descripcion="Servicios por clasificación de incidente" />
        </div>
      </section>

      <section class="tarjeta ancho-total">
        <div class="tarjeta-cabecera"><h3>Carga por unidad</h3><span class="nota">tiempo total en servicio, de salida a entrada</span></div>
        <div class="tabla-contenedor">
          <table>
            <thead>
              <tr><th>Unidad</th><th class="num">Servicios</th><th style="width:26%">Proporción</th><th class="num">Horas en servicio</th><th class="num">Min. promedio</th><th>Tipo predominante</th></tr>
            </thead>
            <tbody>
              <tr v-for="u in d.unidades" :key="u.unidad">
                <td class="mono celda-principal">{{ u.unidad }}</td>
                <td class="num"><strong>{{ u.servicios }}</strong></td>
                <td><div class="barra"><span :style="{ width: (u.servicios / totalServicios) * 100 + '%', '--c': 'var(--acento)' }"></span></div></td>
                <td class="num">{{ numero(u.minutos / 60, 1) }}</td>
                <td class="num">{{ u.minutos_promedio ?? '—' }}</td>
                <td><span class="tipo" :class="`tipo-${u.tipo_predominante}`">{{ corteTipo(u.tipo_predominante) }}</span></td>
              </tr>
            </tbody>
          </table>
          <div v-if="!d.unidades.length" class="vacio"><p>Sin servicios en el periodo</p></div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { estadisticas, mensajeError } from '../services/api';
import { useCatalogosStore, TIPOS, ORDEN_SERIE, nombreTipo, corteTipo, colorTipo } from '../stores/catalogos';
import { useNotificacionesStore } from '../stores/notificaciones';
import { periodosRapidos, describirPeriodo, fechaCorta, numero, plural, MESES_CORTOS, MESES } from '../utils/formato';
import SelectorPeriodo from '../components/SelectorPeriodo.vue';
import ColumnasApiladas from '../components/graficos/ColumnasApiladas.vue';
import MapaCalor from '../components/graficos/MapaCalor.vue';
import BarrasH from '../components/graficos/BarrasH.vue';

const catalogos = useCatalogosStore();
const notif = useNotificacionesStore();

const { desde, hasta } = periodosRapidos()[3];
const periodo = ref({ desde, hasta });
const tipo = ref('');
const sector = ref('');
const d = ref(null);
const cargando = ref(true);

const series = computed(() => ORDEN_SERIE.filter(t => !tipo.value || t === tipo.value)
  .map(t => ({ clave: t, nombre: nombreTipo(t), color: colorTipo(t) })));

const serieMensual = computed(() => {
  const [a, m] = periodo.value.hasta.split('-').map(Number);
  const meses = [];
  for (let i = 11; i >= 0; i--) {
    const fecha = new Date(a, m - 1 - i, 1);
    const clave = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
    const valores = {};
    for (const r of d.value.mensual.filter(x => x.mes === clave)) valores[r.tipo_servicio] = r.total;
    meses.push({
      clave, valores,
      etiqueta: MESES_CORTOS[fecha.getMonth()] + (fecha.getMonth() === 0 || i === 11 ? ` ${String(fecha.getFullYear()).slice(2)}` : ''),
      detalle: `${MESES[fecha.getMonth()]} ${fecha.getFullYear()}`
    });
  }
  return meses;
});

const totalServicios = computed(() => Math.max(1, d.value.unidades.reduce((a, u) => a + u.servicios, 0)));

const subtiposBarras = computed(() => d.value.subtipos.slice(0, 10).map(s => ({
  clave: `${s.tipo_servicio}-${s.subtipo}`,
  etiqueta: s.subtipo === 'sin_clasificar' ? `${corteTipo(s.tipo_servicio)} · sin clasificar` : catalogos.nombreSubtipo(s.tipo_servicio, s.subtipo),
  valor: s.total, color: colorTipo(s.tipo_servicio)
})));

const DIAS_L = ['', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
const pico = computed(() => {
  const c = d.value?.calor || [];
  if (!c.length) return null;
  const porDia = {};
  const porFranja = { 'madrugada (0–6 h)': 0, 'mañana (6–12 h)': 0, 'tarde (12–18 h)': 0, 'noche (18–24 h)': 0 };
  for (const r of c) {
    porDia[r.dia] = (porDia[r.dia] || 0) + r.total;
    porFranja[Object.keys(porFranja)[Math.floor(r.hora / 6)]] += r.total;
  }
  const dia = Object.entries(porDia).sort((a, b) => b[1] - a[1])[0];
  const franja = Object.entries(porFranja).sort((a, b) => b[1] - a[1])[0];
  return `los ${DIAS_L[dia[0]]} (${dia[1]} servicios) y en la ${franja[0]} (${franja[1]}).`;
});

const cargar = async () => {
  cargando.value = true;
  try {
    const { data } = await estadisticas.tendencias({ ...periodo.value, tipo_servicio: tipo.value || undefined, sector_id: sector.value || undefined });
    d.value = data;
  } catch (e) {
    notif.error(mensajeError(e, 'No se pudieron calcular las tendencias'));
  } finally {
    cargando.value = false;
  }
};

watch([periodo, tipo, sector], cargar);
onMounted(() => {
  catalogos.cargar().catch(() => {});
  cargar();
});
</script>

<style scoped>
.rejilla-demanda { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.ancho-total { grid-column: 1 / -1; }
.ver-tabla { margin-top: 14px; font-size: 12.5px; }
.ver-tabla summary { cursor: pointer; color: var(--texto-suave); font-weight: 600; }
.ver-tabla table { margin-top: 10px; }
.nota-pie { margin-top: 10px; font-size: 11.5px; color: var(--texto-tenue); }
.hallazgo { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--borde); font-size: 13px; color: var(--texto-suave); }
.hallazgo strong { color: var(--texto); }
@media (max-width: 1100px) { .rejilla-demanda { grid-template-columns: 1fr; } }
</style>
