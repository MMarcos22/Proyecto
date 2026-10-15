<template>
  <div class="animar">
    <div class="titulo-seccion">
      <div>
        <h1>Revisión diaria</h1>
      </div>
      <div class="acciones no-imprimir">
        <button class="btn btn-secundario" @click="window.print()" :disabled="!datos?.resumen.total"><Icono nombre="imprimir" :tam="16" />Imprimir revisión</button>
        <button v-if="auth.esAdministrador" class="btn btn-primario" :disabled="!seleccion.length || firmando" @click="firmar">
          <span v-if="firmando" class="cargador"></span>Marcar {{ seleccion.length || '' }} como firmadas
        </button>
      </div>
    </div>

    <div class="barra-filtros no-imprimir">
      <div class="selector-dia">
        <button class="btn btn-secundario btn-icono" @click="mover(-1)" aria-label="Día anterior"><Icono nombre="flecha_izq" :tam="16" /></button>
        <input v-model="fecha" type="date" class="control mono" :max="hoy()" aria-label="Día a revisar" />
        <button class="btn btn-secundario btn-icono" @click="mover(1)" :disabled="fecha >= hoy()" aria-label="Día siguiente"><Icono nombre="flecha_der" :tam="16" /></button>
      </div>
      <button v-if="fecha !== hoy()" class="btn btn-plano" @click="fecha = hoy()">Hoy</button>
    </div>

    <header class="solo-impresion membrete">
      <strong>Revisión de boletas · {{ fechaLarga(fecha) }}</strong>
    </header>

    <div v-if="cargando && !datos" class="esqueleto" style="height:240px"></div>

    <template v-else-if="datos">
      <section class="indicadores mb">
        <div class="indicador"><span class="rotulo">Boletas del día</span><div class="valor">{{ datos.resumen.total }}</div></div>
        <div class="indicador" :class="{ atencion: datos.resumen.por_completar }"><span class="rotulo">Por completar</span><div class="valor">{{ datos.resumen.por_completar }}</div><div class="pie">esperan a la tripulación</div></div>
        <div class="indicador" :class="{ atencion: datos.resumen.por_firmar }"><span class="rotulo">Completas sin firmar</span><div class="valor">{{ datos.resumen.por_firmar }}</div></div>
        <div class="indicador" :class="{ critico: datos.resumen.huecos }"><span class="rotulo">Saltos en la numeración</span><div class="valor">{{ datos.resumen.huecos }}</div><div class="pie">{{ datos.resumen.huecos ? 'revise los números que faltan' : 'la secuencia está completa' }}</div></div>
      </section>

      <div v-if="!datos.resumen.total && !totalHuecos" class="tarjeta vacio">
        <Icono nombre="boleta" :tam="34" />
        <strong>No se registraron regresos este día</strong>
        <p>Elija otro día con las flechas.</p>
      </div>

      <section v-for="t in tiposConDatos" :key="t.tipo_servicio" class="tarjeta mb bloque-tipo">
        <div class="tarjeta-cabecera">
          <h3><span class="tipo" :class="`tipo-${t.tipo_servicio}`">{{ nombreTipo(t.tipo_servicio) }}</span></h3>
          <span class="nota">{{ rango(t) }}</span>
        </div>
        <div class="tabla-contenedor">
          <table>
            <thead>
              <tr>
                <th v-if="auth.esAdministrador" class="col-check"><span class="sr">Seleccionar</span></th>
                <th>Número</th><th>Estado</th><th>Regresó</th><th>Unidad</th><th>Sector</th><th>Impresa</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="h in huecosDe(t)" :key="'h' + h" class="hueco">
                <td v-if="auth.esAdministrador"></td>
                <td class="mono" colspan="6"><Icono nombre="alerta" :tam="14" /> Falta el número {{ numeroDe(t.tipo_servicio, h) }} en la secuencia</td>
              </tr>
              <tr v-for="b in t.boletas" :key="b.id" class="fila-clic" @click="abrir(b)">
                <td v-if="auth.esAdministrador" class="col-check" @click.stop>
                  <input type="checkbox" :value="b.id" v-model="seleccion" :disabled="b.estado !== 'completa'" :aria-label="`Firmada ${b.numero_control}`" />
                </td>
                <td class="mono celda-principal">{{ b.numero_control }}</td>
                <td>
                  <span class="etiqueta" :class="CLASE_ESTADO[b.estado]">{{ catalogos.nombreEstado(b.estado) }}</span>
                  <span v-if="b.estado === 'anulada'" class="celda-sec">{{ b.motivo_anulacion }}</span>
                </td>
                <td class="num">{{ b.hora_entrada?.slice(0, 5) || '—' }}</td>
                <td class="mono">{{ b.unidad || '—' }}</td>
                <td>{{ b.sector || '—' }}</td>
                <td>{{ b.impresa_en ? 'Sí' : 'No' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section v-if="datos.atrasadas.length" class="tarjeta mb">
        <div class="tarjeta-cabecera"><h3>De días anteriores, aún sin firmar</h3><span class="nota">{{ datos.atrasadas.length }} boletas</span></div>
        <ul class="atrasadas">
          <li v-for="b in datos.atrasadas" :key="b.id">
            <router-link :to="`/historial/${b.id}`" class="mono">{{ b.numero_control }}</router-link>
            <span class="tipo" :class="`tipo-${b.tipo_servicio}`">{{ nombreTipo(b.tipo_servicio) }}</span>
            <span class="tenue">regresó el {{ fechaHora(b.regreso_en) }}</span>
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { emergencias, mensajeError } from '../services/api';
import { useAuthStore } from '../stores/auth';
import { useImpresionStore } from '../stores/impresion';
import { useNotificacionesStore } from '../stores/notificaciones';
import { useCatalogosStore, nombreTipo } from '../stores/catalogos';
import { hoy, sumarDias, fechaLarga, fechaHora } from '../utils/formato';
import Icono from '../components/Icono.vue';

const router = useRouter();
const auth = useAuthStore();
const impresion = useImpresionStore();
const notif = useNotificacionesStore();
const catalogos = useCatalogosStore();
const window = globalThis.window;

const CLASE_ESTADO = { pendiente: 'et-alerta', completa: 'et-neutra', firmada: 'et-exito', anulada: 'et-peligro', en_curso: 'et-info' };
const PREFIJO = { ambulancia: 'AMB', incendio: 'INC', rescate: 'RES', varios: 'VAR', agua: 'AGU' };

const fecha = ref(hoy());
const datos = ref(null);
const cargando = ref(true);
const seleccion = ref([]);
const firmando = ref(false);

const tiposConDatos = computed(() => (datos.value?.tipos || []).filter(t => t.boletas.length || huecosDe(t).length));
const totalHuecos = computed(() => (datos.value?.tipos || []).reduce((a, t) => a + t.huecos.length, 0));
// Solo se señalan los huecos dentro del rango de números del día (los antiguos se ven en su día)
const huecosDe = (t) => {
  if (!t.boletas.length) return [];
  const min = Math.min(...t.boletas.map(b => b.secuencia));
  const max = Math.max(...t.boletas.map(b => b.secuencia));
  return t.huecos.filter(h => h >= min - 1 && h <= max);
};
const numeroDe = (tipo, n) => `${PREFIJO[tipo]}-${fecha.value.slice(0, 4)}-${String(n).padStart(4, '0')}`;
const rango = (t) => t.boletas.length ? `${t.boletas[0].numero_control} a ${t.boletas[t.boletas.length - 1].numero_control}` : '';

const mover = (dias) => { fecha.value = sumarDias(fecha.value, dias); };
const abrir = (b) => router.push(`/historial/${b.id}`);

const cargar = async () => {
  cargando.value = true;
  seleccion.value = [];
  try {
    const { data } = await emergencias.revision(fecha.value);
    datos.value = data;
  } catch (e) {
    notif.error(mensajeError(e, 'No se pudo preparar la revisión'));
  } finally {
    cargando.value = false;
  }
};

const firmar = async () => {
  firmando.value = true;
  try {
    const { data } = await emergencias.firmar(seleccion.value);
    notif.exito(data.mensaje);
    impresion.contarPendientes();
    await cargar();
  } catch (e) {
    notif.error(mensajeError(e));
  } finally {
    firmando.value = false;
  }
};

watch(fecha, cargar);
onMounted(() => { catalogos.cargar().catch(() => {}); cargar(); });
</script>

<style scoped>
.selector-dia { display: flex; align-items: center; gap: 6px; }
.selector-dia .control { width: auto; height: 46px; }
.col-check { width: 48px; text-align: center; }
.col-check input { width: 18px; height: 18px; cursor: pointer; }
.hueco td { height: auto; padding: 10px 16px; color: var(--peligro); font-weight: 600; background: var(--peligro-fondo); }
.hueco svg { vertical-align: -2px; margin-right: 4px; }
.atrasadas { list-style: none; }
.atrasadas li { display: flex; align-items: center; gap: 14px; padding: 10px 20px; border-bottom: 1px solid var(--borde); font-size: 14.5px; }
.atrasadas li:last-child { border-bottom: none; }
.atrasadas a { font-weight: 600; color: var(--texto); }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
.membrete { display: none; }
@media print {
  .membrete { display: block; margin-bottom: 12px; font-size: 14px; }
  .col-check { display: none; }
}
</style>
