<template>
  <div class="animar">
    <div class="titulo-seccion">
      <div>
        <h1>Informe integrado de servicios y consumo</h1>
      </div>
      <div class="acciones no-imprimir">
        <button class="btn btn-secundario" @click="imprimir" :disabled="!d"><Icono nombre="imprimir" :tam="15" />Imprimir informe</button>
      </div>
    </div>

    <div class="barra-filtros no-imprimir">
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

    <header class="solo-impresion membrete">
      <img src="/LogoBomberos.png" alt="" />
      <div>
        <strong>Benemérito Cuerpo Voluntario de Bomberos · 39ª Compañía, Chiquimula</strong>
        <span>Informe integrado de servicios y consumo · {{ describirPeriodo(periodo.desde, periodo.hasta) }}{{ tipo ? ` · ${nombreTipo(tipo)}` : '' }}{{ sector ? ` · ${catalogos.sector(sector)?.nombre}` : '' }}</span>
      </div>
    </header>

    <div v-if="cargando && !d" class="esqueleto" style="height:320px"></div>

    <template v-else-if="d">
      <section class="indicadores mb">
        <div class="indicador">
          <span class="rotulo">Servicios atendidos</span>
          <div class="valor">{{ d.resumen.servicios }}</div>
          <div class="pie">{{ describirPeriodo(periodo.desde, periodo.hasta) }}</div>
        </div>
        <div class="indicador" :class="{ atencion: cobertura < 50 && d.resumen.servicios }">
          <span class="rotulo">Con consumo registrado</span>
          <div class="valor">{{ cobertura }}<small>%</small></div>
          <div class="pie">{{ d.resumen.servicios_con_consumo }} de {{ d.resumen.servicios }} servicios</div>
        </div>
        <div class="indicador">
          <span class="rotulo">Consumos registrados</span>
          <div class="valor">{{ d.resumen.consumos }}</div>
          <div class="pie">líneas de insumo vinculadas a boletas</div>
        </div>
        <div class="indicador">
          <span class="rotulo">Insumos distintos</span>
          <div class="valor">{{ d.resumen.insumos_distintos }}</div>
          <div class="pie">utilizados en el periodo</div>
        </div>
      </section>

      <p class="nota-metodo">
        <Icono nombre="info" :tam="14" />
        Las cantidades se informan por insumo y en su propia unidad de medida. Entre insumos distintos no se suman cantidades
        (no es comparable una caja de guantes con una venda); se cuentan consumos registrados. «Por servicio» divide la cantidad
        entre todos los servicios del tipo en el periodo.
      </p>

      <div v-if="!d.resumen.servicios" class="vacio tarjeta">
        <Icono nombre="informe" :tam="28" />
        <strong>No hay servicios en este periodo</strong>
        <p>Elija un periodo más amplio o quite los filtros.</p>
      </div>

      <template v-else>
        <section class="tarjeta mb seccion-informe">
          <div class="tarjeta-cabecera"><h3>A · Servicios y consumo por tipo</h3></div>
          <div class="tabla-contenedor">
            <table>
              <thead>
                <tr><th>Tipo de servicio</th><th class="num">Servicios</th><th style="width:22%">Proporción</th><th class="num">Con consumo</th><th class="num">Consumos</th><th class="num">Min. promedio</th></tr>
              </thead>
              <tbody>
                <tr v-for="t in d.por_tipo" :key="t.tipo_servicio">
                  <td><span class="tipo" :class="`tipo-${t.tipo_servicio}`">{{ nombreTipo(t.tipo_servicio) }}</span></td>
                  <td class="num"><strong>{{ t.servicios }}</strong></td>
                  <td><div class="barra"><span :style="{ width: (t.servicios / d.resumen.servicios) * 100 + '%', '--c': colorTipo(t.tipo_servicio) }"></span></div></td>
                  <td class="num">{{ t.con_consumo }} <span class="tenue">({{ porc(t.con_consumo, t.servicios) }} %)</span></td>
                  <td class="num">{{ t.consumos }}</td>
                  <td class="num">{{ t.minutos_promedio ?? '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="tarjeta mb seccion-informe">
          <div class="tarjeta-cabecera">
            <h3>B · Consumo de insumos por tipo de servicio</h3>
            <span class="nota">cantidad en la unidad del insumo · debajo, cantidad por servicio</span>
          </div>
          <div v-if="!d.matriz.length" class="vacio"><p>No se registraron insumos en los servicios del periodo.</p></div>
          <div v-else class="tabla-contenedor">
            <table class="matriz">
              <thead>
                <tr>
                  <th>Insumo</th>
                  <th v-for="t in tiposPresentes" :key="t" class="num"><span class="tipo" :class="`tipo-${t}`">{{ corteTipo(t) }}</span></th>
                  <th class="num">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="i in d.matriz" :key="i.insumo_id">
                  <td>
                    <router-link :to="`/inventario/${i.insumo_id}`" class="celda-principal enlace-limpio">{{ i.nombre }}</router-link>
                    <span class="celda-sec">{{ catalogos.nombreCategoria(i.categoria) }} · {{ i.unidad_medida || 'unidad' }}</span>
                  </td>
                  <td v-for="t in tiposPresentes" :key="t" class="num celda-matriz"
                      :style="{ '--fondo-celda': fondoCelda(i, t) }">
                    <template v-if="i.por_tipo[t]">
                      <strong>{{ i.por_tipo[t].cantidad }}</strong>
                      <span class="por-serv">{{ numero(i.por_tipo[t].por_servicio, 2) }}/serv.</span>
                    </template>
                    <span v-else class="tenue">·</span>
                  </td>
                  <td class="num"><strong>{{ i.total }}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="tarjeta seccion-informe">
          <div class="tarjeta-cabecera">
            <h3>C · Demanda y consumo por sector</h3>
            <span class="nota">ordenado por número de servicios</span>
          </div>
          <div class="tabla-contenedor">
            <table>
              <thead>
                <tr><th>Sector</th><th class="num">Servicios</th><th>Tipo predominante</th><th class="num">Con consumo</th><th>Insumos principales</th></tr>
              </thead>
              <tbody>
                <tr v-for="s in d.por_sector" :key="s.sector_id ?? 'sin'">
                  <td :class="{ 'sin-sector': !s.sector_id }" class="celda-principal">{{ s.sector }}</td>
                  <td class="num"><strong>{{ s.servicios }}</strong> <span class="tenue">{{ porc(s.servicios, d.resumen.servicios) }} %</span></td>
                  <td><span class="tipo" :class="`tipo-${s.tipo_predominante}`">{{ corteTipo(s.tipo_predominante) }}</span></td>
                  <td class="num">{{ s.con_consumo }}</td>
                  <td>
                    <span v-for="ins in s.insumos_principales" :key="ins.nombre" class="chip">
                      {{ ins.nombre }} <b class="mono">{{ ins.cantidad }}</b>
                    </span>
                    <span v-if="!s.insumos_principales.length" class="tenue">—</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section v-if="d.por_escuadra?.length" class="tarjeta mt seccion-informe">
          <div class="tarjeta-cabecera">
            <h3>D · Entregas de prehospitalario por escuadra</h3>
            <span class="nota">lo retirado por vale frente a los servicios que atendió en sus turnos</span>
          </div>
          <div class="tabla-contenedor">
            <table>
              <thead><tr><th>Escuadra</th><th class="num">Servicios atendidos</th><th class="num">Vales</th><th class="num">Unidades retiradas</th><th class="num">Unidades por servicio</th></tr></thead>
              <tbody>
                <tr v-for="e in d.por_escuadra" :key="e.id">
                  <td class="celda-principal">{{ e.nombre }}</td>
                  <td class="num">{{ e.servicios }}</td>
                  <td class="num">{{ e.vales }}</td>
                  <td class="num">{{ e.unidades }}</td>
                  <td class="num"><strong>{{ e.por_servicio ?? '—' }}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="tarjeta-pie">Una escuadra que retira mucho más por servicio que las demás merece una revisión del botiquín o del registro de vales.</p>
        </section>

        <footer class="solo-impresion firmas-informe">
          <div><div class="raya"></div>Elaborado por</div>
          <div><div class="raya"></div>Vo. Bo. Director 39ª Compañía</div>
        </footer>
      </template>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { estadisticas, mensajeError } from '../services/api';
import { useCatalogosStore, TIPOS, ORDEN_SERIE, nombreTipo, corteTipo, colorTipo } from '../stores/catalogos';
import { useNotificacionesStore } from '../stores/notificaciones';
import { periodosRapidos, describirPeriodo, numero } from '../utils/formato';
import SelectorPeriodo from '../components/SelectorPeriodo.vue';
import Icono from '../components/Icono.vue';

const catalogos = useCatalogosStore();
const notif = useNotificacionesStore();

const { desde, hasta } = periodosRapidos()[2];
const periodo = ref({ desde, hasta });
const tipo = ref('');
const sector = ref('');
const d = ref(null);
const cargando = ref(true);

const cobertura = computed(() => porc(d.value?.resumen.servicios_con_consumo, d.value?.resumen.servicios));
const tiposPresentes = computed(() => ORDEN_SERIE.filter(t => d.value?.por_tipo.some(x => x.tipo_servicio === t)));
const maxCelda = computed(() => Math.max(1, ...(d.value?.matriz || []).flatMap(i => Object.values(i.por_tipo).map(x => x.por_servicio))));

const porc = (a, b) => (b ? Math.round((a / b) * 100) : 0);
// Intensidad de la celda según cantidad por servicio (escala de un solo tono)
const fondoCelda = (i, t) => {
  const v = i.por_tipo[t]?.por_servicio;
  return v ? `color-mix(in srgb, var(--t-ambulancia) ${Math.round(6 + (v / maxCelda.value) * 30)}%, transparent)` : 'transparent';
};

const cargar = async () => {
  cargando.value = true;
  try {
    const { data } = await estadisticas.integrado({
      ...periodo.value, tipo_servicio: tipo.value || undefined, sector_id: sector.value || undefined
    });
    d.value = data;
  } catch (e) {
    notif.error(mensajeError(e, 'No se pudo generar el informe'));
  } finally {
    cargando.value = false;
  }
};

const imprimir = () => window.print();

watch([periodo, tipo, sector], cargar);
onMounted(() => {
  catalogos.cargar().catch(() => {});
  cargar();
});
</script>

<style scoped>
.nota-metodo {
  display: flex; gap: 8px; align-items: flex-start;
  margin: -2px 0 16px; padding: 0 2px;
  font-size: 12px; color: var(--texto-tenue); line-height: 1.5; max-width: 110ch;
}
.nota-metodo svg { flex-shrink: 0; margin-top: 2px; }
.matriz th .tipo { font-size: 11px; justify-content: flex-end; }
.celda-matriz { background: var(--fondo-celda); }
.celda-matriz strong { display: block; font-size: 13px; }
.por-serv { display: block; font-size: 10.5px; color: var(--texto-tenue); }
.enlace-limpio { text-decoration: none; }
.enlace-limpio:hover { text-decoration: underline; text-underline-offset: 2px; }
.sin-sector { color: var(--alerta); }
.chip {
  display: inline-flex; align-items: center; gap: 5px;
  margin: 2px 4px 2px 0; padding: 2px 7px;
  font-size: 11.5px; background: var(--superficie-hundida); border-radius: 3px; white-space: nowrap;
}
.chip b { font-weight: 600; font-size: 11px; }
.membrete { display: none; }
.firmas-informe { display: none; }

@media print {
  .membrete { display: flex; gap: 14px; align-items: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 14px; }
  .membrete img { width: 54px; }
  .membrete strong { display: block; font-size: 13px; }
  .membrete span { font-size: 11px; }
  .seccion-informe { break-inside: avoid; margin-bottom: 14px; }
  .firmas-informe { display: flex; justify-content: space-around; margin-top: 48px; font-size: 11px; text-align: center; }
  .firmas-informe > div { width: 220px; }
  .raya { border-top: 1px solid #000; margin-bottom: 4px; }
  table { font-size: 10px; }
  tbody td { height: auto; padding: 4px 8px; }
}
</style>
