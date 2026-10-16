<template>
  <div class="animar">
    <div v-if="cargando" class="vacio"><span class="cargador cargador-oscuro" style="display:inline-block"></span></div>

    <template v-else-if="s">
      <div class="titulo-seccion no-imprimir">
        <div>
          <router-link to="/historial" class="volver"><Icono nombre="flecha_izq" :tam="13" />Historial</router-link>
          <h1><span v-if="s.numero_control" class="mono">{{ s.numero_control }}</span><template v-else>Boleta sin número</template></h1>
          <p class="sub">
            <span class="etiqueta" :class="CLASE_ESTADO[s.estado]">{{ catalogos.nombreEstado(s.estado) }}</span>
            <span class="tipo" :class="`tipo-${s.tipo_servicio}`">{{ nombreTipo(s.tipo_servicio) }}</span>
            · {{ fechaLarga(s.fecha) }}<template v-if="s.hora_salida">, salida {{ hora(s.hora_salida) }}</template>
            · registrada por {{ s.registrado_por }}
          </p>
        </div>
        <div class="acciones">
          <button v-if="auth.esAdministrador && s.estado !== 'anulada'" class="btn btn-plano" @click="modalAnular = true">
            <Icono nombre="anular" :tam="15" />Anular
          </button>
          <button v-if="auth.esAdministrador && ['completa', 'firmada'].includes(s.estado)" class="btn btn-plano" @click="abrirCertificar">
            <Icono nombre="boleta" :tam="15" />Copia certificada
          </button>
          <button v-if="editable && auth.atiendeServicios && (s.estado === 'en_curso' || !s.tripulacion.length)" class="btn btn-plano" @click="modalTipo = true">
            <Icono nombre="editar" :tam="15" />Cambiar tipo
          </button>
          <router-link v-if="editable && auth.atiendeServicios" :to="`/boleta/${s.id}`" class="btn btn-secundario">
            <Icono nombre="editar" :tam="15" />{{ s.estado === 'completa' ? 'Corregir' : 'Completar' }}
          </router-link>
          <button v-if="auth.esAdministrador && s.estado === 'completa'" class="btn btn-secundario" :disabled="procesando" @click="firmar">
            <Icono nombre="check" :tam="15" />Marcar como firmada
          </button>
          <button v-if="['completa', 'firmada'].includes(s.estado) && auth.puedeEditar" class="btn btn-primario" @click="imprimir"><Icono nombre="imprimir" :tam="15" />Imprimir boleta</button>
        </div>
      </div>

      <div v-if="s.estado === 'anulada'" class="aviso aviso-peligro mb no-imprimir">
        <Icono nombre="anular" />
        <div>
          <strong>Boleta anulada</strong> el {{ fechaHora(s.anulada_en) }} por {{ s.anulada_por_nombre }}.
          Motivo: {{ s.motivo_anulacion }}. No cuenta en estadísticas ni en el análisis.
        </div>
      </div>

      <div v-if="s.estado === 'en_curso'" class="aviso aviso-info mb no-imprimir">
        <Icono nombre="ambulancia" :tam="20" />
        <div><strong>La unidad todavía no regresa.</strong> La boleta recibirá su número cuando se registre el regreso desde Inicio.</div>
      </div>
      <div v-else-if="s.estado === 'pendiente'" class="aviso aviso-alerta mb no-imprimir">
        <Icono nombre="alerta" :tam="20" />
        <div><strong>Por completar.</strong> Falta: {{ s.faltantes.map(f => f.etiqueta.toLowerCase()).join(', ') }}.
          Solo la tripulación ({{ s.tripulacion.map(p => p.nombre_completo).join(', ') || 'sin registrar' }}) puede completarla con su PIN.</div>
      </div>
      <div v-else-if="s.estado === 'firmada'" class="aviso aviso-exito mb no-imprimir">
        <Icono nombre="check" :tam="20" />
        <div><strong>Firmada</strong>{{ s.firmada_en ? ` el ${fechaHora(s.firmada_en)}` : '' }}{{ s.firmada_por_nombre ? ` · revisada por ${s.firmada_por_nombre}` : '' }}. Ya no se modifica; si tiene un error, se anula con motivo.</div>
      </div>

      <div class="detalle-rejilla">
        <div class="envoltura-boleta">
          <BoletaImpresa :datos="{ ...s, ...s.detalle }" />
        </div>

        <aside class="lateral-detalle no-imprimir">
          <section class="tarjeta">
            <div class="tarjeta-cabecera"><h3>Clasificación</h3></div>
            <dl class="ficha-datos">
              <div><dt>Sector</dt><dd :class="{ falta: !s.sector }">{{ s.sector || 'Sin sector asignado' }}</dd></div>
              <div v-if="s.lugar_critico"><dt>Lugar crítico</dt><dd>{{ s.lugar_critico }}</dd></div>
              <div><dt>Causa</dt><dd :class="{ falta: !s.subtipo }">{{ catalogos.nombreSubtipo(s.tipo_servicio, s.subtipo) }}</dd></div>
              <div><dt>Tripulación</dt><dd>{{ s.tripulacion.map(p => p.nombre_completo).join(', ') || '—' }}</dd></div>
              <div><dt>Unidad</dt><dd class="mono">{{ s.unidad || '—' }}</dd></div>
              <div><dt>Piloto</dt><dd>{{ s.piloto || '—' }}</dd></div>
              <div v-if="s.incidente?.length"><dt>Mismo incidente</dt><dd>
                <template v-for="(o, i) in s.incidente" :key="o.id">{{ i ? ', ' : '' }}<router-link :to="`/historial/${o.id}`">{{ o.numero_control || 'sin número' }}{{ o.unidad ? ` (${o.unidad})` : '' }}</router-link></template>
              </dd></div>
              <div><dt>Tiempo</dt><dd class="mono">{{ minutos(s.minutos_trabajados) }}</dd></div>
            </dl>
          </section>

          <section class="tarjeta">
            <div class="tarjeta-cabecera">
              <h3>Insumos utilizados</h3>
            </div>
            <div v-if="!s.insumos.length" class="vacio vacio-compacto">
              <p>No se registraron insumos en este servicio.</p>
            </div>
            <ul v-else class="lista-consumo">
              <li v-for="i in s.insumos" :key="i.id">
                <div>
                  <span class="celda-principal">{{ i.nombre }}</span>
                  <span class="celda-sec mono">{{ i.numero_lote ? `Lote ${i.numero_lote}` : 'Sin lote' }}{{ i.fecha_vencimiento ? ` · vence ${fecha(i.fecha_vencimiento)}` : '' }}</span>
                </div>
                <span class="mono cant">{{ i.cantidad }} <small>{{ i.unidad_medida }}</small></span>
              </li>
            </ul>
          </section>

          <section v-if="s.certificaciones.length" class="tarjeta">
            <div class="tarjeta-cabecera"><h3>Copias certificadas</h3></div>
            <ul class="lista-consumo">
              <li v-for="c in s.certificaciones" :key="c.id">
                <div><span class="celda-principal">{{ c.solicitante }}</span><span class="celda-sec">{{ c.destino || 'Sin destino indicado' }} · {{ fecha(c.fecha) }} · {{ c.emitida_por }}</span></div>
              </li>
            </ul>
          </section>

          <section class="tarjeta">
            <div class="tarjeta-cabecera"><h3>Historial de la boleta</h3></div>
            <ol class="linea-tiempo">
              <li v-for="(h, i) in s.historial" :key="i">
                <span class="marca-t"></span>
                <div>
                  <strong>{{ ACCIONES[h.accion] || h.accion }}</strong>
                  <span class="celda-sec">{{ h.usuario }} · {{ fechaHora(h.creado_en) }}</span>
                  <p v-if="h.detalle?._por?.nombre" class="celda-sec">por {{ h.detalle._por.nombre }} (tripulación)</p>
                  <ul v-if="['editar', 'completar'].includes(h.accion) && h.detalle" class="cambios">
                    <li v-for="(c, campo) in cambiosDe(h.detalle)" :key="campo">
                      <span class="mono">{{ campo }}</span>: <s>{{ c.antes || '∅' }}</s> → {{ c.despues || '∅' }}
                    </li>
                  </ul>
                  <p v-else-if="h.detalle?.insumo" class="celda-sec">{{ h.detalle.insumo }} × {{ h.detalle.cantidad }}</p>
                  <p v-else-if="h.detalle?.motivo" class="celda-sec">{{ h.detalle.motivo }}</p>
                  <p v-else-if="h.accion === 'cambiar_tipo'" class="celda-sec">{{ nombreTipo(h.detalle.de) }} → {{ nombreTipo(h.detalle.a) }}<template v-if="h.detalle.numero_nuevo"> · {{ h.detalle.numero_anterior }} pasó a {{ h.detalle.numero_nuevo }}</template></p>
                </div>
              </li>
              <li v-if="!s.historial.length">
                <span class="marca-t"></span>
                <div><strong>Registrada</strong><span class="celda-sec">{{ s.registrado_por }} · {{ fechaHora(s.creado_en) }}</span></div>
              </li>
            </ol>
          </section>
        </aside>
      </div>
    </template>

    <CambiarTipo v-if="s" v-model="modalTipo" :boleta="s" @cambiado="cargar" />

    <Modal v-model="modalAnular" titulo="Anular boleta" ancho="460px">
      <p class="suave mb">La boleta <strong class="mono">{{ s?.numero_control }}</strong> se conservará marcada como anulada y dejará de contar en estadísticas.
        <template v-if="s?.insumos.length"> Sus {{ s.insumos.length }} consumo(s) de insumos se devolverán al inventario.</template></p>
      <div class="campo">
        <label for="motivo-a">Motivo de la anulación <span class="req">*</span></label>
        <textarea id="motivo-a" v-model="motivoAnular" class="control" placeholder="Ej.: boleta duplicada del control 2026-0148"></textarea>
      </div>
      <template #acciones>
        <button class="btn btn-secundario" @click="modalAnular = false">Cancelar</button>
        <button class="btn btn-peligro" :disabled="motivoAnular.trim().length < 10 || procesando" @click="anular">Anular boleta</button>
      </template>
    </Modal>

    <Modal v-model="modalCertificar" titulo="Copia certificada" ancho="460px">
      <p class="suave mb">Se registra a quién se entrega y se imprime la boleta con la razón de la Secretaría Ejecutiva.</p>
      <div class="campo"><label for="cert-a">A nombre de <span class="req">*</span></label><input id="cert-a" v-model="cert.solicitante" class="control" /></div>
      <div class="campo"><label for="cert-d">Para qué o para quién</label><input id="cert-d" v-model="cert.destino" class="control" placeholder="Ej.: aseguradora, Ministerio Público, familiar" /></div>
      <div class="campo"><label for="cert-f">Fecha</label><input id="cert-f" v-model="cert.fecha" type="date" class="control mono" /></div>
      <template #acciones>
        <button class="btn btn-secundario" @click="modalCertificar = false">Cancelar</button>
        <button class="btn btn-primario" :disabled="!cert.solicitante.trim() || procesando" @click="certificar">Registrar e imprimir</button>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { emergencias, mensajeError } from '../services/api';
import { useNotificacionesStore } from '../stores/notificaciones';
import { useAuthStore } from '../stores/auth';
import { useAlertasStore } from '../stores/alertas';
import { useImpresionStore } from '../stores/impresion';
import { useCatalogosStore, nombreTipo, TIPOS } from '../stores/catalogos';
import { fecha, fechaLarga, fechaHora, hora, minutos, quetzales, hoy } from '../utils/formato';
import Modal from '../components/Modal.vue';
import Icono from '../components/Icono.vue';
import BoletaImpresa from '../components/BoletaImpresa.vue';
import CambiarTipo from '../components/boleta/CambiarTipo.vue';

const ruta = useRoute();
const notif = useNotificacionesStore();
const auth = useAuthStore();
const alertas = useAlertasStore();
const impresion = useImpresionStore();
const catalogos = useCatalogosStore();

const ACCIONES = {
  crear: 'Llamada registrada', regreso: 'Regreso de la unidad (número asignado)', editar: 'Editada', completar: 'Completada',
  firmar: 'Firmada', certificar: 'Copia certificada', anular: 'Anulada', cerrar: 'Servicio cerrado', cambiar_tipo: 'Cambio de tipo de servicio',
  agregar_insumo: 'Insumo agregado', quitar_insumo: 'Insumo retirado'
};
const CLASE_ESTADO = { en_curso: 'et-info', pendiente: 'et-alerta', completa: 'et-neutra', firmada: 'et-exito', anulada: 'et-peligro' };
const cambiosDe = (detalle) => Object.fromEntries(Object.entries(detalle).filter(([k, v]) => k !== '_por' && v && typeof v === 'object' && 'antes' in v));

const s = ref(null);
const cargando = ref(true);
const procesando = ref(false);
const modalAnular = ref(false);
const modalTipo = ref(false);
const motivoAnular = ref('');
const modalCertificar = ref(false);
const cert = reactive({ solicitante: '', destino: '', fecha: hoy() });
const editable = computed(() => ['en_curso', 'pendiente', 'completa'].includes(s.value?.estado));

const d = computed(() => s.value?.detalle || {});
const tituloBoleta = computed(() => TIPOS.find(t => t.valor === s.value?.tipo_servicio)?.titulo || '');
const llevaCertificacion = computed(() => ['ambulancia', 'rescate', 'varios'].includes(s.value?.tipo_servicio));
const fechaCertificacion = computed(() => s.value?.fecha_certificacion ? fechaLarga(s.value.fecha_certificacion) : '_____ de ___________________ de 20____');

const v = (x) => (x === null || x === undefined || x === '') ? '—' : x;
const q = (x) => quetzales(x);
const formatoFecha = fechaLarga;

// Imprime en el formato oficial y la marca como impresa
const imprimir = async () => {
  try {
    await impresion.imprimir(s.value.id);
    await cargar();
  } catch (e) {
    notif.error(mensajeError(e, 'No se pudo preparar la impresión'));
  }
};

const cargar = async () => {
  try {
    const { data } = await emergencias.obtener(ruta.params.id);
    s.value = data;
  } catch (e) {
    notif.error(mensajeError(e, 'No se pudo cargar la boleta'));
  } finally {
    cargando.value = false;
  }
};

const anular = async () => {
  procesando.value = true;
  try {
    const { data } = await emergencias.anular(s.value.id, motivoAnular.value.trim());
    notif.exito(data.mensaje);
    modalAnular.value = false;
    alertas.cargar();
    await cargar();
  } catch (e) {
    notif.error(mensajeError(e));
  } finally {
    procesando.value = false;
  }
};

const firmar = async () => {
  procesando.value = true;
  try {
    const { data } = await emergencias.firmar([s.value.id]);
    notif.exito(data.mensaje);
    impresion.contarPendientes();
    await cargar();
  } catch (e) {
    notif.error(mensajeError(e));
  } finally {
    procesando.value = false;
  }
};

const abrirCertificar = () => {
  Object.assign(cert, { solicitante: '', destino: '', fecha: hoy() });
  modalCertificar.value = true;
};
const certificar = async () => {
  procesando.value = true;
  try {
    await emergencias.certificar(s.value.id, { ...cert });
    modalCertificar.value = false;
    await cargar();
    await impresion.imprimir(s.value.id);
  } catch (e) {
    notif.error(mensajeError(e, 'No se pudo registrar la copia certificada'));
  } finally {
    procesando.value = false;
  }
};

onMounted(() => {
  catalogos.cargar().catch(() => {});
  cargar();
});
</script>

<style scoped>
.estado-carga {
  display: flex; flex-direction: column; align-items: center; gap: 13px; padding: 56px;
}
.estado-carga p { color: var(--texto-suave); font-size: 13.5px; }

/* ── HOJA OFICIO 21.6 × 33 cm ──────────────────── */
.vista-boleta {
  width: 21.6cm;
  height: 33cm;
  margin: 0 auto;
  padding: 1.5cm;
  box-sizing: border-box;
  overflow: hidden;
}
.vista-boleta .tarjeta-cuerpo {
  padding: 0; height: 100%;
  display: flex; flex-direction: column;
}

.boleta-encabezado {
  display: flex; align-items: center; gap: 15px;
  padding-bottom: 9px;
  border-bottom: 2px solid var(--texto);
  flex: 0 0 auto;
}
.boleta-encabezado img { width: 62px; height: 62px; object-fit: contain; }
.boleta-encabezado h2 { font-size: 12px; font-weight: 700; line-height: 1.3; }
.boleta-encabezado h3 {
  font-size: 11.5px; font-weight: 600; margin-top: 3px;
  color: var(--rojo-bomberos);
}

.seccion {
  padding-bottom: 4px; margin: 0 0 7px;
  border-bottom: 1.2px solid var(--borde-fuerte);
  font-size: 9.5px; font-weight: 700;
  text-transform: uppercase; letter-spacing: .06em;
  color: var(--texto-suave);
  flex: 0 0 auto;
}

.grupo {
  display: grid; grid-template-columns: repeat(4, 1fr);
  gap: 4px 18px;
  flex: 1 1 auto; align-content: space-evenly;
  min-height: 0;
}
.linea {
  display: flex; flex-direction: column; gap: 2px;
  padding-bottom: 3px;
  border-bottom: 1px dotted var(--borde-fuerte);
}
.linea.ancha { grid-column: span 4; }
.linea span { font-size: 7.6px; color: var(--texto-tenue); line-height: 1.25; }
.linea b { font-size: 10.5px; font-weight: 500; color: var(--texto); line-height: 1.35; }

.observaciones {
  flex: 1.6 1 auto; min-height: 50px;
  padding: 8px 10px;
  background: var(--superficie-alt);
  border: 1px solid var(--borde);
  border-radius: var(--radio-sm);
  font-size: 10.5px; white-space: pre-wrap;
}

.firmas {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px;
  padding-top: 22px;
  flex: 0 0 auto;
}
.firmas-dos { grid-template-columns: repeat(2, 1fr); }
.firmas > div { text-align: center; }
.firma-valor { font-size: 10.5px; min-height: 15px; margin-bottom: 4px; color: var(--texto); }
.raya { border-top: 1px solid var(--texto); margin-bottom: 4px; }
.firmas span { font-size: 9.5px; color: var(--texto-suave); }

.certificacion { margin-top: 18px; flex: 0 0 auto; }
.razon {
  font-size: 9.5px; line-height: 1.55; text-align: justify;
  color: var(--texto-suave);
}
.razon strong { color: var(--texto); }
.lugar-fecha { margin-top: 12px; font-size: 10.5px; text-align: center; }
.firma-secretaria { width: 215px; margin: 18px auto 0; text-align: center; }

.registrado { display: none; }

/* ── IMPRESIÓN ─────────────────────────────────── */
@media print {
  .vista-boleta {
    width: 18.6cm;
    height: 30cm;
    padding: 0; margin: 0;
    border: none; box-shadow: none;
    background: #fff;
    overflow: hidden;
    break-inside: avoid;
    box-sizing: border-box;
  }
  .vista-boleta .tarjeta-cuerpo {
    height: 30cm;
    display: flex; flex-direction: column;
  }

  .boleta-encabezado { flex: 0 0 auto; border-bottom-color: #000; }
  .boleta-encabezado h3 { color: #000; }

  .seccion {
    flex: 0 0 auto; margin: 0 0 6px;
    color: #000; border-bottom-color: #555;
  }

  .grupo { flex: 1 1 auto; align-content: space-evenly; }
  .linea { border-bottom-color: #999; }
  .linea span { color: #555; }
  .linea b { color: #000; }

  .observaciones {
    flex: 2 1 auto;
    background: none; border-color: #888; color: #000;
  }

  .firmas { flex: 0 0 auto; padding-top: 18px; }
  .certificacion { flex: 0 0 auto; margin-top: 14px; }

  .raya { border-top-color: #000; }
  .firmas span, .firma-valor, .lugar-fecha, .razon, .razon strong { color: #000; }

}

@media (max-width: 900px) {
  .vista-boleta { width: 100%; height: auto; padding: 20px; overflow: visible; }
  .grupo { flex: none; align-content: start; gap: 12px 16px; }
  .observaciones { flex: none; min-height: 80px; }
}

/* ── Composición de la vista ───────────────────── */
.volver {
  display: inline-flex; align-items: center; gap: 5px; margin-bottom: 6px;
  font-size: 12px; font-weight: 600; color: var(--texto-tenue); text-decoration: none;
}
.volver:hover { color: var(--texto); }
.titulo-seccion h1 .mono { font-weight: 600; letter-spacing: -.02em; }
.titulo-seccion .sub .tipo { vertical-align: -1px; }

.detalle-rejilla {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 16px; align-items: start;
}
.envoltura-boleta { min-width: 0; overflow-x: auto; }
.lateral-detalle { display: flex; flex-direction: column; gap: 14px; position: sticky; top: 72px; }

.ficha-datos { padding: 6px 16px 10px; }
.ficha-datos div { display: grid; grid-template-columns: 82px 1fr; gap: 10px; padding: 7px 0; border-bottom: 1px solid var(--borde); font-size: 13px; }
.ficha-datos div:last-child { border-bottom: none; }
.ficha-datos dt { color: var(--texto-tenue); font-size: 12px; }
.ficha-datos dd { font-weight: 600; }
.ficha-datos dd.falta { color: var(--alerta); }

.vacio-compacto { padding: 18px 16px; }
.lista-consumo { list-style: none; }
.lista-consumo li { display: grid; grid-template-columns: 1fr auto 28px; gap: 8px; align-items: center; padding: 9px 12px 9px 16px; border-bottom: 1px solid var(--borde); font-size: 13px; }
.lista-consumo li:last-child { border-bottom: none; }
.cant { font-size: 13px; font-weight: 600; white-space: nowrap; }
.cant small { font-weight: 400; color: var(--texto-tenue); font-size: 11px; }

.linea-tiempo { list-style: none; padding: 12px 16px 6px; }
.linea-tiempo > li { position: relative; display: grid; grid-template-columns: 14px 1fr; gap: 10px; padding-bottom: 14px; font-size: 13px; }
.linea-tiempo > li:not(:last-child)::before { content: ''; position: absolute; left: 4px; top: 14px; bottom: 0; width: 1px; background: var(--borde-fuerte); }
.marca-t { width: 9px; height: 9px; margin-top: 4px; border: 2px solid var(--texto-suave); border-radius: 2px; background: var(--superficie); }
.cambios { list-style: none; margin-top: 5px; font-size: 11.5px; color: var(--texto-suave); display: flex; flex-direction: column; gap: 2px; }
.cambios .mono { font-size: 10.5px; color: var(--texto-tenue); }
.cambios s { color: var(--texto-tenue); }

@media (max-width: 1400px) {
  .detalle-rejilla { grid-template-columns: 1fr; }
  .lateral-detalle { position: static; display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); width: min(21.6cm, 100%); margin: 0 auto; }
}
@media print {
  .detalle-rejilla { display: block; }
}
</style>
