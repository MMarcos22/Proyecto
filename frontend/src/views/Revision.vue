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
              <tr v-for="l in t.liberados" :key="'l' + l.secuencia" class="liberado">
                <td v-if="auth.esAdministrador"></td>
                <td class="mono" colspan="6"><Icono nombre="info" :tam="14" /> {{ l.numero_control }} cambió de tipo de servicio y ahora es
                  <router-link :to="`/historial/${l.emergencia_id}`" @click.stop>{{ l.paso_a }}</router-link>; este número no se vuelve a usar</td>
              </tr>
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

      <!-- ══ PENDIENTES DE DÍAS ANTERIORES ══════════════ -->
      <section v-if="datos.atrasadas.length" class="tarjeta mb">
        <div class="tarjeta-cabecera cabecera-atrasadas">
          <div>
            <h3>De días anteriores, aún sin firmar <span class="cuenta-atr">{{ datos.atrasadas.length }}</span></h3>
            <p class="nota">Las más antiguas primero. Las «por completar» esperan a la tripulación; las completas solo falta firmarlas.</p>
          </div>
          <div class="segmentos no-imprimir" role="group" aria-label="Filtrar">
            <button :class="{ activo: filtroAtr === '' }" @click="filtroAtr = ''">Todas <span class="n">{{ datos.atrasadas.length }}</span></button>
            <button :class="{ activo: filtroAtr === 'pendiente' }" @click="filtroAtr = 'pendiente'">Por completar <span class="n">{{ cuentaAtr.pendiente }}</span></button>
            <button :class="{ activo: filtroAtr === 'completa' }" @click="filtroAtr = 'completa'">Por firmar <span class="n">{{ cuentaAtr.completa }}</span></button>
          </div>
        </div>
        <div class="tabla-contenedor">
          <table class="tabla-atrasadas">
            <thead>
              <tr>
                <th v-if="auth.esAdministrador" class="col-check"><span class="sr">Seleccionar</span></th>
                <th>Número</th><th>Tipo y causa</th><th>Estado</th><th>Unidad</th><th>Sector</th><th>Regresó</th><th class="num">Espera</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="b in atrasadasVisibles" :key="b.id" class="fila-clic" @click="abrir(b)">
                <td v-if="auth.esAdministrador" class="col-check" @click.stop>
                  <input type="checkbox" :value="b.id" v-model="seleccion" :disabled="b.estado !== 'completa'" :aria-label="`Firmada ${b.numero_control}`" />
                </td>
                <td class="mono celda-principal">{{ b.numero_control }}</td>
                <td>
                  <span class="tipo" :class="`tipo-${b.tipo_servicio}`">{{ corteTipo(b.tipo_servicio) }}</span>
                  <span class="celda-sec">{{ b.subtipo ? catalogos.nombreSubtipo(b.tipo_servicio, b.subtipo) : 'Sin causa' }}</span>
                </td>
                <td><span class="etiqueta" :class="CLASE_ESTADO[b.estado]">{{ b.estado === 'completa' ? 'Por firmar' : 'Por completar' }}</span></td>
                <td class="mono">{{ b.unidad || '—' }}</td>
                <td class="recortar">{{ b.sector || '—' }}</td>
                <td class="mono nowrap">{{ fechaHora(b.regreso_en).slice(0, 10) }}<span class="celda-sec">{{ fechaHora(b.regreso_en).slice(11) }}</span></td>
                <td class="num"><span class="espera" :class="claseEspera(b.dias)">{{ textoEspera(b.dias) }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
        <button v-if="atrasadasFiltradas.length > LIMITE_ATR" class="btn btn-plano btn-sm ver-mas no-imprimir" @click="verTodas = !verTodas">
          {{ verTodas ? 'Ver menos' : `Ver las ${atrasadasFiltradas.length - LIMITE_ATR} restantes` }}
        </button>
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
import { useCatalogosStore, nombreTipo, corteTipo } from '../stores/catalogos';
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

const tiposConDatos = computed(() => (datos.value?.tipos || []).filter(t => t.boletas.length || huecosDe(t).length || t.liberados?.length));
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

// ── Pendientes de días anteriores ──
const LIMITE_ATR = 10;
const filtroAtr = ref('');
const verTodas = ref(false);
const cuentaAtr = computed(() => ({
  pendiente: (datos.value?.atrasadas || []).filter(b => b.estado === 'pendiente').length,
  completa: (datos.value?.atrasadas || []).filter(b => b.estado === 'completa').length
}));
const atrasadasFiltradas = computed(() => (datos.value?.atrasadas || []).filter(b => !filtroAtr.value || b.estado === filtroAtr.value));
const atrasadasVisibles = computed(() => verTodas.value ? atrasadasFiltradas.value : atrasadasFiltradas.value.slice(0, LIMITE_ATR));
const textoEspera = (d) => d >= 60 ? `${Math.floor(d / 30)} meses` : d >= 14 ? `${Math.floor(d / 7)} semanas` : d === 1 ? '1 día' : `${d} días`;
const claseEspera = (d) => d > 30 ? 'larga' : d > 7 ? 'media' : '';
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
.liberado td { height: auto; padding: 10px 16px; color: var(--info); font-weight: 500; background: var(--info-fondo); }
.liberado svg { vertical-align: -2px; margin-right: 4px; }
.cabecera-atrasadas { flex-wrap: wrap; gap: 12px; align-items: flex-start; }
.cabecera-atrasadas .nota { margin-top: 4px; }
.cuenta-atr { margin-left: 6px; padding: 1px 8px; border-radius: 999px; background: var(--alerta-fondo, var(--superficie-hundida)); color: var(--alerta); font-size: 12.5px; font-weight: 700; vertical-align: 2px; }
.segmentos .n { margin-left: 4px; font-variant-numeric: tabular-nums; opacity: .75; }
.tabla-atrasadas td { height: 48px; }
.tabla-atrasadas .recortar { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.nowrap { white-space: nowrap; }
.espera { display: inline-block; padding: 2px 9px; border-radius: 999px; font-size: 13px; font-weight: 600; white-space: nowrap; background: var(--superficie-hundida); color: var(--texto-suave); }
.espera.media { background: var(--alerta-fondo, var(--superficie-hundida)); color: var(--alerta); }
.espera.larga { background: var(--peligro-fondo); color: var(--peligro); }
.ver-mas { margin: 8px 12px 12px; }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
.membrete { display: none; }
@media print {
  .membrete { display: block; margin-bottom: 12px; font-size: 14px; }
  .col-check { display: none; }
}
</style>
