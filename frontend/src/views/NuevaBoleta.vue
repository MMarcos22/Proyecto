<template>
  <div class="llamada animar">
    <header class="titulo-seccion">
      <div><h1>{{ incidente ? 'Otra unidad para el incidente' : 'Registrar llamada' }}</h1></div>
      <button class="btn btn-secundario" @click="salir">Cancelar</button>
    </header>

    <div v-if="cargando" class="centro"><span class="cargador cargador-oscuro"></span></div>

    <template v-else>
      <div v-if="incidente" class="aviso aviso-info mb">
        <Icono nombre="ambulancia" :tam="18" />
        <div class="crecer">Se agrega al incidente de <strong>{{ incidente.direccion }}</strong> ({{ nombreTipo(incidente.tipo_servicio).toLowerCase() }}<template v-if="incidente.unidad">, unidad {{ incidente.unidad }}</template>). La nueva unidad lleva su propia boleta, con el tipo de servicio que le corresponda.</div>
      </div>

      <div v-if="!turno" class="aviso aviso-alerta mb">
        <Icono nombre="alerta" :tam="18" />
        <div class="crecer">No hay turno abierto: piloto y tripulación solo se eligen del personal de guardia. Abra el turno para asignarlos.</div>
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
            <input id="tel" :value="d.solicitud_por_telefono" class="control num" inputmode="numeric" maxlength="8" pattern="\d{8}"
                   placeholder="8 dígitos" autocomplete="off" @input="escribirTelefono" @blur="buscarLlamante" />
            <span v-if="telefonoIncompleto" class="ayuda error-campo">El teléfono lleva 8 dígitos.</span>
          </div>
          <div class="campo">
            <label for="solic">Nombre de quien llama</label>
            <input id="solic" v-model="d.solicitante" class="control" />
            <span v-if="nombreRecordado" class="ayuda">Nombre de llamadas anteriores con este número ({{ plural(llamante.llamadas, 'vez', 'veces') }}). Corríjalo si es otra persona.</span>
          </div>
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
        <h2 class="titulo-bloque">Unidades que salen</h2>
        <p class="ayuda-bloque">Si el servicio requiere más de una unidad, elíjalas todas: cada una lleva su propia boleta, con su número, su piloto y su tripulación.</p>
        <div class="campo">
          <div class="opciones" style="--min-opcion: 190px">
            <button v-for="u in unidadesOrdenadas" :key="u.id" type="button" class="opcion unidad"
                    :class="{ elegida: elegida(u) }" :disabled="!!fuera(u)" :aria-pressed="elegida(u)" @click="alternarUnidad(u)">
              <span class="marca-check" aria-hidden="true">{{ elegida(u) ? '✓' : '' }}</span>
              <span>
                {{ u.codigo }}
                <small>{{ fuera(u) ? `Fuera · ${nombreTipo(fuera(u).tipo_servicio).toLowerCase()}` : u.descripcion || 'Unidad' }}</small>
              </span>
            </button>
          </div>
        </div>

        <div v-for="(sal, i) in d.unidades" :key="sal.unidad_id" class="salida">
          <h3 class="salida-titulo">
            <span class="cuenta-boleta">Boleta {{ i + 1 }}</span>
            Unidad {{ codigoUnidad(sal.unidad_id) }}
            <button type="button" class="btn btn-plano btn-sm quitar" @click="quitarUnidad(i)">Quitar</button>
          </h3>
          <div class="campo">
            <span class="rotulo-campo">Sale por</span>
            <div class="tipos-unidad" role="group" :aria-label="`Tipo de servicio de la unidad ${codigoUnidad(sal.unidad_id)}`">
              <button v-for="t in TIPOS" :key="t.valor" type="button" class="chip-tipo" :class="[`tipo-${t.valor}`, { elegida: sal.tipo_servicio === t.valor }]"
                      :aria-pressed="sal.tipo_servicio === t.valor" @click="sal.tipo_servicio = t.valor; sal.tipoPropio = true">
                <Icono :nombre="t.valor" :tam="15" :grosor="2.2" />{{ t.corto }}
              </button>
            </div>
          </div>
          <div class="rejilla rejilla-2">
            <div class="campo">
              <span class="rotulo-campo">Piloto</span>
              <MenuDesplegable :model-value="sal.piloto_id" :opciones="opcionesPiloto(sal)" etiqueta="Piloto"
                               :placeholder="turno ? 'Elija el piloto…' : 'Abra el turno para elegirlo'"
                               @update:model-value="(id) => elegirPiloto(sal, id, true)" />
            </div>
            <div class="campo">
              <span class="rotulo-campo">Tripulación</span>
              <SelectorTripulacion v-model="sal.tripulacion" :turno="turno" :ocupados="ocupados" :excluidos="enOtraUnidad(sal)" />
            </div>
          </div>
        </div>
        <p v-if="!d.unidades.length" class="vacio-unidades">Sin unidad elegida.</p>

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
          <span v-if="guardando === 'salida'" class="cargador"></span>{{ d.unidades.length > 1 ? `Salieron ${d.unidades.length} unidades` : 'La unidad salió' }}
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
import { hoy, plural, fechaCorta, telefonoTexto, telefonoCompleto } from '../utils/formato';
import { normalizar } from '../utils/sector';
import { estaDeTurno, personalDeTurno } from '../utils/turno';
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
  // Una entrada por unidad que sale: cada una será una boleta
  unidades: [],
  salida_de: ESTACION, entrada_a: ESTACION, radiotelefonista: '', vobo_jefe_servicio: '', jefes_servicio: ''
});

const cargando = ref(true);
const turno = ref(null);
const enCurso = ref([]);
const llamante = ref(null);
const nombreRecordado = ref(false);
// Incidente en curso al que se agrega otra unidad (/boleta/nueva?incidente=ID)
const incidente = ref(null);
const guardando = ref(null);
const cambiarHora = ref(false);
// La unidad se propone sola mientras la persona no elija a mano
const unidadManual = ref(false);

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

const deTurno = (p) => estaDeTurno(p, turno.value);
const codigoUnidad = (id) => catalogos.unidades.find(u => u.id === id)?.codigo || '';

// Unidades en servicio; primero las que atienden este tipo y están en la estación
const unidadesOrdenadas = computed(() => catalogos.unidades
  .filter(u => (u.estado || 'servicio') === 'servicio')
  .map(u => ({ ...u, sirve: !d.tipo_servicio || (u.servicios || []).includes(d.tipo_servicio) }))
  .sort((a, b) => (!!fuera(a) - !!fuera(b)) || (b.sirve - a.sirve) || a.codigo.localeCompare(b.codigo)));
const elegida = (u) => d.unidades.some(s => s.unidad_id === u.id);

// Quién ya va en otra unidad de esta llamada: no puede ir en dos
const enOtraUnidad = (sal) => {
  const m = {};
  for (const otra of d.unidades) {
    if (otra === sal) continue;
    for (const p of [otra.piloto_id, ...otra.tripulacion].filter(Boolean)) m[p] = `en ${codigoUnidad(otra.unidad_id)}`;
  }
  return m;
};

// Piloto: solo personal de guardia; los pilotos primero
const opcionesPiloto = (sal) => {
  const otra = enOtraUnidad(sal);
  return personalDeTurno(catalogos.personal, turno.value, [sal.piloto_id])
    .sort((a, b) => (b.es_piloto - a.es_piloto) || a.nombre_completo.localeCompare(b.nombre_completo))
    .map(p => ({
      valor: p.id, texto: p.nombre_completo, nota: ocupado(p.id) ? `en ${ocupado(p.id)}` : otra[p.id] || '',
      deshabilitado: p.id !== sal.piloto_id && !!(ocupado(p.id) || otra[p.id]),
      grupo: p.es_piloto ? 'Pilotos de guardia' : 'Otro personal de guardia'
    }));
};

const mismoLugar = computed(() => {
  if (!d.sector_id && !d.direccion.trim()) return null;
  const sector = catalogos.sector(d.sector_id)?.nombre;
  const dir = normalizar(d.direccion);
  return enCurso.value.find(s => (sector && s.sector === sector) || (dir.length > 8 && normalizar(s.direccion) === dir)) || null;
});

const telefonoIncompleto = computed(() => !!d.solicitud_por_telefono && !telefonoCompleto(d.solicitud_por_telefono));

const falta = computed(() => !d.tipo_servicio ? 'Elija el tipo de servicio'
  : !d.direccion.trim() ? 'Escriba la dirección'
  : telefonoIncompleto.value ? 'El teléfono lleva 8 dígitos'
  : !d.fecha || d.fecha > hoy() ? 'Revise la fecha' : '');

const elegirTipo = (t) => {
  if (d.tipo_servicio !== t) d.subtipo = null;
  d.tipo_servicio = t;
  // Las unidades a las que no se les eligió otro tipo siguen el de la llamada
  for (const sal of d.unidades) if (!sal.tipoPropio) sal.tipo_servicio = t;
  if (!unidadManual.value) proponerUnidad();
};

// Propone la primera unidad libre que atiende el tipo, con su piloto si está libre y de guardia
const proponerUnidad = () => {
  const u = unidadesOrdenadas.value.find(x => x.sirve && !fuera(x));
  d.unidades = [];
  if (u) agregarUnidad(u);
};

// Cada unidad sale por un tipo de servicio: el de la llamada si la unidad lo atiende;
// si no, el primero que atiende (la ambulancia que acompaña a la motobomba va por ambulancia)
const tipoPara = (u) => {
  const servicios = u.servicios || [];
  if (!d.tipo_servicio || !servicios.length || servicios.includes(d.tipo_servicio)) return d.tipo_servicio;
  return servicios[0];
};

const agregarUnidad = (u) => {
  const tipo = tipoPara(u);
  const sal = reactive({ unidad_id: u.id, piloto_id: null, tripulacion: [], pilotoManual: false,
    tipo_servicio: tipo, tipoPropio: !!tipo && tipo !== d.tipo_servicio });
  d.unidades.push(sal);
  const asignado = catalogos.persona(u.piloto_id);
  const libre = (p) => p && !ocupado(p.id) && !enOtraUnidad(sal)[p.id];
  const candidatos = personalDeTurno(catalogos.personal, turno.value).filter(p => p.es_piloto);
  const piloto = libre(asignado) && deTurno(asignado) ? asignado : candidatos.find(libre);
  if (piloto) elegirPiloto(sal, piloto.id, false);
};

const alternarUnidad = (u) => {
  unidadManual.value = true;
  const i = d.unidades.findIndex(s => s.unidad_id === u.id);
  if (i >= 0) quitarUnidad(i);
  else agregarUnidad(u);
};
const quitarUnidad = (i) => {
  unidadManual.value = true;
  d.unidades.splice(i, 1);
};

const elegirPiloto = (sal, id, aMano) => {
  if (aMano) sal.pilotoManual = true;
  const anterior = sal.piloto_id;
  sal.piloto_id = id;
  // El piloto va también en la tripulación; el que puso el sistema antes se retira
  let lista = sal.tripulacion.filter(x => !(x === anterior && x !== id && !aMano));
  if (id && !lista.includes(id)) lista = [...lista, id];
  sal.tripulacion = lista;
};

const escribirTelefono = (e) => {
  d.solicitud_por_telefono = telefonoTexto(e.target.value);
  e.target.value = d.solicitud_por_telefono;
  if (telefonoCompleto(d.solicitud_por_telefono)) buscarLlamante();
};

// Si el número ya llamó antes, se propone solo el nombre: la dirección puede
// cambiar de una llamada a otra y no debe quedar una anterior por error
const buscarLlamante = async () => {
  if (!telefonoCompleto(d.solicitud_por_telefono)) return;
  try {
    const { data } = await emergencias.llamante(d.solicitud_por_telefono);
    llamante.value = data;
    if (data?.solicitante && !d.solicitante.trim()) {
      d.solicitante = data.solicitante;
      nombreRecordado.value = true;
    }
  } catch { llamante.value = null; }
};

const salir = () => {
  if (!d.direccion && !d.solicitante) return router.push('/inicio');
  if (confirm('¿Salir sin registrar la llamada? Lo escrito se perderá.')) router.push('/inicio');
};

// regreso = true: servicio ya atendido; recibe su número y pasa a completarse
const guardar = async (regreso) => {
  guardando.value = regreso ? 'regreso' : 'salida';
  try {
    const { unidades, ...resto } = d;
    const { data } = await emergencias.registrar({
      ...resto, regreso,
      incidente_id: incidente.value?.id,
      unidades: unidades.map(u => ({ unidad_id: u.unidad_id, piloto_id: u.piloto_id, tripulacion: u.tripulacion, tipo_servicio: u.tipo_servicio || d.tipo_servicio }))
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
    // Otra unidad para un incidente en curso: la llamada ya está tomada
    if (ruta.query.incidente) {
      const { data: inc } = await emergencias.obtener(ruta.query.incidente);
      incidente.value = inc;
      Object.assign(d, {
        direccion: inc.direccion || '', sector_id: inc.sector_id, lugar_critico_id: inc.lugar_critico_id,
        solicitante: inc.solicitante || '', solicitud_por_telefono: inc.solicitud_por_telefono || '',
        fecha: inc.fecha, hora_aviso: inc.hora_aviso?.slice(0, 5) || d.hora_aviso
      });
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
.ayuda-bloque { margin: -6px 0 14px; font-size: 14px; color: var(--texto-suave); }
.error-campo { color: var(--peligro); font-weight: 600; }

.tipos { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px; margin-bottom: 14px; }
.opcion-tipo { min-height: 58px; font-size: 14.5px; gap: 10px; padding: 8px 12px; }
.icono-tipo {
  width: 38px; height: 38px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent);
}

.unidad { min-height: 60px; font-size: 16px; gap: 10px; }
.unidad small { font-size: 12.5px; }
.marca-check {
  width: 24px; height: 24px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  border: 1px solid var(--borde-fuerte); border-radius: 7px; font-size: 14px;
}
.elegida .marca-check { background: var(--acento); border-color: var(--acento); color: #fff; }

.salida { padding: 14px 16px 2px; margin-bottom: 12px; border: 1px solid var(--borde); border-radius: var(--radio-lg); background: var(--superficie-alt); }
.salida-titulo { display: flex; align-items: center; gap: 10px; font-size: 15px; margin-bottom: 12px; }
.salida-titulo .quitar { margin-left: auto; }
.cuenta-boleta { padding: 2px 9px; border-radius: 999px; background: var(--acento-tenue); color: var(--acento-texto); font-size: 12.5px; font-weight: 600; }
.tipos-unidad { display: flex; flex-wrap: wrap; gap: 6px; }
.chip-tipo {
  display: inline-flex; align-items: center; gap: 6px; height: 34px; padding: 0 12px;
  border: 1px solid var(--borde-fuerte); border-radius: 999px; background: var(--superficie);
  font: inherit; font-size: 13.5px; font-weight: 500; color: var(--texto-suave); cursor: pointer;
}
.chip-tipo svg { color: var(--c); }
.chip-tipo.elegida { border-color: var(--c); background: color-mix(in srgb, var(--c) 14%, var(--superficie)); color: var(--texto); font-weight: 600; }
.vacio-unidades { margin-bottom: 14px; color: var(--texto-tenue); font-size: 14px; }

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
