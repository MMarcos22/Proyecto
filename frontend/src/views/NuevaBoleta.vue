<template>
  <div class="llamada animar">
    <header class="titulo-seccion">
      <div><h1>Registrar llamada</h1></div>
      <button class="btn btn-secundario" @click="salir">Cancelar</button>
    </header>

    <div v-if="cargando" class="centro"><span class="cargador cargador-oscuro"></span></div>

    <template v-else>
      <div v-if="!turno" class="aviso aviso-alerta mb">
        <Icono nombre="alerta" :tam="18" />
        <div class="crecer">No hay turno abierto: la tripulación y las firmas no se pueden proponer.</div>
        <router-link to="/inicio" class="btn btn-secundario btn-sm">Abrir turno</router-link>
      </div>

      <p class="leyenda-obligatorio">Los campos con <span class="req">*</span> son obligatorios.</p>

      <!-- ══ 1. QUÉ ═════════════════════════════════════ -->
      <section class="tarjeta bloque">
        <h2 class="titulo-bloque">Tipo de servicio <span class="req">*</span></h2>
        <div class="tipos">
          <button v-for="t in TIPOS" :key="t.valor" type="button" class="opcion opcion-tipo"
                  :class="[{ elegida: d.tipo_servicio === t.valor }, `tipo-${t.valor}`]" @click="elegirTipo(t.valor)"
                  :aria-pressed="d.tipo_servicio === t.valor">
            <span class="icono-tipo"><Icono :nombre="t.valor" :tam="22" :grosor="2.2" /></span>{{ t.nombre }}
          </button>
        </div>
        <div v-if="d.tipo_servicio" class="campo mt">
          <span class="rotulo-campo">Causa <span class="opcional">si ya se sabe</span></span>
          <select v-model="d.subtipo" class="control" aria-label="Causa">
            <option :value="null">Todavía no se sabe</option>
            <option v-for="s in catalogos.subtipos(d.tipo_servicio)" :key="s.valor" :value="s.valor">{{ s.nombre }}</option>
          </select>
        </div>
      </section>

      <!-- ══ 2. DÓNDE ═══════════════════════════════════ -->
      <section class="tarjeta bloque">
        <h2 class="titulo-bloque">Quién llama y dónde</h2>
        <div class="rejilla rejilla-2">
          <div class="campo">
            <label for="tel">Teléfono</label>
            <input id="tel" v-model="d.solicitud_por_telefono" class="control num" inputmode="tel" placeholder="0000 0000" @blur="buscarLlamante" />
          </div>
          <div class="campo">
            <label for="solic">Nombre de quien llama</label>
            <input id="solic" v-model="d.solicitante" class="control" />
          </div>
        </div>
        <div v-if="llamante" class="recuerdo mb">
          <Icono nombre="historial" :tam="18" />
          <span class="crecer">Ya llamó {{ plural(llamante.llamadas, 'vez', 'veces') }}: <strong>{{ llamante.solicitante || 'sin nombre' }}</strong>, {{ llamante.direccion }}</span>
          <button class="btn btn-azul btn-sm" @click="usarLlamante">Usar</button>
          <button class="btn btn-plano btn-sm" @click="llamante = null">No</button>
        </div>
        <div class="campo">
          <label for="dir">Dirección <span class="req">*</span></label>
          <input id="dir" v-model="d.direccion" class="control" placeholder="Calle, número o punto de referencia" />
        </div>
        <div class="campo">
          <span class="rotulo-campo">Sector</span>
          <SelectorSector v-model:sector="d.sector_id" v-model:lugar="d.lugar_critico_id" :direccion="d.direccion" />
        </div>
        <div v-if="mismoLugar" class="aviso aviso-alerta mb">
          <Icono nombre="alerta" :tam="18" />
          <div>Ya hay un servicio en curso en <strong>{{ mismoLugar.sector }}</strong>: {{ nombreTipo(mismoLugar.tipo_servicio) }}<template v-if="mismoLugar.unidad">, unidad {{ mismoLugar.unidad }}</template>, salió {{ hora12(mismoLugar.hora_salida) }}. ¿Es el mismo incidente?</div>
        </div>
      </section>

      <!-- ══ 3. QUIÉN SALE ══════════════════════════════ -->
      <section class="tarjeta bloque">
        <h2 class="titulo-bloque">Unidad y tripulación</h2>
        <div class="campo">
          <span class="rotulo-campo">Unidad</span>
          <div class="opciones" style="--min-opcion: 190px">
            <button v-for="u in unidadesOrdenadas" :key="u.id" type="button" class="opcion unidad"
                    :class="{ elegida: d.unidad_id === u.id }" :disabled="!!fuera(u)" @click="elegirUnidad(u, true)">
              <span>
                {{ u.codigo }}
                <small>{{ fuera(u) ? `Fuera · ${nombreTipo(fuera(u).tipo_servicio).toLowerCase()}` : u.descripcion || 'Unidad' }}</small>
              </span>
            </button>
          </div>
        </div>
        <div class="campo">
          <span class="rotulo-campo">Piloto</span>
          <MenuDesplegable :model-value="d.piloto_id" :opciones="opcionesPiloto" etiqueta="Piloto" placeholder="Elija el piloto…"
                           @update:model-value="(id) => elegirPiloto(catalogos.persona(id), true)" />
        </div>
        <div class="campo">
          <span class="rotulo-campo">Tripulación</span>
          <SelectorTripulacion v-model="d.tripulacion" :turno="turno" :ocupados="ocupados" />
        </div>

        <div class="horas">
          <template v-if="!cambiarHora">
            <Icono nombre="reloj" :tam="17" />
            <span class="crecer"><strong>{{ d.fecha === hoy() ? 'Hoy' : fechaCorta(d.fecha) }}</strong> · llamada {{ hora12(d.hora_aviso) }} · salida {{ hora12(d.hora_salida) }}</span>
            <button type="button" class="btn btn-plano btn-sm" @click="cambiarHora = true">Cambiar</button>
          </template>
          <div v-else class="rejilla rejilla-3 crecer">
            <div class="campo">
              <label for="fecha">Fecha <span class="req">*</span></label>
              <input id="fecha" v-model="d.fecha" type="date" class="control" :max="hoy()" />
            </div>
            <div class="campo">
              <label for="haviso">Hora de la llamada</label>
              <input id="haviso" v-model="d.hora_aviso" type="time" class="control" />
            </div>
            <div class="campo">
              <label for="hsal">Hora de salida</label>
              <input id="hsal" v-model="d.hora_salida" type="time" class="control" />
            </div>
          </div>
        </div>
      </section>
    </template>

    <footer v-if="!cargando" class="pie no-imprimir">
      <div class="pie-interno">
        <span v-if="falta" class="falta">{{ falta }}</span>
        <div class="crecer"></div>
        <button class="btn btn-secundario btn-lg" :disabled="!!falta || !!guardando" @click="guardar(true)">
          <span v-if="guardando === 'regreso'" class="cargador cargador-oscuro"></span>Servicio ya atendido
        </button>
        <button class="btn btn-primario btn-lg" :disabled="!!falta || !!guardando" @click="guardar(false)">
          <span v-if="guardando === 'salida'" class="cargador"></span>La unidad salió
        </button>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { reactive, ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { emergencias, turnos, mensajeError } from '../services/api';
import { useNotificacionesStore } from '../stores/notificaciones';
import { useImpresionStore } from '../stores/impresion';
import { useCatalogosStore, TIPOS, nombreTipo } from '../stores/catalogos';
import { hoy, plural, fechaCorta } from '../utils/formato';
import { normalizar } from '../utils/sector';
import { ESTACION } from '../utils/boleta';
import Icono from '../components/Icono.vue';
import SelectorSector from '../components/boleta/SelectorSector.vue';
import SelectorTripulacion from '../components/boleta/SelectorTripulacion.vue';
import MenuDesplegable from '../components/MenuDesplegable.vue';

const ruta = useRoute();
const router = useRouter();
const notif = useNotificacionesStore();
const impresion = useImpresionStore();
const catalogos = useCatalogosStore();

const horaAhora = () => { const n = new Date(); return `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`; };
const hora12 = (h) => {
  if (!h) return '—';
  const [hh, mm] = h.split(':').map(Number);
  return `${hh % 12 || 12}:${String(mm).padStart(2, '0')} ${hh < 12 ? 'a. m.' : 'p. m.'}`;
};

const d = reactive({
  tipo_servicio: null,
  subtipo: null, fecha: hoy(), hora_aviso: horaAhora(), hora_salida: horaAhora(),
  solicitud_por_telefono: '', solicitante: '', direccion: '', sector_id: null, lugar_critico_id: null,
  unidad_id: null, piloto_id: null, tripulacion: [],
  salida_de: ESTACION, entrada_a: ESTACION, radiotelefonista: '', vobo_jefe_servicio: '', jefes_servicio: ''
});

const cargando = ref(true);
const turno = ref(null);
const enCurso = ref([]);
const llamante = ref(null);
const guardando = ref(null);
const cambiarHora = ref(false);
// La unidad y el piloto se proponen solos mientras la persona no los elija a mano
const manual = reactive({ unidad: false, piloto: false });

// ── Lo que ya está fuera: no se puede despachar dos veces ──
const fuera = (u) => enCurso.value.find(s => s.unidad_id === u.id);
const ocupados = computed(() => {
  const m = {};
  for (const s of enCurso.value) {
    const donde = s.unidad || nombreTipo(s.tipo_servicio).toLowerCase();
    for (const p of [...(s.tripulacion || []), s.piloto_id].filter(Boolean)) m[p] = donde;
  }
  return m;
});
const ocupado = (id) => ocupados.value[id];

const deTurno = (p) => turno.value && (turno.value.personal?.includes(p.nombre_completo) || (turno.value.escuadra_id && p.escuadra_id === turno.value.escuadra_id));

// Unidades en servicio; primero las que atienden este tipo y están en la estación
const unidadesOrdenadas = computed(() => catalogos.unidades
  .filter(u => (u.estado || 'servicio') === 'servicio')
  .map(u => ({ ...u, sirve: !d.tipo_servicio || (u.servicios || []).includes(d.tipo_servicio) }))
  .sort((a, b) => (!!fuera(a) - !!fuera(b)) || (b.sirve - a.sirve) || a.codigo.localeCompare(b.codigo)));

// Pilotos de guardia (o el ya elegido); el resto, en «Otro piloto…»
// Pilotos primero; el resto del personal libre, por si maneja otra persona
const opcionesPiloto = computed(() => [
  ...pilotos.value.map(p => ({ valor: p.id, texto: p.nombre_completo, nota: ocupado(p.id) ? `en ${ocupado(p.id)}` : '', deshabilitado: !!ocupado(p.id), grupo: 'Pilotos' })),
  ...otrosPilotos.value.map(p => ({ valor: p.id, texto: p.nombre_completo, grupo: 'Otro personal' }))
]);
const pilotos = computed(() => catalogos.personal
  .filter(p => (p.es_piloto && (deTurno(p) || !turno.value)) || p.id === d.piloto_id)
  .sort((a, b) => a.nombre_completo.localeCompare(b.nombre_completo)));
const otrosPilotos = computed(() => catalogos.personal
  .filter(p => !pilotos.value.includes(p) && !ocupado(p.id))
  .sort((a, b) => (b.es_piloto - a.es_piloto) || a.nombre_completo.localeCompare(b.nombre_completo)));

const mismoLugar = computed(() => {
  if (!d.sector_id && !d.direccion.trim()) return null;
  const sector = catalogos.sector(d.sector_id)?.nombre;
  const dir = normalizar(d.direccion);
  return enCurso.value.find(s => (sector && s.sector === sector) || (dir.length > 8 && normalizar(s.direccion) === dir)) || null;
});

const falta = computed(() => !d.tipo_servicio ? 'Elija el tipo de servicio'
  : !d.direccion.trim() ? 'Escriba la dirección' : !d.fecha || d.fecha > hoy() ? 'Revise la fecha' : '');

const elegirTipo = (t) => {
  if (d.tipo_servicio !== t) d.subtipo = null;
  d.tipo_servicio = t;
  if (!manual.unidad) proponerUnidad();
};

// Propone la primera unidad libre que atiende el tipo, con su piloto si está libre y de guardia
const proponerUnidad = () => {
  const u = unidadesOrdenadas.value.find(x => x.sirve && !fuera(x));
  if (u) elegirUnidad(u, false);
};

const elegirUnidad = (u, aMano) => {
  if (aMano) manual.unidad = true;
  d.unidad_id = u.id;
  if (manual.piloto) return;
  const asignado = catalogos.persona(u.piloto_id);
  const libre = (p) => p && !ocupado(p.id);
  const piloto = libre(asignado) && (deTurno(asignado) || !turno.value) ? asignado : pilotos.value.find(libre);
  if (piloto) elegirPiloto(piloto, false);
};

const elegirPiloto = (p, aMano) => {
  if (aMano) manual.piloto = true;
  const anterior = d.piloto_id;
  d.piloto_id = p.id;
  // El piloto propuesto antes sale de la tripulación si fue el sistema quien lo puso
  let lista = d.tripulacion.filter(x => !(x === anterior && x !== p.id && !aMano));
  if (!lista.includes(p.id)) lista = [...lista, p.id];
  d.tripulacion = lista;
};

const buscarLlamante = async () => {
  const tel = (d.solicitud_por_telefono || '').replace(/\D/g, '');
  if (tel.length < 8) return;
  try {
    const { data } = await emergencias.llamante(tel);
    llamante.value = data && data.direccion !== d.direccion ? data : null;
  } catch { llamante.value = null; }
};
const usarLlamante = () => {
  const l = llamante.value;
  if (!d.solicitante) d.solicitante = l.solicitante || '';
  d.direccion = l.direccion;
  if (l.sector_id) d.sector_id = l.sector_id;
  llamante.value = null;
};

const salir = () => {
  if (!d.direccion && !d.solicitante) return router.push('/inicio');
  if (confirm('¿Salir sin registrar la llamada? Lo escrito se perderá.')) router.push('/inicio');
};

// regreso = true: servicio ya atendido; recibe su número y pasa a completarse
const guardar = async (regreso) => {
  guardando.value = regreso ? 'regreso' : 'salida';
  try {
    const { data } = await emergencias.registrar({
      ...d, regreso,
      conforme_piloto: catalogos.persona(d.piloto_id)?.nombre_completo || null
    });
    impresion.contarPendientes();
    notif.exito(data.mensaje);
    router.push(regreso ? `/boleta/${data.emergencia.id}` : '/inicio');
  } catch (e) {
    notif.error(mensajeError(e, 'No se pudo registrar la llamada'));
  } finally {
    guardando.value = null;
  }
};

onMounted(async () => {
  try {
    const [, t, c] = await Promise.all([
      catalogos.cargar(true),
      turnos.actual().catch(() => ({ data: null })),
      emergencias.enCurso().catch(() => ({ data: [] }))
    ]);
    turno.value = t.data;
    enCurso.value = c.data;
    if (t.data) {
      d.radiotelefonista = t.data.radiotelefonista || '';
      d.vobo_jefe_servicio = t.data.jefe_servicio || '';
      d.jefes_servicio = t.data.jefe_servicio || '';
    }
    if (TIPOS.some(x => x.valor === ruta.query.tipo)) elegirTipo(ruta.query.tipo);
  } catch (e) {
    notif.error(mensajeError(e, 'No se pudieron cargar los catálogos'));
  } finally {
    cargando.value = false;
  }
});
</script>

<style scoped>
.llamada { max-width: 960px; padding-bottom: 100px; }
.centro { display: flex; justify-content: center; padding: 60px; }

.bloque { padding: 18px 22px 4px; margin-bottom: 14px; }
.titulo-bloque { font-size: 16px; margin-bottom: 14px; }

.tipos { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px; margin-bottom: 14px; }
.opcion-tipo { min-height: 58px; font-size: 14.5px; gap: 10px; padding: 8px 12px; }
.icono-tipo {
  width: 38px; height: 38px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent);
}

.recuerdo {
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  padding: 10px 14px; border-radius: var(--radio-lg);
  background: var(--superficie-alt); border: 1px solid var(--borde); font-size: 14.5px;
}
.recuerdo > svg { color: var(--texto-tenue); }

.unidad { min-height: 60px; font-size: 16px; }
.unidad small { font-size: 12.5px; }

.horas {
  display: flex; align-items: center; gap: 10px;
  margin: 0 -22px; padding: 12px 22px 14px;
  border-top: 1px solid var(--borde); font-size: 14.5px; color: var(--texto-suave);
}
.horas strong { color: var(--texto); }
.horas .campo { margin-bottom: 0; }

.pie {
  position: fixed; left: var(--ancho-lateral, 272px); right: 0; bottom: 0; z-index: 40;
  background: color-mix(in srgb, var(--superficie) 94%, transparent);
  backdrop-filter: blur(8px); border-top: 1px solid var(--borde);
}
.pie-interno { display: flex; align-items: center; gap: 10px; max-width: 960px; margin: 0 auto; padding: 12px 32px; }
.falta { font-weight: 500; color: var(--texto-tenue); }

@media (max-width: 960px) {
  .pie { left: 0; }
  .pie-interno { padding: 12px 16px; flex-wrap: wrap; }
  .tipos { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
</style>
