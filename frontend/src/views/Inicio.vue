<template>
  <div class="animar inicio">
    <header class="titulo-seccion">
      <div><h1>{{ fechaHoy }}</h1></div>
    </header>

    <!-- ══ DIRECCIÓN: resumen del mes ═════════════════ -->
    <template v-if="auth.esDireccion">
      <section v-if="resumen" class="indicadores">
        <router-link to="/panel" class="indicador">
          <span class="rotulo">Servicios este mes</span>
          <div class="valor">{{ resumen.resumen.servicios }}</div>
          <div class="pie">{{ cambioMes }}</div>
        </router-link>
        <router-link to="/servicios" class="indicador">
          <span class="rotulo">Sector con más servicios</span>
          <div class="valor valor-texto">{{ resumen.por_sector[0]?.sector || '—' }}</div>
          <div class="pie">{{ resumen.por_sector[0] ? `${resumen.por_sector[0].total} servicios` : '' }}</div>
        </router-link>
        <router-link to="/inventario" class="indicador" :class="{ critico: resumen.inventario.agotados }">
          <span class="rotulo">Insumos agotados</span>
          <div class="valor">{{ resumen.inventario.agotados }}</div>
          <div class="pie">{{ resumen.inventario.bajos }} más bajo el mínimo</div>
        </router-link>
        <router-link to="/revision" class="indicador" :class="{ atencion: impresion.cuentas.por_completar }">
          <span class="rotulo">Boletas por completar</span>
          <div class="valor">{{ impresion.cuentas.por_completar }}</div>
          <div class="pie">{{ impresion.cuentas.por_firmar }} esperan firma</div>
        </router-link>
      </section>
    </template>

    <template v-else>
      <!-- ══ CIFRAS DEL MOMENTO ═══════════════════════ -->
      <section class="indicadores mb-bloque">
        <div class="indicador">
          <span class="rotulo">Unidades fuera</span>
          <div class="valor">{{ enCurso.length }}</div>
          <div class="pie">{{ enCurso.length ? 'en servicio ahora' : 'todas en la estación' }}</div>
        </div>
        <div class="indicador" :class="{ atencion: porCompletar.length }">
          <span class="rotulo">Boletas por completar</span>
          <div class="valor">{{ porCompletar.length }}</div>
          <div class="pie">esperan a la tripulación</div>
        </div>
        <router-link :to="auth.esAdministrador ? '/revision' : '/historial'" class="indicador">
          <span class="rotulo">Esperan firma</span>
          <div class="valor">{{ impresion.cuentas.por_firmar || 0 }}</div>
          <div class="pie">{{ impresion.cuentas.por_imprimir || 0 }} sin imprimir</div>
        </router-link>
        <router-link to="/inventario" class="indicador" :class="{ critico: alertas.datos.resumen.total }">
          <span class="rotulo">Alertas de inventario</span>
          <div class="valor">{{ alertas.datos.resumen.total || 0 }}</div>
          <div class="pie">agotados, bajos o por vencer</div>
        </router-link>
      </section>

      <div class="tablero">
        <!-- ══ COLUMNA PRINCIPAL: lo que está pasando ══ -->
        <div class="tablero-principal">
          <!-- ══ UNIDADES FUERA ═══════════════════════════ -->
          <section class="tarjeta">
            <div class="tarjeta-cabecera">
              <h3>Unidades fuera <span class="cuenta">{{ enCurso.length }}</span></h3>
            </div>
            <p v-if="!enCurso.length" class="vacio-linea">Todas las unidades están en la estación.</p>
            <ul v-else class="filas">
              <li v-for="s in enCurso" :key="s.id">
                <span class="icono-tipo" :class="`tipo-${s.tipo_servicio}`"><Icono :nombre="s.tipo_servicio" :tam="18" :grosor="2.2" /></span>
                <div class="crecer texto-fila">
                  <strong>{{ nombreTipo(s.tipo_servicio) }}<template v-if="s.unidad"> · unidad {{ s.unidad }}</template></strong>
                  <span class="suave">{{ lugarDe(s) }}</span>
                </div>
                <div class="tiempo-fila" :class="{ aviso: minutosFuera(s) > HORAS_ALERTA * 60 }">
                  <strong>{{ transcurrido(s) }}</strong>
                  <span>{{ minutosFuera(s) > HORAS_ALERTA * 60 ? '¿regreso sin registrar?' : `salió ${hora(s.hora_salida)}` }}</span>
                </div>
                <div v-if="auth.puedeEditar" class="acciones-fila">
                  <button class="btn btn-plano btn-sm" @click="abrirCancelar(s)">Se canceló</button>
                  <button class="btn btn-primario btn-sm" @click="abrirRegreso(s)">Regresó</button>
                </div>
              </li>
            </ul>
          </section>

          <!-- ══ POR COMPLETAR ════════════════════════════ -->
          <section class="tarjeta">
            <div class="tarjeta-cabecera">
              <h3>Boletas por completar <span class="cuenta">{{ porCompletar.length }}</span></h3>
            </div>
            <p v-if="!porCompletar.length" class="vacio-linea">Ninguna boleta pendiente.</p>
            <ul v-else class="filas">
              <li v-for="b in porCompletar" :key="b.id" :class="{ resaltada: b.id === recienRegresada }">
                <span class="icono-tipo" :class="`tipo-${b.tipo_servicio}`"><Icono :nombre="b.tipo_servicio" :tam="18" :grosor="2.2" /></span>
                <div class="crecer texto-fila">
                  <strong><span class="control-num">{{ b.numero_control }}</span> · {{ nombreTipo(b.tipo_servicio) }}</strong>
                  <span class="suave recortar">{{ b.tripulacion.length ? b.tripulacion.join(', ') : 'Sin tripulación registrada' }}</span>
                  <span class="falta-fila">Falta: {{ textoFaltantes(b.faltantes) }}</span>
                </div>
                <div class="tiempo-fila">
                  <strong>{{ haceCuanto(b.regreso_en) }}</strong>
                  <span>desde que regresó</span>
                </div>
                <div v-if="auth.puedeEditar" class="acciones-fila">
                  <router-link :to="`/boleta/${b.id}`" class="btn btn-secundario btn-sm">Completar</router-link>
                </div>
              </li>
            </ul>
          </section>
        </div>

        <!-- ══ COLUMNA LATERAL: turno, nueva llamada, pendientes ══ -->
        <aside class="tablero-lateral">
          <section class="tarjeta">
            <div class="tarjeta-cabecera">
              <h3>Turno de guardia</h3>
              <button v-if="turno" class="btn-enlace" @click="abrirTurno(turno)">Corregir</button>
            </div>
            <div v-if="turno" class="tarjeta-cuerpo">
              <p class="turno-escuadra"><span class="punto" aria-hidden="true"></span><strong>{{ turno.escuadra || 'Turno' }}</strong><span class="tenue">desde {{ horaInicio }}</span></p>
              <dl class="datos-lado">
                <div><dt>Cabina</dt><dd>{{ turno.radiotelefonista }}</dd></div>
                <div><dt>Jefe de servicio</dt><dd>{{ turno.jefe_servicio || '—' }}</dd></div>
                <div><dt>De guardia</dt><dd>{{ plural(turno.personal.length, 'persona', 'personas') }}</dd></div>
              </dl>
              <button class="btn btn-secundario btn-bloque" @click="abrirTurno()">Entregar turno</button>
            </div>
            <div v-else-if="!cargando" class="tarjeta-cuerpo">
              <p class="sin-turno-texto"><Icono nombre="alerta" :tam="18" />No hay turno abierto</p>
              <button class="btn btn-primario btn-bloque" @click="abrirTurno()">Abrir turno</button>
            </div>
          </section>

          <section v-if="auth.puedeEditar" class="tarjeta">
            <div class="tarjeta-cabecera"><h3>Registrar llamada</h3></div>
            <nav class="lista-lado">
              <router-link v-for="t in TIPOS" :key="t.valor" :to="`/boleta/nueva?tipo=${t.valor}`" :class="`tipo-${t.valor}`">
                <span class="icono-tipo"><Icono :nombre="t.valor" :tam="18" :grosor="2.2" /></span>
                <span class="crecer">{{ t.nombre }}</span>
                <Icono nombre="chevron_der" :tam="14" />
              </router-link>
            </nav>
          </section>

          <section v-if="auth.esAdministrador" class="tarjeta">
            <div class="tarjeta-cabecera"><h3>Por revisar</h3></div>
            <nav class="lista-lado">
              <router-link v-if="impresion.cuentas.por_firmar" to="/revision">
                <span class="crecer"><strong>{{ plural(impresion.cuentas.por_firmar, 'boleta completa', 'boletas completas') }}</strong> por firmar</span>
                <Icono nombre="chevron_der" :tam="14" />
              </router-link>
              <router-link v-if="impresion.cuentas.por_imprimir" to="/imprimir">
                <span class="crecer"><strong>{{ plural(impresion.cuentas.por_imprimir, 'boleta', 'boletas') }}</strong> sin imprimir</span>
                <Icono nombre="chevron_der" :tam="14" />
              </router-link>
              <router-link v-if="alertas.datos.resumen.total" to="/inventario">
                <span class="crecer"><strong>{{ plural(alertas.datos.resumen.total, 'alerta', 'alertas') }}</strong> de inventario</span>
                <Icono nombre="chevron_der" :tam="14" />
              </router-link>
              <p v-if="!impresion.cuentas.por_firmar && !impresion.cuentas.por_imprimir && !alertas.datos.resumen.total" class="tenue todo-al-dia">Todo al día.</p>
            </nav>
          </section>
        </aside>
      </div>
    </template>

    <!-- ══ REGISTRAR REGRESO ═════════════════════════ -->
    <Modal v-model="modalRegreso" titulo="La unidad regresó" ancho="440px">
      <p v-if="regresando" class="mb"><strong>{{ nombreTipo(regresando.tipo_servicio) }}<template v-if="regresando.unidad"> · {{ regresando.unidad }}</template></strong><br><span class="suave">{{ lugarDe(regresando) }}</span></p>
      <div class="campo">
        <label for="hora-regreso">Hora de regreso</label>
        <input id="hora-regreso" v-model="horaRegreso" type="time" class="control" style="max-width:170px" />
      </div>
      <template #acciones>
        <button class="btn btn-secundario" @click="modalRegreso = false">Cancelar</button>
        <button class="btn btn-primario" :disabled="!horaRegreso || registrando" @click="registrarRegreso">
          <span v-if="registrando" class="cargador"></span>Asignar número
        </button>
      </template>
    </Modal>

    <!-- ══ CANCELAR UN SERVICIO EN CURSO ═════════════ -->
    <Modal v-model="modalCancelar" titulo="Cancelar servicio" ancho="460px">
      <p v-if="cancelando" class="mb"><strong>{{ nombreTipo(cancelando.tipo_servicio) }}<template v-if="cancelando.unidad"> · {{ cancelando.unidad }}</template></strong><br><span class="suave">{{ lugarDe(cancelando) }}</span></p>
      <span class="rotulo-campo">¿Qué pasó? <span class="req">*</span></span>
      <input v-model="motivoCancelar" class="control" placeholder="Elija o escriba el motivo…" aria-label="Motivo" list="dl-motivos-cancelar" />
      <datalist id="dl-motivos-cancelar"><option v-for="m in MOTIVOS_CANCELAR" :key="m" :value="m" /></datalist>
      <template #acciones>
        <button class="btn btn-secundario" @click="modalCancelar = false">Volver</button>
        <button class="btn btn-primario" :disabled="motivoCancelar.trim().length < 10 || registrando" @click="cancelarServicio">Cancelar servicio</button>
      </template>
    </Modal>

    <!-- ══ TURNO ═════════════════════════════════════ -->
    <Modal v-model="modalTurno" :titulo="formTurno.id ? 'Editar turno' : 'Abrir turno'" ancho="620px">
      <div class="campo">
        <label for="t-esc">Escuadra de guardia</label>
        <select id="t-esc" :value="formTurno.escuadra_id ?? ''" class="control" @change="elegirEscuadra(escuadras.find(e => String(e.id) === $event.target.value))">
          <option value="" disabled>Elija la escuadra…</option>
          <option v-for="e in escuadras" :key="e.id" :value="e.id">{{ e.nombre }}</option>
        </select>
        <span v-if="!escuadras.length" class="ayuda">No hay escuadras registradas. Créelas en Configuración › Catálogos.</span>
      </div>
      <div class="rejilla rejilla-2">
        <div class="campo">
          <label for="t-cab">Cabinista <span class="req">*</span></label>
          <select id="t-cab" v-model="formTurno.radiotelefonista" class="control">
            <option value="">Elija…</option>
            <option v-for="p in personalTurno" :key="p.id" :value="p.nombre_completo">{{ p.nombre_completo }}</option>
          </select>
        </div>
        <div class="campo">
          <label for="t-jefe">Jefe de servicio</label>
          <select id="t-jefe" v-model="formTurno.jefe_servicio" class="control">
            <option value="">Elija…</option>
            <option v-for="p in personalTurno" :key="p.id" :value="p.nombre_completo">{{ p.nombre_completo }}</option>
          </select>
        </div>
      </div>
      <div class="campo">
        <label for="t-guardia">De guardia</label>
        <MenuDesplegable id="t-guardia" v-model="formTurno.personal" :opciones="personalTurno.map(p => ({ valor: p.nombre_completo, texto: p.nombre_completo }))"
                         multiple buscar etiqueta="De guardia" placeholder="Elija al personal de guardia…" />
      </div>
      <template #acciones>
        <button class="btn btn-secundario" @click="modalTurno = false">Cancelar</button>
        <button class="btn btn-primario" :disabled="!formTurno.radiotelefonista || guardando" @click="guardarTurno">{{ formTurno.id ? 'Guardar' : 'Abrir turno' }}</button>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import { turnos, emergencias, catalogos as apiCatalogos, reportes, mensajeError } from '../services/api';
import { useAuthStore } from '../stores/auth';
import { useAlertasStore } from '../stores/alertas';
import { useImpresionStore } from '../stores/impresion';
import { useCatalogosStore, TIPOS, nombreTipo } from '../stores/catalogos';
import { useNotificacionesStore } from '../stores/notificaciones';
import { DIAS, fechaLarga, hoy, hora, plural, variacion } from '../utils/formato';
import { normalizar } from '../utils/sector';
import Icono from '../components/Icono.vue';
import Modal from '../components/Modal.vue';
import MenuDesplegable from '../components/MenuDesplegable.vue';

const auth = useAuthStore();
const alertas = useAlertasStore();
const impresion = useImpresionStore();
const catalogos = useCatalogosStore();
const notif = useNotificacionesStore();

const turno = ref(null);
const enCurso = ref([]);
const porCompletar = ref([]);
const resumen = ref(null);
const escuadras = ref([]);
const cargando = ref(true);
const ahora = ref(Date.now());

const modalRegreso = ref(false);
const regresando = ref(null);
const horaRegreso = ref('');
const registrando = ref(false);
const recienRegresada = ref(null);

// Sin número todavía: cancelarlo no deja un salto en la numeración
const MOTIVOS_CANCELAR = ['Cancelaron la llamada antes de llegar', 'Llamada repetida del mismo incidente', 'Registrada por error'];
const modalCancelar = ref(false);
const cancelando = ref(null);
const motivoCancelar = ref('');

const modalTurno = ref(false);
const guardando = ref(false);
const formTurno = reactive({ id: null, escuadra_id: null, radiotelefonista: '', jefe_servicio: '', personal: [] });

const fechaHoy = (() => { const t = `${DIAS[new Date().getDay()]}, ${fechaLarga(hoy())}`; return t[0].toUpperCase() + t.slice(1); })();
// Dirección y sector sin repetir el sector cuando la dirección ya lo nombra
const lugarDe = (s) => !s.sector || normalizar(s.direccion).includes(normalizar(s.sector)) ? s.direccion : `${s.direccion} · ${s.sector}`;
const horaAhora = () => { const n = new Date(); return `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`; };
const horaInicio = computed(() => {
  if (!turno.value) return '';
  const d = new Date(turno.value.inicio);
  const mismoDia = d.toDateString() === new Date().toDateString();
  return `${mismoDia ? 'las ' : `el ${d.getDate()}/${d.getMonth() + 1} a las `}${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
});
const cambioMes = computed(() => {
  const r = resumen.value?.resumen;
  if (!r) return '';
  if (r.servicios_anterior < 5) return `${r.servicios - r.servicios_anterior >= 0 ? '+' : '−'}${Math.abs(r.servicios - r.servicios_anterior)} frente al periodo anterior`;
  return `${variacion(r.variacion).texto} frente al periodo anterior`;
});

// Personal del turno: primero la escuadra elegida, luego el resto (voluntarios y apoyos)
const personalTurno = computed(() => {
  const lista = [...catalogos.personal];
  return lista.sort((a, b) => (b.escuadra_id === formTurno.escuadra_id) - (a.escuadra_id === formTurno.escuadra_id)
    || a.nombre_completo.localeCompare(b.nombre_completo));
});

// Un servicio rara vez dura más que esto; pasado ese tiempo lo más probable
// es que no se registró el regreso
const HORAS_ALERTA = 6;

const minutosFuera = (s) => {
  let inicio = new Date(s.creado_en).getTime();
  if (s.hora_salida && s.fecha) {
    const [a, m, d] = s.fecha.split('-').map(Number);
    const [h, mi] = s.hora_salida.split(':').map(Number);
    inicio = new Date(a, m - 1, d, h, mi).getTime();
  }
  return Math.max(0, Math.round((ahora.value - inicio) / 60000));
};
const textoMinutos = (min) => min < 60 ? `hace ${min} min` : min < 1440 ? `hace ${Math.floor(min / 60)} h ${String(min % 60).padStart(2, '0')} min` : `hace ${Math.floor(min / 1440)} d`;
const transcurrido = (s) => textoMinutos(minutosFuera(s));
const haceCuanto = (ts) => ts ? textoMinutos(Math.max(0, Math.round((ahora.value - new Date(ts).getTime()) / 60000))) : '—';
const textoFaltantes = (lista) => {
  if (!lista.length) return 'Nada, ya se puede completar';
  const nombres = lista.map(f => f.etiqueta.toLowerCase());
  return `${nombres.slice(0, 3).join(', ')}${nombres.length > 3 ? ` y ${nombres.length - 3} más` : ''}`;
};

const cargar = async () => {
  try {
    if (auth.esDireccion) {
      const { data } = await reportes.panel();
      resumen.value = data;
    } else {
      const [t, e, p] = await Promise.all([turnos.actual(), emergencias.enCurso(), emergencias.porCompletar()]);
      turno.value = t.data;
      enCurso.value = e.data;
      porCompletar.value = p.data;
    }
    impresion.contarPendientes();
  } catch (e) {
    notif.error(mensajeError(e, 'No se pudo cargar el inicio'));
  } finally {
    cargando.value = false;
  }
};

const abrirRegreso = (s) => {
  regresando.value = s;
  horaRegreso.value = horaAhora();
  modalRegreso.value = true;
};

const registrarRegreso = async () => {
  registrando.value = true;
  try {
    const { data } = await emergencias.regreso(regresando.value.id, horaRegreso.value);
    modalRegreso.value = false;
    notif.exito(`${data.mensaje}. Complétela cuando pueda.`);
    recienRegresada.value = regresando.value.id;
    await cargar();
  } catch (e) {
    notif.error(mensajeError(e, 'No se pudo registrar el regreso'));
  } finally {
    registrando.value = false;
  }
};

const abrirCancelar = (s) => {
  cancelando.value = s;
  motivoCancelar.value = '';
  modalCancelar.value = true;
};
const cancelarServicio = async () => {
  registrando.value = true;
  try {
    await emergencias.anular(cancelando.value.id, motivoCancelar.value.trim());
    modalCancelar.value = false;
    notif.exito('Servicio cancelado');
    await cargar();
  } catch (e) {
    notif.error(mensajeError(e, 'No se pudo cancelar'));
  } finally {
    registrando.value = false;
  }
};

const abrirTurno = async (t = null) => {
  try {
    const { data } = await apiCatalogos.escuadras.listar();
    escuadras.value = data;
  } catch { escuadras.value = []; }
  Object.assign(formTurno, t
    ? { id: t.id, escuadra_id: t.escuadra_id, radiotelefonista: t.radiotelefonista || '', jefe_servicio: t.jefe_servicio || '', personal: [...t.personal] }
    : { id: null, escuadra_id: null, radiotelefonista: '', jefe_servicio: '', personal: [] });
  modalTurno.value = true;
};

const elegirEscuadra = (e) => {
  formTurno.escuadra_id = e.id;
  formTurno.personal = catalogos.personal.filter(p => p.escuadra_id === e.id).map(p => p.nombre_completo);
};

const guardarTurno = async () => {
  guardando.value = true;
  try {
    const datos = { escuadra_id: formTurno.escuadra_id, radiotelefonista: formTurno.radiotelefonista, jefe_servicio: formTurno.jefe_servicio, personal: formTurno.personal };
    const { data } = formTurno.id ? await turnos.editar(formTurno.id, datos) : await turnos.abrir(datos);
    turno.value = data;
    modalTurno.value = false;
    notif.exito(formTurno.id ? 'Turno actualizado' : 'Turno abierto');
  } catch (e) {
    notif.error(mensajeError(e));
  } finally {
    guardando.value = false;
  }
};

let reloj = null;
onMounted(() => {
  catalogos.cargar().catch(() => {});
  cargar();
  reloj = setInterval(() => { ahora.value = Date.now(); }, 30000);
});
onUnmounted(() => clearInterval(reloj));
</script>

<style scoped>
.inicio { max-width: 1120px; }

.valor-texto { font-size: 22px !important; line-height: 1.3 !important; }

.mb-bloque { margin-bottom: 24px; }

/* Tablero: columna principal con lo que está pasando, lateral con turno y accesos */
.tablero { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 24px; align-items: start; }
.tablero-principal > .bloque-inicio:first-child { margin-top: 0; }
.tablero-lateral { display: flex; flex-direction: column; gap: 16px; }

.turno-escuadra { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; font-size: 15.5px; }
.turno-escuadra .tenue { font-size: 13.5px; }
.punto { width: 9px; height: 9px; border-radius: 50%; background: var(--exito-vivo); flex-shrink: 0; }
.datos-lado { margin-bottom: 16px; }
.datos-lado div { display: flex; justify-content: space-between; gap: 12px; padding: 8px 0; border-bottom: 1px solid var(--borde); font-size: 14px; }
.datos-lado div:last-child { border-bottom: none; }
.datos-lado dt { color: var(--texto-tenue); }
.datos-lado dd { text-align: right; font-weight: 500; }
.sin-turno-texto { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; font-weight: 600; color: var(--alerta); }

.lista-lado { padding: 6px; }
.lista-lado a {
  display: flex; align-items: center; gap: 12px; padding: 10px 12px;
  border-radius: var(--radio); font-size: 14.5px; color: var(--texto); text-decoration: none;
}
.lista-lado a:hover { background: var(--superficie-alt); }
.lista-lado a > svg:last-child { color: var(--texto-tenue); }
.todo-al-dia { padding: 10px 12px; font-size: 14px; }

.cuenta { min-width: 22px; height: 22px; padding: 0 7px; margin-left: 6px; display: inline-flex; align-items: center; justify-content: center; border-radius: 999px; background: var(--acento); color: #fff; font-size: 12px; font-weight: 600; font-variant-numeric: tabular-nums; vertical-align: 1px; }
.tablero-principal { display: flex; flex-direction: column; gap: 20px; }

.filas { list-style: none; }
.filas li { display: flex; align-items: center; gap: 14px; padding: 14px 18px; border-bottom: 1px solid var(--borde); }
.filas li:last-child { border-bottom: none; }
.filas li.resaltada { background: var(--acento-tenue); }
.texto-fila { min-width: 0; }
.texto-fila strong { display: block; font-size: 15px; font-weight: 600; }
.texto-fila .suave { display: block; font-size: 13.5px; }
.recortar { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.control-num { color: var(--acento-texto); }
.falta-fila { display: block; margin-top: 2px; font-size: 12.5px; color: var(--alerta); }
.tiempo-fila { text-align: right; flex-shrink: 0; }
.tiempo-fila strong { display: block; font-size: 15px; font-weight: 600; white-space: nowrap; }
.tiempo-fila span { display: block; font-size: 12.5px; color: var(--texto-tenue); white-space: nowrap; }
.tiempo-fila.aviso strong, .tiempo-fila.aviso span { color: var(--peligro); }
.acciones-fila { display: flex; gap: 6px; flex-shrink: 0; }
.vacio-linea { padding: 16px 18px; color: var(--texto-suave); font-size: 14.5px; }

@media (max-width: 640px) {
  .filas li { flex-wrap: wrap; }
  .acciones-fila { width: 100%; justify-content: flex-end; }
}

.icono-tipo {
  width: 34px; height: 34px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent);
  flex-shrink: 0;
}

@media (max-width: 1100px) {
  .tablero { grid-template-columns: 1fr; }
}
</style>
