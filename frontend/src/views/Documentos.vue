<template>
  <div class="animar">
    <div class="titulo-seccion no-imprimir">
      <div>
        <h1>Documentos de bodega</h1>
      </div>
      <div v-if="auth.esAdministrador" class="acciones">
        <button class="btn btn-plano" @click="abrir('baja')">Baja</button>
        <button class="btn btn-plano" @click="abrir('ajuste')">Ajuste</button>
        <button class="btn btn-secundario" @click="abrir('vale')"><Icono nombre="salida" :tam="15" />Vale de entrega</button>
        <button class="btn btn-primario" @click="abrir('entrada')"><Icono nombre="entrada" :tam="15" />Entrada</button>
      </div>
    </div>

    <div class="barra-filtros no-imprimir">
      <div class="busqueda">
        <Icono nombre="buscar" :tam="15" />
        <input v-model="texto" class="control" type="search" placeholder="Número, constancia, persona o insumo" aria-label="Buscar" />
      </div>
      <div class="segmentos" role="group" aria-label="Tipo de documento">
        <button :class="{ activo: !tipo }" @click="tipo = ''">Todos</button>
        <button v-for="(d, k) in catalogos.dominio?.DOCUMENTOS" :key="k" :class="{ activo: tipo === k }" @click="tipo = k">{{ d.nombre }}</button>
      </div>
    </div>

    <div class="tabla-contenedor no-imprimir">
      <table>
        <thead><tr><th>Número</th><th>Fecha</th><th>Documento</th><th>Detalle</th><th class="num">Insumos</th><th>Registró</th></tr></thead>
        <tbody>
          <template v-if="cargando && !documentos.length">
            <tr v-for="i in 6" :key="i"><td colspan="6"><div class="esqueleto" style="height:14px"></div></td></tr>
          </template>
          <tr v-for="d in paginados" :key="d.id" class="fila-clic" @click="ver(d)" tabindex="0" @keydown.enter="ver(d)">
            <td class="mono celda-principal">{{ d.numero }}</td>
            <td class="mono">{{ fecha(d.fecha) }}</td>
            <td><span class="etiqueta" :class="CLASE[d.tipo]">{{ catalogos.dominio?.DOCUMENTOS?.[d.tipo]?.nombre }}</span></td>
            <td>{{ detalle(d) }}<span class="celda-sec">{{ d.constancia || d.observaciones || '' }}</span></td>
            <td class="num">{{ d.insumos }}<span class="celda-sec">{{ d.unidades }} unidades</span></td>
            <td class="suave">{{ d.registrado_por }}</td>
          </tr>
        </tbody>
      </table>
      <div v-if="!cargando && !documentos.length" class="vacio">
        <Icono nombre="movimientos" :tam="28" />
        <strong>{{ texto || tipo ? 'Ningún documento coincide' : 'Aún no hay documentos' }}</strong>
        <p v-if="!texto && !tipo">Empiece por registrar el inventario inicial como una entrada, con lo que hay hoy en bodega.</p>
      </div>
      <Paginador v-model:pagina="pagina" :total="documentos.length" :tamano="POR_PAGINA" />
    </div>

    <!-- ══ DETALLE ═══════════════════════════════════ -->
    <Modal v-model="modalVer" :titulo="doc ? `${catalogos.dominio?.DOCUMENTOS?.[doc.tipo]?.nombre} ${doc.numero}` : ''" ancho="760px">
      <template v-if="doc">
        <dl class="ficha">
          <div><dt>Fecha</dt><dd>{{ fechaLarga(doc.fecha) }}</dd></div>
          <div v-if="doc.origen"><dt>Origen</dt><dd>{{ catalogos.dominio?.ORIGENES_ENTRADA?.[doc.origen] }}{{ doc.donante ? ` · ${doc.donante}` : '' }}</dd></div>
          <div v-if="doc.constancia"><dt>Constancia</dt><dd>{{ doc.constancia }}</dd></div>
          <div v-if="doc.escuadra"><dt>Escuadra</dt><dd>{{ doc.escuadra }}</dd></div>
          <div v-if="doc.recibe"><dt>Recibió</dt><dd>{{ doc.recibe }}</dd></div>
          <div v-if="doc.entrega"><dt>Entregó</dt><dd>{{ doc.entrega }}</dd></div>
          <div v-if="doc.observaciones"><dt>Observaciones</dt><dd>{{ doc.observaciones }}</dd></div>
        </dl>
        <table class="lineas-doc">
          <thead><tr><th>Insumo</th><th class="num">Cantidad</th><th>Lote</th><th>Vence</th></tr></thead>
          <tbody>
            <tr v-for="l in doc.lineas" :key="l.id">
              <td><router-link :to="`/inventario/${l.insumo_id}`" class="enlace-limpio">{{ l.nombre }}</router-link></td>
              <td class="num">{{ l.tipo_movimiento === 'entrada' ? '+' : '−' }}{{ l.cantidad }} <span class="tenue">{{ l.unidad_medida }}</span></td>
              <td class="mono">{{ l.numero_lote || '—' }}</td>
              <td class="mono">{{ l.fecha_vencimiento ? fecha(l.fecha_vencimiento) : '—' }}</td>
            </tr>
          </tbody>
        </table>
      </template>
      <template #acciones>
        <button class="btn btn-secundario" @click="modalVer = false">Cerrar</button>
        <button v-if="doc?.tipo === 'vale'" class="btn btn-primario" @click="imprimirVale"><Icono nombre="imprimir" :tam="15" />Imprimir vale</button>
      </template>
    </Modal>

    <div v-if="doc?.tipo === 'vale'" class="solo-impresion"><ValeImpreso :doc="doc" /></div>

    <DocumentoModal v-model="modalNuevo" :tipo="tipoNuevo" @guardado="alGuardar" />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { inventario, mensajeError } from '../services/api';
import { useAuthStore } from '../stores/auth';
import { useAlertasStore } from '../stores/alertas';
import { useCatalogosStore } from '../stores/catalogos';
import { useNotificacionesStore } from '../stores/notificaciones';
import { fecha, fechaLarga } from '../utils/formato';
import Icono from '../components/Icono.vue';
import Modal from '../components/Modal.vue';
import Paginador from '../components/Paginador.vue';
import DocumentoModal from '../components/inventario/DocumentoModal.vue';
import ValeImpreso from '../components/inventario/ValeImpreso.vue';

const auth = useAuthStore();
const alertas = useAlertasStore();
const catalogos = useCatalogosStore();
const notif = useNotificacionesStore();

const CLASE = { entrada: 'et-exito', vale: 'et-info', baja: 'et-peligro', ajuste: 'et-neutra' };

const documentos = ref([]);
const cargando = ref(true);
const texto = ref('');
const tipo = ref('');
const POR_PAGINA = 25;
const pagina = ref(1);
const paginados = computed(() => documentos.value.slice((pagina.value - 1) * POR_PAGINA, pagina.value * POR_PAGINA));
watch([texto, tipo], () => { pagina.value = 1; });
const doc = ref(null);
const modalVer = ref(false);
const modalNuevo = ref(false);
const tipoNuevo = ref('entrada');

const detalle = (d) => ({
  entrada: `${catalogos.dominio?.ORIGENES_ENTRADA?.[d.origen] || ''}${d.donante ? ` · ${d.donante}` : ''}`,
  vale: `${catalogos.nombreCategoria(d.categoria)} · ${d.escuadra || ''} · recibió ${d.recibe || '—'}`,
  baja: d.observaciones || 'Baja',
  ajuste: 'Ajuste por conteo'
})[d.tipo];

const cargar = async () => {
  cargando.value = true;
  try {
    const { data } = await inventario.documentos({ tipo: tipo.value || undefined, texto: texto.value || undefined });
    documentos.value = data;
  } catch (e) {
    notif.error(mensajeError(e, 'No se pudieron cargar los documentos'));
  } finally {
    cargando.value = false;
  }
};

const ver = async (d) => {
  try {
    const { data } = await inventario.documento(d.id);
    doc.value = data;
    modalVer.value = true;
  } catch (e) {
    notif.error(mensajeError(e));
  }
};

const abrir = (t) => { tipoNuevo.value = t; modalNuevo.value = true; };
const alGuardar = async (r) => {
  alertas.cargar();
  await cargar();
  if (tipoNuevo.value === 'vale') {
    await ver({ id: r.id });
  }
};
const imprimirVale = () => setTimeout(() => window.print(), 50);

let espera = null;
watch(texto, () => { clearTimeout(espera); espera = setTimeout(cargar, 300); });
watch(tipo, cargar);
onMounted(() => { catalogos.cargar().catch(() => {}); cargar(); });
</script>

<style scoped>
td.mono { white-space: nowrap; }
.ficha { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px 20px; margin-bottom: 16px; }
.ficha dt { font-size: 12.5px; font-weight: 600; color: var(--texto-tenue); }
.ficha dd { font-size: 15px; }
.lineas-doc td, .lineas-doc th { height: auto; padding: 8px 12px; }
.enlace-limpio { color: var(--texto); text-decoration: none; font-weight: 600; }
.enlace-limpio:hover { text-decoration: underline; }
@media print {
  .solo-impresion { display: block !important; }
}
</style>
