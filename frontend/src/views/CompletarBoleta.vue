<template>
  <div class="completar animar">
    <div v-if="cargando" class="centro"><span class="cargador cargador-oscuro"></span></div>

    <template v-else-if="s">
      <header class="cabecera">
        <div class="crecer">
          <span class="ceja"><span class="tipo" :class="`tipo-${s.tipo_servicio}`">{{ nombreTipo(s.tipo_servicio) }}</span></span>
          <h1>{{ s.numero_control || 'Boleta sin número' }}</h1>
          <p class="sub">
            <span class="etiqueta" :class="claseEstado">{{ catalogos.nombreEstado(estado) }}</span>
            <template v-if="estadoGuardado"> · {{ estadoGuardado }}</template>
          </p>
        </div>
        <button v-if="!pidePin" class="btn btn-plano" @click="abrirCambioTipo"><Icono nombre="editar" :tam="15" />Cambiar tipo de servicio</button>
        <button class="btn btn-secundario" @click="salir">{{ pidePin ? 'Volver' : 'Guardar y salir' }}</button>
      </header>
      <CambiarTipo v-model="modalTipo" :boleta="{ id, tipo_servicio: d.tipo_servicio, numero_control: s.numero_control }"
                   :autor="autor ? { personal_id: autor.personal_id, pin: autor.pin } : undefined" @cambiado="tipoCambiado" />

      <!-- ══ UNIDAD AÚN FUERA ═══════════════════════════ -->
      <div v-if="estado === 'en_curso'" class="aviso aviso-info mb">
        <Icono nombre="ambulancia" :tam="20" />
        <div class="crecer"><strong>La unidad no ha regresado.</strong> El número se asigna al registrar el regreso.</div>
        <button v-if="auth.atiendeServicios" class="btn btn-azul btn-sm" @click="registrarRegreso">La unidad regresó</button>
      </div>

      <!-- ══ OTRAS UNIDADES DEL MISMO INCIDENTE ═══════════ -->
      <div v-if="s.incidente?.length" class="aviso aviso-info mb">
        <Icono nombre="ambulancia" :tam="20" />
        <div class="crecer">
          <strong>Salieron {{ s.incidente.length + 1 }} unidades a este incidente.</strong> Cada una completa su propia boleta:
          <template v-for="(o, i) in s.incidente" :key="o.id">{{ i ? ', ' : ' ' }}<router-link :to="`/historial/${o.id}`">{{ o.numero_control || 'sin número' }}{{ o.unidad ? ` (${o.unidad})` : '' }}</router-link></template>.
        </div>
      </div>

      <div v-if="!turnoBoleta" class="aviso aviso-alerta mb">
        <Icono nombre="alerta" :tam="18" />
        <div class="crecer">Esta boleta no tiene turno de guardia y no hay uno abierto: piloto, tripulación y firmas solo se eligen del personal de guardia.</div>
      </div>

      <!-- ══ IDENTIFICACIÓN DE LA TRIPULACIÓN ═══════════ -->
      <section v-if="pidePin" class="tarjeta pin">
        <div class="pin-cabecera">
          <Icono nombre="llave" :tam="26" />
          <div>
            <h2>¿Quién completa la boleta?</h2>
            <p class="suave">Solo la tripulación de este servicio.</p>
          </div>
        </div>
        <select v-if="s.tripulacion.length" v-model="pin.personal_id" class="control mb" aria-label="Quién completa la boleta">
          <option :value="null">Elija su nombre…</option>
          <option v-for="p in s.tripulacion" :key="p.id" :value="p.id" :disabled="!p.tiene_pin">{{ p.nombre_completo }}{{ p.tiene_pin ? '' : ' · sin PIN' }}</option>
        </select>
        <form class="fila pin-fila" @submit.prevent="verificarPin">
          <input v-model="pin.pin" type="password" inputmode="numeric" maxlength="4" pattern="\d{4}" autocomplete="off"
                 class="control mono pin-entrada" placeholder="PIN" aria-label="PIN de 4 dígitos" :disabled="!pin.personal_id" />
          <button class="btn btn-primario btn-lg" :disabled="!pin.personal_id || pin.pin.length !== 4 || verificando">
            <span v-if="verificando" class="cargador"></span>Continuar
          </button>
        </form>
      </section>

      <!-- ══ FORMULARIO + HOJA OFICIAL ══════════════════ -->
      <div v-else class="espacio">
        <div class="formulario todo-obligatorio">
          <p class="leyenda-obligatorio">Todos los campos son obligatorios <span class="req">*</span>: escriba el dato o márquelo «No aplica».</p>
          <p v-if="autor" class="aviso aviso-exito mb">
            <Icono nombre="check" :tam="18" />Completando como <strong>{{ autor.nombre }}</strong>.
          </p>

          <section id="sec-servicio" class="tarjeta bloque">
            <h2 class="titulo-bloque">Qué pasó</h2>
            <div class="campo">
              <span class="rotulo-campo">Causa</span>
              <select v-model="d.subtipo" class="control" aria-label="Causa">
                <option :value="null" disabled>Elija la causa…</option>
                <option v-for="c in catalogos.subtipos(d.tipo_servicio)" :key="c.valor" :value="c.valor">{{ c.nombre }}</option>
              </select>
            </div>
            <div v-if="etiquetaDetalleCaso" class="campo">
              <label for="detcaso">{{ etiquetaDetalleCaso }}</label>
              <input id="detcaso" v-model="d.detalle_caso" class="control" />
            </div>
            <div class="campo">
              <label for="obs">Observaciones</label>
              <textarea id="obs" v-model="d.observaciones" class="control" rows="3"></textarea>
            </div>
          </section>

          <section id="sec-llamada" class="tarjeta bloque">
            <h2 class="titulo-bloque">Llamada y ubicación</h2>
            <div class="rejilla rejilla-2">
              <div class="campo">
                <label for="tel">Solicitud por teléfono</label>
                <input id="tel" :value="d.solicitud_por_telefono" class="control num" inputmode="numeric" maxlength="8" pattern="\d{8}" placeholder="8 dígitos"
                       autocomplete="off" @input="escribirTelefono" />
                <span v-if="telefonoIncompleto" class="ayuda error-campo">El teléfono lleva 8 dígitos (o márquelo «No aplica»).</span>
              </div>
              <div class="campo"><label for="solic">Nombre del solicitante</label><input id="solic" v-model="d.solicitante" class="control" /></div>
            </div>
            <div class="campo"><label for="dir">Dirección</label><input id="dir" v-model="d.direccion" class="control" /></div>
            <div class="campo">
              <span class="rotulo-campo">Sector del municipio</span>
              <SelectorSector v-model:sector="d.sector_id" v-model:lugar="d.lugar_critico_id" :direccion="d.direccion" />
            </div>
          </section>

          <section id="sec-unidad" class="tarjeta bloque">
            <h2 class="titulo-bloque">Unidad, tripulación y horas</h2>
            <div class="rejilla rejilla-2">
              <div class="campo">
                <label for="uni">Unidad</label>
                <select id="uni" v-model="d.unidad_id" class="control">
                  <option :value="null">Sin unidad</option>
                  <option v-for="u in catalogos.unidades" :key="u.id" :value="u.id">{{ u.codigo }} · {{ u.descripcion }}</option>
                </select>
              </div>
              <div class="campo">
                <label for="pil">Piloto</label>
                <select id="pil" v-model="d.piloto_id" class="control">
                  <option :value="null">Sin piloto</option>
                  <option v-for="p in pilotosTurno" :key="p.id" :value="p.id">{{ p.nombre_completo }}</option>
                </select>
              </div>
            </div>
            <div class="campo">
              <span class="rotulo-campo">Tripulación (personal)</span>
              <SelectorTripulacion v-model="d.tripulacion" :turno="turnoBoleta" />
            </div>
            <div class="campo">
              <label for="dest">Personal destacado</label>
              <SelectorTripulacion id="dest" v-model="destacados" :turno="turnoBoleta" :excluidos="enLaUnidad" etiqueta="Personal destacado" placeholder="Elija… o márquelo «No aplica»" />
              <span class="ayuda">Personal enviado al lugar además de la tripulación: refuerzos, otra estación o quien se quedó en el lugar.</span>
            </div>
            <div class="rejilla rejilla-2">
              <div class="campo">
                <label for="hsal">Hora de salida</label>
                <input id="hsal" v-model="d.hora_salida" type="time" class="control mono" />
              </div>
              <div class="campo">
                <label for="hent">Hora de entrada</label>
                <input id="hent" v-model="d.hora_entrada" type="time" class="control mono" :disabled="estado === 'en_curso'" />
                <span v-if="minutos != null" class="ayuda" :class="{ dudoso: minutos > 720 }">{{ minutosTexto(minutos) }} de servicio{{ minutos > 720 ? ' — revise las horas' : '' }}</span>
              </div>
            </div>
          </section>

          <section v-if="d.tipo_servicio !== 'varios'" id="sec-detalle" class="tarjeta bloque">
            <h2 class="titulo-bloque">{{ TITULO_DETALLE[d.tipo_servicio] }}</h2>
            <DetalleAmbulancia v-if="d.tipo_servicio === 'ambulancia'" v-model="dRef" />
            <DetalleIncendio v-else-if="d.tipo_servicio === 'incendio'" v-model="dRef" />
            <DetalleRescate v-else-if="d.tipo_servicio === 'rescate'" v-model="dRef" />
            <DetalleAgua v-else-if="d.tipo_servicio === 'agua'" v-model="dRef" />
          </section>

          <section id="sec-insumos" class="tarjeta bloque">
            <h2 class="titulo-bloque">Insumos usados en el servicio</h2>
            <ul v-if="s.insumos.length" class="insumos">
              <li v-for="i in s.insumos" :key="i.id">
                <span class="crecer"><strong>{{ i.nombre }}</strong><span class="tenue"> · lote {{ i.numero_lote || 's/n' }}</span></span>
                <span class="num">{{ i.cantidad }} {{ i.unidad_medida }}</span>
                <button type="button" class="btn btn-plano btn-icono btn-sm" @click="quitarInsumo(i)" :aria-label="`Quitar ${i.nombre}`"><Icono nombre="papelera" :tam="16" /></button>
              </li>
            </ul>
            <div class="fila insumo-nuevo">
              <select v-model="nuevoInsumo.insumo_id" class="control" aria-label="Insumo">
                <option :value="null">Elija un insumo…</option>
                <option v-for="i in insumosDisponibles" :key="i.id" :value="i.id">{{ i.nombre }}</option>
              </select>
              <input v-model.number="nuevoInsumo.cantidad" type="number" min="1" class="control num cantidad" aria-label="Cantidad" />
              <button type="button" class="btn btn-secundario" :disabled="!nuevoInsumo.insumo_id || !(nuevoInsumo.cantidad > 0)" @click="agregarInsumo">Agregar</button>
            </div>
          </section>

          <section id="sec-firmas" class="tarjeta bloque">
            <h2 class="titulo-bloque">Radiotelefonista y firmas</h2>
            <p class="ayuda mb">Solo se elige al personal del turno de guardia en que se atendió el servicio.</p>
            <div class="campo"><span class="rotulo-campo">Radiotelefonista (cabinista)</span><SelectorPersona v-model="d.radiotelefonista" :turno="turnoBoleta" etiqueta="Radiotelefonista" /></div>
            <div v-if="d.tipo_servicio === 'incendio'" class="rejilla rejilla-2">
              <div class="campo"><span class="rotulo-campo">Responsable</span><SelectorPersona v-model="d.responsable" :turno="turnoBoleta" etiqueta="Responsable" /></div>
              <div class="campo"><span class="rotulo-campo">Jefes de servicio</span><SelectorPersona v-model="d.jefes_servicio" :turno="turnoBoleta" etiqueta="Jefes de servicio" /></div>
            </div>
            <div v-else class="rejilla rejilla-2">
              <div class="campo"><span class="rotulo-campo">Reporte formulado por</span><SelectorPersona v-model="d.reporte_formulado_por" :turno="turnoBoleta" etiqueta="Reporte formulado por" /></div>
              <div class="campo"><span class="rotulo-campo">Es conforme el piloto</span><SelectorPersona v-model="d.conforme_piloto" :turno="turnoBoleta" etiqueta="Es conforme el piloto" /></div>
              <div class="campo"><span class="rotulo-campo">Vo. Bo. jefe de servicio</span><SelectorPersona v-model="d.vobo_jefe_servicio" :turno="turnoBoleta" etiqueta="Vo. Bo. jefe de servicio" /></div>
            </div>
          </section>
        </div>

        <!-- Columna derecha: lo que falta y la hoja oficial -->
        <aside class="lateral-hoja">
          <section class="tarjeta faltan" :class="{ listo: !faltantes.length }">
            <div class="tarjeta-cabecera">
              <h3>{{ faltantes.length ? `Falta${faltantes.length > 1 ? 'n' : ''} ${faltantes.length}` : 'No falta nada' }}</h3>
              <span class="nota">{{ faltantes.length ? 'dato o «No aplica»' : '' }}</span>
            </div>
            <ul v-if="faltantes.length">
              <li v-for="f in faltantes" :key="f.clave">
                <button type="button" class="ir" @click="irA(f.clave)">{{ f.etiqueta }}</button>
                <button v-if="f.admiteNoAplica" type="button" class="btn btn-plano btn-sm" @click="marcarNoAplica(f.clave)">No aplica</button>
              </li>
            </ul>
            <div v-if="d.no_aplica.length" class="no-aplica">
              <span class="rotulo">Marcados «No aplica»</span>
              <div class="chips">
                <button v-for="c in d.no_aplica" :key="c" type="button" class="chip-opcion chip-sm" @click="quitarNoAplica(c)" :title="'Quitar «No aplica» de ' + etiquetaCampo(c)">
                  {{ etiquetaCampo(c) }} <Icono nombre="cerrar" :tam="12" />
                </button>
              </div>
            </div>
          </section>

          <div class="hoja-vista">
            <span class="rotulo">Así se imprime</span>
            <div class="hoja-escala">
              <BoletaImpresa :datos="vistaPrevia" />
            </div>
          </div>
        </aside>
      </div>
    </template>

    <footer v-if="s && !pidePin" class="pie no-imprimir">
      <div class="pie-interno">
        <span class="estado-guardado tenue">{{ estadoGuardado }}</span>
        <div class="crecer"></div>
        <button class="btn btn-secundario btn-lg" :disabled="!!guardando" @click="guardar(false)">
          <span v-if="guardando === 'parcial'" class="cargador cargador-oscuro"></span>Guardar y seguir después
        </button>
        <button v-if="estado === 'completa'" class="btn btn-primario btn-lg" @click="imprimir">
          <Icono nombre="imprimir" :tam="18" />Imprimir
        </button>
        <button v-else class="btn btn-primario btn-lg" :disabled="!!faltantes.length || estado === 'en_curso' || !!guardando" @click="guardar(true)"
                :title="faltantes.length ? 'Complete o marque No aplica en lo que falta' : ''">
          <span v-if="guardando === 'completa'" class="cargador"></span>Marcar como completa
        </button>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { emergencias, inventario, turnos, mensajeError } from '../services/api';
import { useAuthStore } from '../stores/auth';
import { useImpresionStore } from '../stores/impresion';
import { useAlertasStore } from '../stores/alertas';
import { useNotificacionesStore } from '../stores/notificaciones';
import { useCatalogosStore, nombreTipo } from '../stores/catalogos';
import { minutos as minutosTexto, telefonoTexto, telefonoCompleto } from '../utils/formato';
import { personalDeTurno } from '../utils/turno';
import { aBoleta, desdeBoleta, faltantesDe, ESTACION } from '../utils/boleta';
import Icono from '../components/Icono.vue';
import BoletaImpresa from '../components/BoletaImpresa.vue';
import SelectorSector from '../components/boleta/SelectorSector.vue';
import SelectorTripulacion from '../components/boleta/SelectorTripulacion.vue';
import SelectorPersona from '../components/boleta/SelectorPersona.vue';
import CambiarTipo from '../components/boleta/CambiarTipo.vue';
import DetalleAmbulancia from '../components/boleta/DetalleAmbulancia.vue';
import DetalleIncendio from '../components/boleta/DetalleIncendio.vue';
import DetalleRescate from '../components/boleta/DetalleRescate.vue';
import DetalleAgua from '../components/boleta/DetalleAgua.vue';

const ruta = useRoute();
const router = useRouter();
const auth = useAuthStore();
const impresion = useImpresionStore();
const alertas = useAlertasStore();
const notif = useNotificacionesStore();
const catalogos = useCatalogosStore();

const TITULO_DETALLE = { ambulancia: 'Pacientes y traslado', incendio: 'Datos del incendio', rescate: 'Personas rescatadas', agua: 'Distribución de agua' };
const GRUPOS_INCENDIO = {
  inmueble: ['prop_propietario', 'sitio_inicio', 'valor_inmueble', 'perdidas_inmueble', 'aseguradora_inmueble'],
  vehiculo: ['veh_propietario', 'conductor', 'descripcion_tipo', 'marca', 'modelo', 'placas', 'valor_vehiculo', 'perdidas_vehiculo', 'aseguradora_vehiculo']
};

const id = Number(ruta.params.id);
const s = ref(null);
const dRef = ref({});
const d = dRef.value;
const estado = ref(null);
const cargando = ref(true);
const guardando = ref(null);
const verificando = ref(false);
const autor = ref(null);
const pin = reactive({ personal_id: null, pin: '' });
const insumosDisponibles = ref([]);
const nuevoInsumo = reactive({ insumo_id: null, cantidad: 1 });
const cambios = ref(false);
const ultimoGuardado = ref(null);

// La tripulación se identifica con su PIN; una boleta sin tripulación registrada la completa cabina
const pidePin = computed(() => auth.atiendeServicios && estado.value !== 'en_curso' && !autor.value && !!s.value?.tripulacion.length);

// Turno en que se atendió el servicio (o el abierto, si la boleta no tiene): de ahí sale el personal
const turnoActual = ref(null);
const turnoBoleta = computed(() => s.value?.turno || turnoActual.value);
const pilotosTurno = computed(() => personalDeTurno(catalogos.personal, turnoBoleta.value, [d.piloto_id])
  .sort((a, b) => (b.es_piloto - a.es_piloto) || a.nombre_completo.localeCompare(b.nombre_completo)));

const telefonoIncompleto = computed(() => !!d.solicitud_por_telefono && d.solicitud_por_telefono !== 'No aplica' && !telefonoCompleto(d.solicitud_por_telefono));
const escribirTelefono = (e) => {
  d.solicitud_por_telefono = telefonoTexto(e.target.value);
  e.target.value = d.solicitud_por_telefono;
};

const claseEstado = computed(() => ({ en_curso: 'et-info', pendiente: 'et-alerta', completa: 'et-neutra', firmada: 'et-exito', anulada: 'et-peligro' })[estado.value]);
const estadoGuardado = computed(() => guardando.value ? 'Guardando…' : cambios.value ? 'Cambios sin guardar' : ultimoGuardado.value ? 'Guardado' : '');

const minutos = computed(() => {
  if (!d.hora_salida || !d.hora_entrada) return null;
  const [hs, ms] = d.hora_salida.split(':').map(Number);
  const [he, me] = d.hora_entrada.split(':').map(Number);
  let m = (he * 60 + me) - (hs * 60 + ms);
  if (m < 0) m += 1440;
  return m;
});

const etiquetaDetalleCaso = computed(() => ({
  ambulancia: 'Detalle del caso (va en la casilla de la causa)',
  varios: 'Clase de servicio',
  agua: { domicilio: 'Nombre de la residencia', establecimiento: 'Nombre de la institución', centro_asistencial: 'Nombre del centro asistencial', comunidad: 'Nombre de la comunidad o colonia' }[d.subtipo]
})[d.tipo_servicio] || null);

// La boleta tal como se imprimiría con lo escrito hasta ahora
const vistaPrevia = computed(() => {
  if (!s.value) return {};
  const nombreSub = d.subtipo ? catalogos.nombreSubtipo(d.tipo_servicio, d.subtipo) : '';
  const tripulantes = d.tripulacion.map(x => catalogos.persona(x)?.nombre_completo).filter(Boolean);
  const b = aBoleta({ ...d, salieron: tripulantes }, nombreSub);
  return {
    ...b,
    numero_control: s.value.numero_control, fecha: s.value.fecha,
    minutos_trabajados: minutos.value,
    zona: catalogos.sector(d.sector_id)?.nombre || '',
    unidad: catalogos.unidades.find(u => u.id === d.unidad_id)?.codigo || '',
    piloto: catalogos.persona(d.piloto_id)?.nombre_completo || '',
    no_aplica: d.no_aplica
  };
});

const faltantes = computed(() => s.value ? faltantesDe(vistaPrevia.value, catalogos.camposBoleta(d.tipo_servicio), d.no_aplica) : []);
const etiquetaCampo = (clave) => catalogos.camposBoleta(d.tipo_servicio).find(c => c.clave === clave)?.etiqueta || clave;

const marcarNoAplica = (clave) => { if (!d.no_aplica.includes(clave)) d.no_aplica.push(clave); };
const quitarNoAplica = (clave) => { d.no_aplica = d.no_aplica.filter(c => c !== clave); };

// Al cambiar el piloto cambia quien firma «Es conforme el piloto», salvo que se haya escrito otro nombre
watch(() => d.piloto_id, (nuevo, anterior) => {
  if (!listo) return;
  const previo = catalogos.persona(anterior)?.nombre_completo;
  if (!d.conforme_piloto || d.conforme_piloto === previo) d.conforme_piloto = catalogos.persona(nuevo)?.nombre_completo || '';
});

// En incendio, si no hubo inmueble o vehículo, sus campos no aplican
watch(() => [d.hay_inmueble, d.hay_vehiculo], ([inm, veh]) => {
  if (d.tipo_servicio !== 'incendio') return;
  for (const [grupo, activo] of [['inmueble', inm], ['vehiculo', veh]]) {
    for (const c of GRUPOS_INCENDIO[grupo]) activo ? quitarNoAplica(c) : marcarNoAplica(c);
  }
});

const SECCION_DE = {
  sector_id: 'sec-llamada', solicitud_por_telefono: 'sec-llamada', solicitante: 'sec-llamada', direccion: 'sec-llamada',
  subtipo: 'sec-servicio', observaciones: 'sec-servicio', clase_servicio: 'sec-servicio',
  unidad: 'sec-unidad', piloto: 'sec-unidad', personal: 'sec-unidad', personal_destacado: 'sec-unidad', hora_salida: 'sec-unidad', hora_entrada: 'sec-unidad',
  radiotelefonista: 'sec-firmas', reporte_formulado_por: 'sec-firmas', conforme_piloto: 'sec-firmas', vobo_jefe_servicio: 'sec-firmas', responsable: 'sec-firmas', jefes_servicio: 'sec-firmas'
};
const irA = (clave) => {
  const el = document.getElementById(SECCION_DE[clave] || (d.tipo_servicio === 'ambulancia' && clave === 'caso' ? 'sec-servicio' : 'sec-detalle'));
  el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  el?.classList.add('destello');
  setTimeout(() => el?.classList.remove('destello'), 1200);
};

// Personal destacado: se guarda como texto (así va en la boleta impresa) y se elige de la lista de personal.
// Los nombres escritos antes a mano que no están en la lista se conservan.
const destacados = computed({
  get: () => nombresDestacados().map(n => catalogos.personal.find(p => p.nombre_completo === n)?.id).filter(Boolean),
  set: (ids) => {
    const sueltos = nombresDestacados().filter(n => !catalogos.personal.some(p => p.nombre_completo === n));
    d.personal_destacado = [...ids.map(x => catalogos.persona(x)?.nombre_completo).filter(Boolean), ...sueltos].join(', ');
  }
});
const nombresDestacados = () => (d.personal_destacado || '').split(',').map(n => n.trim()).filter(Boolean);
const enLaUnidad = computed(() => {
  const m = Object.fromEntries(d.tripulacion.map(x => [x, 'en la tripulación']));
  if (d.piloto_id) m[d.piloto_id] = 'piloto de la unidad';
  return m;
});

const carga = (completar) => {
  const v = vistaPrevia.value;
  const b = { ...v, tipo_servicio: d.tipo_servicio, sector_id: d.sector_id, lugar_critico_id: d.lugar_critico_id, subtipo: d.subtipo,
    unidad_id: d.unidad_id, piloto_id: d.piloto_id, tripulacion: d.tripulacion, no_aplica: d.no_aplica,
    salida_de: d.salida_de || ESTACION, entrada_a: d.entrada_a || ESTACION, completar,
    autor: autor.value ? { personal_id: autor.value.personal_id, pin: autor.value.pin } : undefined };
  for (const k of Object.keys(b)) if (b[k] === '') b[k] = null;
  return b;
};

const guardar = async (completar) => {
  guardando.value = completar ? 'completa' : 'parcial';
  clearTimeout(espera);
  try {
    const { data } = await emergencias.guardar(id, carga(completar));
    estado.value = data.estado;
    cambios.value = false;
    ultimoGuardado.value = Date.now();
    impresion.contarPendientes();
    // Recién registrada la tripulación, desde ahora la boleta se completa con su PIN
    if (!s.value.tripulacion.length && d.tripulacion.length && estado.value !== 'en_curso') {
      notif.exito('Tripulación registrada. Ahora un tripulante continúa con su PIN.');
      return cargar();
    }
    if (completar) notif.exito('Boleta completa. Ya se puede imprimir.');
    else if (!automatico) notif.exito('Guardado. Puede seguir después desde Inicio.');
  } catch (e) {
    notif.error(mensajeError(e, 'No se pudo guardar la boleta'));
  } finally {
    guardando.value = null;
    automatico = false;
  }
};

// Guardado automático unos segundos después del último cambio
let espera = null;
let automatico = false;
let listo = false;
watch(dRef, () => {
  if (!listo || pidePin.value || !auth.atiendeServicios) return;
  cambios.value = true;
  clearTimeout(espera);
  espera = setTimeout(() => { automatico = true; guardar(false); }, 3000);
}, { deep: true });

const verificarPin = async () => {
  verificando.value = true;
  try {
    const { data } = await emergencias.verificarPin(id, { personal_id: pin.personal_id, pin: pin.pin });
    autor.value = { ...data, pin: pin.pin };
    if (!d.reporte_formulado_por) d.reporte_formulado_por = data.nombre;
  } catch (e) {
    notif.error(mensajeError(e, 'No se pudo verificar el PIN'));
    pin.pin = '';
  } finally {
    verificando.value = false;
  }
};

const registrarRegreso = async () => {
  const hora = prompt('Hora de regreso a la estación (HH:MM)', new Date().toTimeString().slice(0, 5));
  if (!hora) return;
  try {
    const { data } = await emergencias.regreso(id, hora);
    notif.exito(data.mensaje);
    await cargar();
  } catch (e) {
    notif.error(mensajeError(e));
  }
};

const agregarInsumo = async () => {
  try {
    const { data } = await emergencias.agregarInsumo(id, { ...nuevoInsumo, autor: autor.value ? { personal_id: autor.value.personal_id, pin: autor.value.pin } : undefined });
    if (data.alerta) notif.alerta(data.alerta);
    Object.assign(nuevoInsumo, { insumo_id: null, cantidad: 1 });
    await recargarInsumos();
  } catch (e) {
    notif.error(mensajeError(e, 'No se pudo registrar el insumo'));
  }
};
const quitarInsumo = async (i) => {
  try {
    await emergencias.quitarInsumo(id, i.id, autor.value ? { personal_id: autor.value.personal_id, pin: autor.value.pin } : undefined);
    await recargarInsumos();
  } catch (e) {
    notif.error(mensajeError(e));
  }
};
const recargarInsumos = async () => {
  const [{ data: b }, { data: inv }] = await Promise.all([emergencias.obtener(id), inventario.listar()]);
  s.value.insumos = b.insumos;
  insumosDisponibles.value = inv.insumos.filter(i => i.stock_actual > 0 && i.categoria === 'prehospitalario');
  alertas.cargar();
};

const imprimir = async () => {
  if (cambios.value) await guardar(false);
  await impresion.imprimir(id);
};

// Al llegar resultó ser otro servicio: se guarda lo escrito y la boleta cambia de tipo
const modalTipo = ref(false);
const abrirCambioTipo = async () => {
  if (cambios.value) await guardar(false);
  modalTipo.value = true;
};
const tipoCambiado = async () => {
  impresion.contarPendientes();
  await cargar();
};

const salir = async () => {
  if (cambios.value && !pidePin.value) await guardar(false);
  router.push('/inicio');
};

const cargar = async () => {
  const { data } = await emergencias.obtener(id);
  if (['firmada', 'anulada'].includes(data.estado)) {
    notif.alerta(data.estado === 'firmada' ? 'La boleta ya está firmada y no se puede modificar' : 'La boleta está anulada');
    return router.replace(`/historial/${id}`);
  }
  s.value = data;
  estado.value = data.estado;
  listo = false;
  Object.assign(d, {
    hubo_fallecidos: false, destino: { tipo: null, detalle: '' }, pacientes: [{ nombre: '', edad: '', domicilio: '' }],
    hay_inmueble: true, hay_vehiculo: false, detalle_caso: ''
  }, desdeBoleta(data));
  d.tripulacion = data.tripulacion.map(p => p.id);
  d.no_aplica = Array.isArray(data.no_aplica) ? [...data.no_aplica] : [];
  if (!d.pacientes.length) d.pacientes = [{ nombre: '', edad: '', domicilio: '' }];
  if (!d.conforme_piloto && d.piloto_id) d.conforme_piloto = catalogos.persona(d.piloto_id)?.nombre_completo || '';
  setTimeout(() => { listo = true; }, 0);
};

onMounted(async () => {
  try {
    await catalogos.cargar();
    await cargar();
    if (!s.value?.turno) turnoActual.value = (await turnos.actual().catch(() => ({ data: null }))).data;
    const { data: inv } = await inventario.listar();
    insumosDisponibles.value = inv.insumos.filter(i => i.stock_actual > 0 && i.categoria === 'prehospitalario');
  } catch (e) {
    notif.error(mensajeError(e, 'No se pudo cargar la boleta'));
  } finally {
    cargando.value = false;
  }
});
onBeforeUnmount(() => clearTimeout(espera));
</script>

<style scoped>
.completar { padding-bottom: 100px; }
.centro { display: flex; justify-content: center; padding: 60px; }
.cabecera { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 18px; flex-wrap: wrap; }
.cabecera .ceja { display: block; margin-bottom: 4px; }
.cabecera .sub { margin-top: 8px; color: var(--texto-suave); font-size: 14px; display: flex; align-items: center; gap: 6px; }

.pin { max-width: 640px; padding: 24px; }
.pin-cabecera { display: flex; gap: 16px; align-items: flex-start; margin-bottom: 18px; }
.pin-cabecera > svg { color: var(--acento); flex-shrink: 0; margin-top: 4px; }
.pin-cabecera p { margin-top: 4px; }
.pin-entrada { max-width: 160px; font-size: 26px; letter-spacing: .4em; text-align: center; height: 52px; }

.espacio { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 470px); gap: 20px; align-items: start; }
.bloque { padding: 18px 22px 4px; margin-bottom: 14px; scroll-margin-top: 80px; transition: box-shadow 300ms ease; }
.bloque.destello { box-shadow: 0 0 0 3px var(--alerta-vivo); }
.titulo-bloque { font-size: 17px; margin-bottom: 14px; display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
.titulo-bloque .opcional { font-size: 13px; font-weight: 400; color: var(--texto-tenue); }
.ayuda.dudoso { color: var(--alerta); font-weight: 600; }
.error-campo { color: var(--peligro); font-weight: 600; }
/* Estructura de los componentes de detalle por tipo */
.bloque :deep(.pila-paso) { display: flex; flex-direction: column; gap: 24px; padding-bottom: 14px; }
.bloque :deep(.subtitulo) { font-size: 15px; font-weight: 700; margin-bottom: 10px; }
.bloque :deep(.opciones.dos) { grid-template-columns: repeat(2, minmax(0, 1fr)); max-width: 420px; }

.insumos { list-style: none; margin-bottom: 12px; }
.insumos li { display: flex; align-items: center; gap: 12px; padding: 8px 0; border-bottom: 1px solid var(--borde); font-size: 14.5px; }
.insumo-nuevo { margin-bottom: 16px; }
.insumo-nuevo .cantidad { max-width: 90px; }

.lateral-hoja { position: sticky; top: 80px; display: flex; flex-direction: column; gap: 14px; max-height: calc(100vh - 180px); overflow-y: auto; }
.faltan { border-color: color-mix(in srgb, var(--alerta-vivo) 50%, transparent); }
.faltan.listo { border-color: color-mix(in srgb, var(--exito) 45%, transparent); }
.faltan.listo h3 { color: var(--exito); }
.faltan ul { list-style: none; max-height: 260px; overflow-y: auto; }
.faltan li { display: flex; align-items: center; gap: 8px; padding: 6px 12px 6px 20px; border-bottom: 1px solid var(--borde); }
.faltan li:last-child { border-bottom: none; }
.ir { flex: 1; text-align: left; background: none; border: none; font: inherit; font-size: 14.5px; font-weight: 600; color: var(--texto); cursor: pointer; padding: 4px 0; }
.ir:hover { text-decoration: underline; text-underline-offset: 3px; }
.no-aplica { padding: 12px 20px 14px; border-top: 1px solid var(--borde); }
.no-aplica .rotulo { display: block; margin-bottom: 8px; }
.chip-sm { height: 32px; padding: 0 10px; font-size: 13px; }

.hoja-vista .rotulo { display: block; margin-bottom: 8px; }
.hoja-escala { overflow: hidden; border: 1px solid var(--borde); border-radius: var(--radio); background: #fff; }
.hoja-escala :deep(.hoja-oficio) { zoom: .52; margin: 0; box-shadow: none; }

.pie {
  position: fixed; left: var(--ancho-lateral, 272px); right: 0; bottom: 0; z-index: 40;
  background: color-mix(in srgb, var(--superficie) 94%, transparent);
  backdrop-filter: blur(8px); border-top: 1px solid var(--borde);
}
.pie-interno { display: flex; align-items: center; gap: 12px; max-width: 1440px; margin: 0 auto; padding: 14px 32px; }

@media (max-width: 1200px) {
  .espacio { grid-template-columns: 1fr; }
  .lateral-hoja { position: static; max-height: none; order: -1; }
  .hoja-vista { display: none; }
}
@media (max-width: 960px) {
  .pie { left: 0; }
  .pie-interno { padding: 12px 16px; flex-wrap: wrap; }
}
</style>
