<template>
  <div class="animar">
    <div class="titulo-seccion">
      <div>
        <h1>Existencias</h1>
      </div>
      <div class="acciones">
        <button v-if="auth.esAdministrador" class="btn btn-plano" @click="abrirInsumo()"><Icono nombre="mas" :tam="15" />Insumo</button>
        <template v-if="auth.esAdministrador">
          <button class="btn btn-secundario" @click="abrirDocumento('vale')"><Icono nombre="salida" :tam="15" />Vale de entrega</button>
          <button class="btn btn-primario" @click="abrirDocumento('entrada')"><Icono nombre="entrada" :tam="15" />Entrada</button>
        </template>
      </div>
    </div>

    <section class="indicadores mb" aria-label="Estado del inventario">
      <button v-for="r in resumen" :key="r.clave" class="indicador indicador-filtro"
              :class="[r.clase, { elegido: r.filtro && estado === r.filtro }]"
              @click="r.to ? $router.push(r.to) : (estado = estado === r.filtro ? '' : r.filtro)">
        <span class="rotulo">{{ r.nombre }}</span>
        <div class="valor">{{ r.valor }}</div>
        <div class="pie">{{ r.pie }}</div>
      </button>
    </section>

    <div class="barra-filtros">
      <div class="busqueda">
        <Icono nombre="buscar" :tam="15" />
        <input v-model="busqueda" class="control" type="search" placeholder="Buscar insumo" aria-label="Buscar insumo" />
      </div>
      <div class="segmentos" role="group" aria-label="Categoría">
        <button :class="{ activo: !categoria }" @click="categoria = ''">Todas <span class="cuenta">{{ todos.length }}</span></button>
        <button v-for="c in catalogos.categorias" :key="c.valor" :class="{ activo: categoria === c.valor }" @click="categoria = c.valor">
          {{ c.nombre }} <span class="cuenta">{{ todos.filter(i => i.categoria === c.valor).length }}</span>
        </button>
      </div>
      <button v-if="estado" class="btn btn-plano btn-sm" @click="estado = ''"><Icono nombre="cerrar" :tam="14" />Quitar filtro «{{ textoEstado(estado) }}»</button>
    </div>

    <div class="tabla-contenedor">
      <table>
        <thead>
          <tr>
            <th>Insumo</th>
            <th v-if="!categoria">Categoría</th>
            <th class="num">Existencia</th>
            <th class="num">Mínimo</th>
            <th>Próx. vencimiento</th>
            <th class="num" title="Consumo real (servicios y uso interno) en los últimos 90 días">Consumo 90 d</th>
            <th>Estado</th>
            <th v-if="auth.esAdministrador" style="width:40px"></th>
          </tr>
        </thead>
        <tbody>
          <template v-if="cargando && !todos.length">
            <tr v-for="i in 8" :key="i"><td :colspan="8"><div class="esqueleto" style="height:14px"></div></td></tr>
          </template>
          <tr v-for="i in paginados" :key="i.id" class="fila-clic" tabindex="0"
              @click="$router.push(`/inventario/${i.id}`)" @keydown.enter="$router.push(`/inventario/${i.id}`)">
            <td>
              <span class="celda-principal">{{ i.nombre }}</span>
              <span class="celda-sec">{{ i.clase === 'equipo' ? 'Equipo · ' : '' }}{{ i.unidad_medida || 'unidad' }}{{ i.presentacion && i.factor_presentacion > 1 ? ` · ${i.presentacion} de ${i.factor_presentacion}` : '' }}{{ i.lotes_vigentes ? ` · ${plural(i.lotes_vigentes, 'lote', 'lotes')}` : '' }}</span>
            </td>
            <td v-if="!categoria" class="suave">{{ catalogos.nombreCategoria(i.categoria) }}</td>
            <td class="num"><strong>{{ i.stock_actual }}</strong></td>
            <td class="num tenue">{{ i.stock_minimo }}</td>
            <td class="mono venc" :class="claseVenc(i)">
              <template v-if="i.proximo_vencimiento">{{ fecha(i.proximo_vencimiento) }}<span class="celda-sec">{{ textoDias(i.proximo_vencimiento) }}</span></template>
              <span v-else class="tenue">—</span>
            </td>
            <td class="num">{{ i.consumo_90 || '—' }}</td>
            <td>
              <span v-if="i.estado !== 'normal'" class="etiqueta" :class="claseEstado(i.estado)">{{ textoEstado(i.estado) }}</span>
              <span v-if="i.cantidad_vencida" class="etiqueta et-peligro" style="margin-left:4px" :title="`${i.cantidad_vencida} en lotes vencidos`">{{ i.cantidad_vencida }} vencidos</span>
            </td>
            <td v-if="auth.esAdministrador" @click.stop>
              <button class="btn btn-plano btn-sm btn-icono" @click="abrirInsumo(i)" :aria-label="`Editar ${i.nombre}`"><Icono nombre="editar" :tam="14" /></button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="!cargando && !filtrados.length" class="vacio">
        <Icono nombre="caja" :tam="28" />
        <strong>Ningún insumo coincide</strong>
      </div>
      <Paginador v-model:pagina="pagina" :total="filtrados.length" :tamano="POR_PAGINA" class="no-imprimir" />
    </div>

    <DocumentoModal v-model="modalMov" :tipo="tipoMov" @guardado="cargar" />

    <AsistenteModal v-model="modalInsumo" :titulo="insumo.id ? 'Editar insumo' : 'Nuevo insumo'" :pasos="pasosInsumo"
                    :guardando="procesando" texto-final="Guardar insumo" @finalizar="guardarInsumo">
      <template #paso-0>
        <input v-model="insumo.nombre" class="control" placeholder="Ej.: Venda elástica 4 pulgadas" aria-label="Nombre del insumo" autofocus />
        <button v-if="insumo.id" type="button" class="btn btn-plano btn-sm mt" style="color:var(--peligro)" @click="retirarInsumo">Retirar este insumo del catálogo</button>
      </template>
      <template #paso-1>
        <div class="opciones" style="--min-opcion: 220px">
          <button v-for="c in catalogos.categorias" :key="c.valor" type="button" class="opcion"
                  :class="{ elegida: insumo.categoria === c.valor }" @click="insumo.categoria = c.valor">{{ c.nombre }}</button>
        </div>
      </template>
      <template #paso-2>
        <span class="rotulo-campo-i">Unidad de medida</span>
        <input v-model="insumo.unidad_medida" class="control mb" placeholder="Elija o escriba…" aria-label="Unidad de medida" list="dl-unidades-medida" />
        <datalist id="dl-unidades-medida"><option v-for="u in UNIDADES" :key="u" :value="u" /></datalist>
        <span class="rotulo-campo-i">Existencia mínima</span>
        <Contador v-model="insumo.stock_minimo" :min="0" :unidad="insumo.unidad_medida || 'unidades'" etiqueta="Existencia mínima" />
        <p class="tenue mt">Cuando la existencia baje a este número, el sistema avisará que hay que reponer.</p>
      </template>
      <template #paso-3>
        <span class="rotulo-campo-i">Clase</span>
        <div class="opciones mb" style="--min-opcion: 200px">
          <button v-for="(n, v) in catalogos.dominio?.CLASES_INSUMO" :key="v" type="button" class="opcion"
                  :class="{ elegida: insumo.clase === v }" @click="insumo.clase = v">
            <span>{{ n }}<small>{{ AYUDA_CLASE[v] }}</small></span>
          </button>
        </div>
        <span class="rotulo-campo-i">Presentación de compra <span class="tenue">opcional</span></span>
        <div class="fila">
          <input v-model="insumo.presentacion" class="control" placeholder="caja, paquete…" aria-label="Presentación" style="max-width:200px" />
          <span class="tenue">de</span>
          <input v-model.number="insumo.factor_presentacion" type="number" min="1" class="control num" style="max-width:100px" aria-label="Unidades por presentación" />
          <span class="tenue">{{ insumo.unidad_medida || 'unidades' }}</span>
        </div>
        <p class="tenue mt">Si llega en cajas de 50 y se usa por unidad, al registrar una entrada podrá escribir «3 cajas» y se guardarán 150.</p>
      </template>
    </AsistenteModal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { inventario, mensajeError } from '../services/api';
import { useAuthStore } from '../stores/auth';
import { useAlertasStore } from '../stores/alertas';
import { useCatalogosStore } from '../stores/catalogos';
import { useNotificacionesStore } from '../stores/notificaciones';
import { fecha, plural, hoy } from '../utils/formato';
import AsistenteModal from '../components/AsistenteModal.vue';
import Contador from '../components/Contador.vue';
import Paginador from '../components/Paginador.vue';
import DocumentoModal from '../components/inventario/DocumentoModal.vue';
import Icono from '../components/Icono.vue';

const ruta = useRoute();
const router = useRouter();
const auth = useAuthStore();
const alertas = useAlertasStore();
const catalogos = useCatalogosStore();
const notif = useNotificacionesStore();

const todos = ref([]);
const cargando = ref(true);
const procesando = ref(false);
const busqueda = ref('');
const categoria = ref(ruta.query.categoria || '');
const estado = ref(ruta.query.estado || '');

const modalMov = ref(false);
const tipoMov = ref('entrada');
const modalInsumo = ref(false);
const insumo = reactive({ id: null, nombre: '', categoria: '', unidad_medida: '', stock_minimo: 5, clase: 'consumible', presentacion: '', factor_presentacion: 1 });
const AYUDA_CLASE = {
  consumible_vence: 'Pide lote y vencimiento al entrar',
  consumible: 'Se gasta, pero no vence',
  equipo: 'No se consume; no lleva lote'
};

const UNIDADES = ['unidad', 'caja', 'paquete', 'bolsa', 'bote', 'frasco', 'galón', 'rollo', 'resma'];
const pasosInsumo = computed(() => [
  { pregunta: '¿Cómo se llama el insumo?', obligatorio: true, valido: !!insumo.nombre.trim(), falta: 'Escriba el nombre' },
  { pregunta: '¿De qué categoría es?', obligatorio: true, valido: !!insumo.categoria, falta: 'Elija una categoría' },
  { pregunta: '¿Cómo se mide?' },
  { pregunta: '¿Qué clase de insumo es?', obligatorio: true, valido: !!insumo.clase && insumo.factor_presentacion >= 1, falta: 'Elija la clase' }
]);

const filtrados = computed(() => {
  const t = busqueda.value.trim().toLowerCase();
  return todos.value.filter(i =>
    (!categoria.value || i.categoria === categoria.value)
    && (!estado.value || i.estado === estado.value)
    && (!t || i.nombre.toLowerCase().includes(t)))
    .sort((a, b) => prioridad(a) - prioridad(b) || a.nombre.localeCompare(b.nombre));
});
// De 25 en 25: primero lo que necesita atención (agotado, vencido, bajo)
const POR_PAGINA = 25;
const pagina = ref(1);
const paginados = computed(() => filtrados.value.slice((pagina.value - 1) * POR_PAGINA, pagina.value * POR_PAGINA));
watch([busqueda, categoria, estado], () => { pagina.value = 1; });
const prioridad = (i) => (i.estado === 'agotado' ? 0 : i.cantidad_vencida ? 1 : i.estado === 'bajo' ? 2 : 3);

const resumen = computed(() => {
  const a = alertas.datos.resumen;
  return [
    { clave: 'total', nombre: 'Insumos activos', valor: todos.value.length, pie: `${todos.value.filter(i => i.estado === 'normal').length} con existencia normal`, filtro: 'normal' },
    { clave: 'agotados', nombre: 'Agotados', valor: a.agotados, pie: 'sin existencia', filtro: 'agotado', clase: a.agotados ? 'critico' : '' },
    { clave: 'bajos', nombre: 'Bajo el mínimo', valor: a.bajos, pie: 'requieren reposición', filtro: 'bajo', clase: a.bajos ? 'atencion' : '' },
    { clave: 'vencidos', nombre: 'Lotes vencidos', valor: a.vencidos, pie: 'con saldo por dar de baja', to: '/lotes?estado=vencidos', clase: a.vencidos ? 'critico' : '' },
    { clave: 'por_vencer', nombre: 'Por vencer', valor: a.por_vencer, pie: 'lotes en los próximos 90 días', to: '/lotes?estado=por_vencer', clase: a.por_vencer ? 'atencion' : '' }
  ];
});

const claseEstado = (e) => (e === 'agotado' ? 'et-peligro' : e === 'bajo' ? 'et-alerta' : 'et-exito');
const textoEstado = (e) => (e === 'agotado' ? 'Agotado' : e === 'bajo' ? 'Bajo el mínimo' : 'Normal');


const dias = (iso) => Math.round((new Date(iso + 'T00:00:00') - new Date(hoy() + 'T00:00:00')) / 86400000);
const textoDias = (iso) => {
  const d = dias(iso);
  return d < 0 ? `vencido hace ${-d} d` : d === 0 ? 'vence hoy' : `en ${d} d`;
};
const claseVenc = (i) => {
  if (!i.proximo_vencimiento) return '';
  const d = dias(i.proximo_vencimiento);
  return d < 0 ? 'vencido' : d <= 30 ? 'critico' : d <= 90 ? 'proximo' : '';
};

const cargar = async () => {
  cargando.value = true;
  try {
    const { data } = await inventario.listar();
    todos.value = data.insumos;
    alertas.cargar();
  } catch (e) {
    notif.error(mensajeError(e, 'No se pudo cargar el inventario'));
  } finally {
    cargando.value = false;
  }
};

const abrirDocumento = (tipo) => {
  tipoMov.value = tipo;
  modalMov.value = true;
};

const abrirInsumo = (i = null) => {
  Object.assign(insumo, i
    ? { id: i.id, nombre: i.nombre, categoria: i.categoria, unidad_medida: i.unidad_medida || '', stock_minimo: i.stock_minimo,
        clase: i.clase || 'consumible', presentacion: i.presentacion || '', factor_presentacion: i.factor_presentacion || 1 }
    : { id: null, nombre: '', categoria: categoria.value || '', unidad_medida: '', stock_minimo: 5, clase: 'consumible', presentacion: '', factor_presentacion: 1 });
  modalInsumo.value = true;
};

const guardarInsumo = async () => {
  procesando.value = true;
  try {
    const carga = { nombre: insumo.nombre, categoria: insumo.categoria, unidad_medida: insumo.unidad_medida, stock_minimo: insumo.stock_minimo ?? 0,
      clase: insumo.clase, presentacion: insumo.presentacion, factor_presentacion: insumo.factor_presentacion };
    const { data } = insumo.id ? await inventario.editarInsumo(insumo.id, carga) : await inventario.crearInsumo(carga);
    notif.exito(data.mensaje);
    modalInsumo.value = false;
    cargar();
  } catch (e) {
    notif.error(mensajeError(e));
  } finally {
    procesando.value = false;
  }
};

const retirarInsumo = async () => {
  if (!confirm(`¿Retirar «${insumo.nombre}» del catálogo? Su historial se conserva.`)) return;
  try {
    const { data } = await inventario.eliminarInsumo(insumo.id);
    notif.exito(data.mensaje);
    modalInsumo.value = false;
    cargar();
  } catch (e) {
    notif.error(mensajeError(e));
  }
};

watch([categoria, estado], () => {
  router.replace({ query: Object.fromEntries(Object.entries({ categoria: categoria.value, estado: estado.value }).filter(([, v]) => v)) });
});

onMounted(() => {
  catalogos.cargar().catch(() => {});
  cargar();
});
</script>

<style scoped>
.indicador-filtro { text-align: left; font: inherit; color: inherit; cursor: pointer; }
.indicador-filtro:hover { border-color: var(--borde-fuerte); }
.indicador-filtro.elegido { border-color: var(--azul); background: var(--azul-tenue); }

.venc { font-size: 12px; white-space: nowrap; }
.venc.vencido { color: var(--peligro); font-weight: 600; }
.venc.critico { color: var(--alerta); font-weight: 600; }
.venc .celda-sec { font-family: var(--fuente); }
.rotulo-campo-i { display: block; margin-bottom: 10px; font-size: 15px; font-weight: 700; }
</style>
