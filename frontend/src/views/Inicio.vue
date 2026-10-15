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
      <!-- ══ ADMINISTRACIÓN: primero el inventario ════════ -->
      <template v-if="auth.esAdministrador">
        <h2 class="titulo-grupo">Inventario</h2>
        <section class="indicadores mb-bloque">
          <router-link to="/inventario?estado=agotado" class="indicador" :class="{ critico: alertas.datos.resumen.agotados }">
            <span class="rotulo">Agotados</span>
            <div class="valor">{{ alertas.datos.resumen.agotados }}</div>
            <div class="pie">sin existencia</div>
          </router-link>
          <router-link to="/lotes?estado=por_vencer" class="indicador" :class="{ critico: alertas.datos.resumen.vencidos, atencion: alertas.datos.resumen.por_vencer }">
            <span class="rotulo">Próximos a vencer</span>
            <div class="valor">{{ alertas.datos.resumen.por_vencer }}</div>
            <div class="pie">{{ alertas.datos.resumen.vencidos ? `${plural(alertas.datos.resumen.vencidos, 'lote vencido', 'lotes vencidos')} por dar de baja` : 'lotes por vencer' }}</div>
          </router-link>
          <router-link to="/inventario?estado=bajo" class="indicador" :class="{ atencion: alertas.datos.resumen.bajos }">
            <span class="rotulo">Nivel bajo</span>
            <div class="valor">{{ alertas.datos.resumen.bajos }}</div>
            <div class="pie">requieren reabastecimiento</div>
          </router-link>
          <router-link to="/inventario?estado=normal" class="indicador">
            <span class="rotulo">En buen nivel</span>
            <div class="valor valor-bien">{{ insumosBien }}</div>
            <div class="pie">sobre la existencia mínima</div>
          </router-link>
        </section>

        <div class="rejilla-admin mb-bloque">
          <section class="tarjeta">
            <div class="tarjeta-cabecera">
              <h3>Requieren reabastecimiento</h3>
              <router-link to="/proyeccion" class="btn-enlace">Proyección</router-link>
            </div>
            <p v-if="!porReabastecer.length" class="vacio-linea">Ningún insumo bajo el mínimo.</p>
            <ul v-else class="filas filas-compactas">
              <li v-for="i in porReabastecer.slice(0, 8)" :key="i.id">
                <span class="punto-estado" :class="i.estado" aria-hidden="true"></span>
                <span class="crecer recortar">{{ i.nombre }}</span>
                <span class="num" :class="i.estado === 'agotado' ? 'texto-peligro' : 'texto-alerta'">{{ i.stock_actual }} / mín. {{ i.stock_minimo }}</span>
              </li>
            </ul>
          </section>
          <section class="tarjeta">
            <div class="tarjeta-cabecera">
              <h3>Lotes por vencer</h3>
              <router-link to="/lotes" class="btn-enlace">Lotes</router-link>
            </div>
            <p v-if="!lotesAlerta.length" class="vacio-linea">Ningún lote vence pronto.</p>
            <ul v-else class="filas filas-compactas">
              <li v-for="l in lotesAlerta.slice(0, 8)" :key="l.lote_id">
                <span class="crecer recortar">{{ l.nombre }} <span class="tenue">· lote {{ l.numero_lote || 's/n' }}</span></span>
                <span class="num" :class="l.dias_restantes < 0 ? 'texto-peligro' : l.dias_restantes <= 30 ? 'texto-alerta' : ''">
                  {{ l.dias_restantes < 0 ? `vencido hace ${-l.dias_restantes} d` : `vence en ${l.dias_restantes} d` }}
                </span>
              </li>
            </ul>
          </section>
        </div>

        <!-- Lo estadístico que importa del mes -->
        <template v-if="resumen">
          <h2 class="titulo-grupo">Servicios de {{ mesActual }}</h2>
          <section class="indicadores mb-bloque">
            <router-link to="/panel" class="indicador">
              <span class="rotulo">Servicios atendidos</span>
              <div class="valor">{{ resumen.resumen.servicios }}</div>
              <div class="pie">{{ cambioMes }}</div>
            </router-link>
            <router-link to="/servicios" class="indicador">
              <span class="rotulo">Sector con más servicios</span>
              <div class="valor valor-texto">{{ resumen.por_sector[0]?.sector || '—' }}</div>
              <div class="pie">{{ resumen.por_sector[0] ? `${resumen.por_sector[0].total} servicios` : '' }}</div>
            </router-link>
            <div class="indicador">
              <span class="rotulo">Tiempo promedio</span>
              <div class="valor">{{ resumen.resumen.minutos_promedio ?? '—' }}</div>
              <div class="pie">minutos por servicio</div>
            </div>
            <router-link to="/revision" class="indicador" :class="{ atencion: impresion.cuentas.por_firmar }">
              <span class="rotulo">Esperan firma</span>
              <div class="valor">{{ impresion.cuentas.por_firmar || 0 }}</div>
              <div class="pie">{{ impresion.cuentas.por_imprimir || 0 }} sin imprimir</div>
            </router-link>
          </section>
          <section v-if="resumen.por_tipo.length" class="tarjeta mb-bloque">
            <div class="tarjeta-cabecera"><h3>Por tipo de servicio</h3><router-link to="/panel" class="btn-enlace">Análisis</router-link></div>
            <div class="tarjeta-cuerpo">
              <BarrasH :items="resumen.por_tipo.map(t => ({ clave: t.tipo_servicio, etiqueta: nombreTipo(t.tipo_servicio), valor: t.total, color: colorTipo(t.tipo_servicio) }))" descripcion="Servicios por tipo este mes" />
            </div>
          </section>
        </template>

        <h2 class="titulo-grupo">Servicios en este momento</h2>
      </template>

      <!-- ══ CIFRAS DEL MOMENTO ═══════════════════════ -->
      <section class="indicadores mb-bloque">
        <div class="indicador" :class="{ atencion: enCurso.length }">
          <span class="rotulo">Unidades fuera</span>
          <div class="valor">{{ enCurso.length }}</div>
          <div class="pie">{{ enCurso.length ? 'en servicio ahora' : 'todas en la estación' }}</div>
        </div>
        <div class="indicador">
          <span class="rotulo">Unidades disponibles</span>
          <div class="valor valor-bien">{{ disponibles.length }}</div>
          <div class="pie">en la estación</div>
        </div>
        <div class="indicador" :class="{ critico: fueraDeServicio.length }">
          <span class="rotulo">Fuera de servicio</span>
          <div class="valor">{{ fueraDeServicio.length }}</div>
          <div class="pie">en taller o reposición</div>
        </div>
        <div class="indicador" :class="{ atencion: porCompletar.length }">
          <span class="rotulo">Boletas por completar</span>
          <div class="valor">{{ porCompletar.length }}</div>
          <div class="pie">{{ auth.esAdministrador ? 'de todos los turnos' : 'de este turno' }}</div>
        </div>
      </section>

      <div class="tablero">
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
                  <span v-if="companeras(s).length" class="nota-fila">Mismo incidente que {{ companeras(s).map(x => x.unidad || 'otra unidad').join(', ') }}</span>
                </div>
                <div class="tiempo-fila" :class="{ aviso: minutosFuera(s) > HORAS_ALERTA * 60 }">
                  <strong>{{ transcurrido(s) }}</strong>
                  <span>{{ minutosFuera(s) > HORAS_ALERTA * 60 ? '¿regreso sin registrar?' : `salió ${hora(s.hora_salida)}` }}</span>
                </div>
                <div v-if="auth.atiendeServicios" class="acciones-fila">
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
              <span class="nota">{{ auth.esAdministrador ? 'Avise a la tripulación; la completa ella' : 'del turno de guardia' }}</span>
            </div>
            <p v-if="!porCompletar.length" class="vacio-linea">{{ auth.esAdministrador ? 'Ninguna boleta pendiente.' : turno ? 'Ninguna boleta pendiente en este turno.' : 'No hay turno abierto.' }}</p>
            <ul v-else class="filas">
              <li v-for="b in porCompletar" :key="b.id" :class="{ resaltada: b.id === recienRegresada }">
                <span class="icono-tipo" :class="`tipo-${b.tipo_servicio}`"><Icono :nombre="b.tipo_servicio" :tam="18" :grosor="2.2" /></span>
                <div class="crecer texto-fila">
                  <strong><span class="control-num">{{ b.numero_control }}</span> · {{ nombreTipo(b.tipo_servicio) }}<template v-if="b.unidad"> · {{ b.unidad }}</template></strong>
                  <span class="suave recortar">{{ b.tripulacion.length ? b.tripulacion.join(', ') : 'Sin tripulación registrada' }}</span>
                  <span class="falta-fila">Falta: {{ textoFaltantes(b.faltantes) }}</span>
                </div>
                <div class="tiempo-fila">
                  <strong>{{ haceCuanto(b.regreso_en) }}</strong>
                  <span>desde que regresó</span>
                </div>
                <div class="acciones-fila">
                  <router-link v-if="auth.atiendeServicios" :to="`/boleta/${b.id}`" class="btn btn-secundario btn-sm">Completar</router-link>
                  <router-link v-else :to="`/historial/${b.id}`" class="btn btn-plano btn-sm">Ver</router-link>
                </div>
              </li>
            </ul>
          </section>
        </div>

        <!-- ══ COLUMNA LATERAL: turno y estado de las unidades ══ -->
        <aside class="tablero-lateral">
          <section class="tarjeta">
            <div class="tarjeta-cabecera">
              <h3>Turno de guardia</h3>
              <button v-if="turno && auth.atiendeServicios" class="btn-enlace" @click="abrirTurno(turno)">Corregir</button>
            </div>
            <div v-if="turno" class="tarjeta-cuerpo">
              <p class="turno-escuadra"><span class="punto" aria-hidden="true"></span><strong>{{ turno.escuadra || 'Turno' }}</strong><span class="tenue">desde {{ horaInicio }}</span></p>
              <dl class="datos-lado">
                <div><dt>Cabina</dt><dd>{{ turno.radiotelefonista }}</dd></div>
                <div><dt>Jefe de servicio</dt><dd>{{ turno.jefe_servicio || '—' }}</dd></div>
                <div><dt>De guardia</dt><dd>{{ plural(guardia.length, 'persona', 'personas') }}</dd></div>
              </dl>
              <details v-if="guardia.length" class="guardia">
                <summary>Ver quiénes están de guardia</summary>
                <ul><li v-for="p in guardia" :key="p.id">{{ p.nombre_completo }}<span v-if="p.es_piloto" class="tenue"> · piloto</span></li></ul>
              </details>
              <button v-if="auth.atiendeServicios" class="btn btn-secundario btn-bloque" @click="abrirTurno()">Entregar turno</button>
            </div>
            <div v-else-if="!cargando" class="tarjeta-cuerpo">
              <p class="sin-turno-texto"><Icono nombre="alerta" :tam="18" />No hay turno abierto</p>
              <button v-if="auth.atiendeServicios" class="btn btn-primario btn-bloque" @click="abrirTurno()">Abrir turno</button>
            </div>
          </section>

          <section class="tarjeta">
            <div class="tarjeta-cabecera"><h3>Unidades disponibles <span class="cuenta cuenta-bien">{{ disponibles.length }}</span></h3></div>
            <p v-if="!disponibles.length" class="vacio-linea">Ninguna unidad en la estación.</p>
            <ul v-else class="filas filas-compactas">
              <li v-for="u in disponibles" :key="u.id">
                <strong class="codigo">{{ u.codigo }}</strong>
                <span class="crecer recortar tenue">{{ u.descripcion || 'Unidad' }}</span>
              </li>
            </ul>
          </section>

          <section class="tarjeta">
            <div class="tarjeta-cabecera"><h3>Fuera de servicio <span class="cuenta" :class="{ 'cuenta-cero': !fueraDeServicio.length }">{{ fueraDeServicio.length }}</span></h3></div>
            <p v-if="!fueraDeServicio.length" class="vacio-linea">Todas las unidades están en servicio.</p>
            <ul v-else class="filas filas-compactas">
              <li v-for="u in fueraDeServicio" :key="u.id">
                <strong class="codigo">{{ u.codigo }}</strong>
                <span class="crecer recortar tenue">{{ u.descripcion || 'Unidad' }}</span>
                <span class="etiqueta et-alerta">{{ nombreEstadoUnidad(u.estado) }}</span>
              </li>
            </ul>
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
      <div class="campo">
        <label for="t-guardia">De guardia</label>
        <MenuDesplegable id="t-guardia" v-model="formTurno.personal" :opciones="personalTurno.map(p => ({ valor: p.nombre_completo, texto: p.nombre_completo, nota: p.escuadra || '' }))"
                         multiple buscar etiqueta="De guardia" placeholder="Elija al personal de guardia…" />
        <span class="ayuda">Solo el personal de guardia se podrá elegir como piloto, tripulación o firma de las boletas de este turno.</span>
      </div>
      <div class="rejilla rejilla-2">
        <div class="campo">
          <label for="t-cab">Cabinista <span class="req">*</span></label>
          <select id="t-cab" v-model="formTurno.radiotelefonista" class="control">
            <option value="">Elija…</option>
            <option v-for="p in deGuardiaForm" :key="p.id" :value="p.nombre_completo">{{ p.nombre_completo }}</option>
          </select>
        </div>
        <div class="campo">
          <label for="t-jefe">Jefe de servicio</label>
          <select id="t-jefe" v-model="formTurno.jefe_servicio" class="control">
            <option value="">Elija…</option>
            <option v-for="p in deGuardiaForm" :key="p.id" :value="p.nombre_completo">{{ p.nombre_completo }}</option>
          </select>
        </div>
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
import { turnos, emergencias, inventario, catalogos as apiCatalogos, reportes, mensajeError } from '../services/api';
import { useAuthStore } from '../stores/auth';
import { useAlertasStore } from '../stores/alertas';
import { useImpresionStore } from '../stores/impresion';
import { useCatalogosStore, nombreTipo, colorTipo } from '../stores/catalogos';
import { useNotificacionesStore } from '../stores/notificaciones';
import { DIAS, MESES, fechaLarga, hoy, hora, plural, variacion } from '../utils/formato';
import { normalizar } from '../utils/sector';
import { personalDeTurno } from '../utils/turno';
import Icono from '../components/Icono.vue';
import Modal from '../components/Modal.vue';
import MenuDesplegable from '../components/MenuDesplegable.vue';
import BarrasH from '../components/graficos/BarrasH.vue';

const auth = useAuthStore();
const alertas = useAlertasStore();
const impresion = useImpresionStore();
const catalogos = useCatalogosStore();
const notif = useNotificacionesStore();

const turno = ref(null);
const enCurso = ref([]);
const porCompletar = ref([]);
const resumen = ref(null);
const insumos = ref([]);
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
const mesActual = MESES[new Date().getMonth()];
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

// ── Unidades: fuera, en la estación y fuera de servicio ──
const fuera = (u) => enCurso.value.some(s => s.unidad_id === u.id);
const disponibles = computed(() => catalogos.unidades.filter(u => (u.estado || 'servicio') === 'servicio' && !fuera(u)));
const fueraDeServicio = computed(() => catalogos.unidades.filter(u => u.estado && u.estado !== 'servicio'));
const nombreEstadoUnidad = (e) => catalogos.dominio?.ESTADOS_UNIDAD?.[e] || e;
// Otras unidades que salieron al mismo incidente
const companeras = (s) => enCurso.value.filter(x => x.id !== s.id && x.incidente_id && x.incidente_id === s.incidente_id);

// ── Inventario (administración) ──
const insumosBien = computed(() => insumos.value.filter(i => i.estado === 'normal').length);
const porReabastecer = computed(() => [...alertas.datos.insumos_agotados, ...alertas.datos.existencia_baja]);
const lotesAlerta = computed(() => [...alertas.datos.lotes_vencidos, ...alertas.datos.lotes_por_vencer]);

const guardia = computed(() => personalDeTurno(catalogos.personal, turno.value));

// Personal para armar el turno: primero la escuadra elegida, luego el resto (voluntarios y apoyos)
const personalTurno = computed(() => [...catalogos.personal]
  .sort((a, b) => (b.escuadra_id === formTurno.escuadra_id) - (a.escuadra_id === formTurno.escuadra_id)
    || a.nombre_completo.localeCompare(b.nombre_completo)));
// Cabinista y jefe se eligen entre quienes quedaron de guardia
const deGuardiaForm = computed(() => personalTurno.value.filter(p => formTurno.personal.includes(p.nombre_completo)
  || p.nombre_completo === formTurno.radiotelefonista || p.nombre_completo === formTurno.jefe_servicio));

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
      const [t, e, p] = await Promise.all([
        turnos.actual(), emergencias.enCurso(),
        emergencias.porCompletar(auth.esAdministrador ? 'todas' : 'turno')
      ]);
      turno.value = t.data;
      enCurso.value = e.data;
      porCompletar.value = p.data;
      if (auth.esAdministrador) {
        const [r, inv] = await Promise.all([reportes.panel(), inventario.listar(), alertas.cargar()]);
        resumen.value = r.data;
        insumos.value = inv.data.insumos;
      }
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
    await cargar();
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
.valor-bien { color: var(--exito) !important; }

.mb-bloque { margin-bottom: 24px; }
.titulo-grupo { font-size: 17px; font-weight: 600; margin: 4px 0 12px; color: var(--texto-suave); }

.rejilla-admin { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }

/* Tablero: columna principal con lo que está pasando, lateral con turno y unidades */
.tablero { display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 24px; align-items: start; }
.tablero-lateral { display: flex; flex-direction: column; gap: 16px; min-width: 0; }

.turno-escuadra { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; font-size: 15.5px; }
.turno-escuadra .tenue { font-size: 13.5px; }
.punto { width: 9px; height: 9px; border-radius: 50%; background: var(--exito-vivo); flex-shrink: 0; }
.datos-lado { margin-bottom: 12px; }
.datos-lado div { display: flex; justify-content: space-between; gap: 12px; padding: 8px 0; border-bottom: 1px solid var(--borde); font-size: 14px; }
.datos-lado div:last-child { border-bottom: none; }
.datos-lado dt { color: var(--texto-tenue); }
.datos-lado dd { text-align: right; font-weight: 500; }
.guardia { margin-bottom: 14px; font-size: 14px; }
.guardia summary { cursor: pointer; color: var(--texto-suave); font-weight: 500; }
.guardia ul { list-style: none; margin-top: 8px; display: flex; flex-direction: column; gap: 4px; }
.sin-turno-texto { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; font-weight: 600; color: var(--alerta); }

.cuenta { min-width: 22px; height: 22px; padding: 0 7px; margin-left: 6px; display: inline-flex; align-items: center; justify-content: center; border-radius: 999px; background: var(--acento); color: #fff; font-size: 12px; font-weight: 600; font-variant-numeric: tabular-nums; vertical-align: 1px; }
.cuenta-bien { background: var(--exito); }
.cuenta-cero { background: var(--superficie-hundida); color: var(--texto-suave); }
.tablero-principal { display: flex; flex-direction: column; gap: 20px; min-width: 0; }
.tarjeta-cabecera .nota { font-size: 13px; color: var(--texto-tenue); }

.filas { list-style: none; }
.filas li { display: flex; align-items: center; gap: 14px; padding: 14px 18px; border-bottom: 1px solid var(--borde); }
.filas li:last-child { border-bottom: none; }
.filas li.resaltada { background: var(--acento-tenue); }
.filas-compactas li { gap: 10px; padding: 10px 16px; font-size: 14px; }
.codigo { font-variant-numeric: tabular-nums; min-width: 52px; }
.texto-fila { min-width: 0; }
.texto-fila strong { display: block; font-size: 15px; font-weight: 600; }
.texto-fila .suave { display: block; font-size: 13.5px; }
.nota-fila { display: block; margin-top: 2px; font-size: 12.5px; color: var(--info); font-weight: 500; }
.recortar { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
.control-num { color: var(--acento-texto); }
.falta-fila { display: block; margin-top: 2px; font-size: 12.5px; color: var(--alerta); }
.tiempo-fila { text-align: right; flex-shrink: 0; }
.tiempo-fila strong { display: block; font-size: 15px; font-weight: 600; white-space: nowrap; }
.tiempo-fila span { display: block; font-size: 12.5px; color: var(--texto-tenue); white-space: nowrap; }
.tiempo-fila.aviso strong, .tiempo-fila.aviso span { color: var(--peligro); }
.acciones-fila { display: flex; gap: 6px; flex-shrink: 0; }
.vacio-linea { padding: 16px 18px; color: var(--texto-suave); font-size: 14.5px; }
.texto-peligro { color: var(--peligro); font-weight: 600; white-space: nowrap; }
.texto-alerta { color: var(--alerta); font-weight: 600; white-space: nowrap; }
.punto-estado { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; background: var(--alerta-vivo, var(--alerta)); }
.punto-estado.agotado { background: var(--peligro); }

.icono-tipo {
  width: 34px; height: 34px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent);
  flex-shrink: 0;
}

@media (max-width: 1100px) {
  .tablero { grid-template-columns: 1fr; }
}
@media (max-width: 760px) {
  .rejilla-admin { grid-template-columns: 1fr; }
}
@media (max-width: 640px) {
  .filas li { flex-wrap: wrap; }
  .acciones-fila { width: 100%; justify-content: flex-end; }
}
</style>
