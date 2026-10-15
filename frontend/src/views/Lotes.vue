<template>
  <div class="animar">
    <div class="titulo-seccion">
      <div>
        <h1>Lotes y vencimientos</h1>
      </div>
    </div>

    <div class="barra-filtros">
      <div class="segmentos" role="group" aria-label="Estado del lote">
        <button v-for="e in ESTADOS" :key="e.valor" :class="{ activo: estado === e.valor }" @click="estado = e.valor">{{ e.nombre }}</button>
      </div>
      <div class="busqueda">
        <Icono nombre="buscar" :tam="15" />
        <input v-model="busqueda" class="control" type="search" placeholder="Insumo o número de lote" aria-label="Buscar" />
      </div>
      <select v-model="categoria" class="control control-sm" style="width:auto" aria-label="Categoría">
        <option value="">Todas las categorías</option>
        <option v-for="c in catalogos.categorias" :key="c.valor" :value="c.valor">{{ c.nombre }}</option>
      </select>
    </div>

    <div class="tabla-contenedor">
      <table>
        <thead>
          <tr><th>Insumo</th><th>Lote</th><th>Ingreso</th><th>Vencimiento</th><th class="num">Saldo</th><th class="num">Inicial</th><th>Estado</th><th></th></tr>
        </thead>
        <tbody>
          <template v-if="cargando && !lotes.length">
            <tr v-for="i in 6" :key="i"><td colspan="8"><div class="esqueleto" style="height:14px"></div></td></tr>
          </template>
          <tr v-for="l in paginados" :key="l.id" :class="{ atenuada: !l.saldo }">
            <td>
              <router-link :to="`/inventario/${l.insumo_id}`" class="celda-principal enlace-limpio">{{ l.insumo }}</router-link>
              <span class="celda-sec">{{ catalogos.nombreCategoria(l.categoria) }}</span>
            </td>
            <td class="mono">{{ l.numero_lote || '—' }}</td>
            <td class="mono">{{ fecha(l.fecha_ingreso) }}</td>
            <td class="mono">
              {{ l.fecha_vencimiento ? fecha(l.fecha_vencimiento) : 'No vence' }}
              <span v-if="l.fecha_vencimiento && l.saldo" class="celda-sec">{{ textoDias(l.dias_restantes) }}</span>
            </td>
            <td class="num"><strong>{{ l.saldo }}</strong> <span class="tenue">{{ l.unidad_medida }}</span></td>
            <td class="num tenue">{{ l.cantidad_inicial }}</td>
            <td><span class="etiqueta" :class="estadoLote(l).clase">{{ estadoLote(l).texto }}</span></td>
            <td class="der">
              <button v-if="auth.esAdministrador && l.saldo && l.dias_restantes < 0" class="btn btn-peligro btn-sm" @click="darBaja(l)">Dar de baja</button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="!cargando && !filtrados.length" class="vacio">
        <Icono nombre="lote" :tam="28" />
        <strong>{{ estado === 'vencidos' ? 'No hay lotes vencidos con saldo' : estado === 'por_vencer' ? 'Ningún lote vence en los próximos 90 días' : 'No hay lotes que mostrar' }}</strong>
        <p v-if="estado === 'vigentes' && !busqueda">Cada entrada de inventario crea un lote. Registre entradas desde Existencias.</p>
      </div>
      <Paginador v-model:pagina="pagina" :total="filtrados.length" :tamano="POR_PAGINA" class="no-imprimir" />
    </div>

    <DocumentoModal v-model="modal" tipo="baja" :inicial="inicial" @guardado="cargar" />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { inventario, mensajeError } from '../services/api';
import { useCatalogosStore } from '../stores/catalogos';
import { useNotificacionesStore } from '../stores/notificaciones';
import { fecha } from '../utils/formato';
import DocumentoModal from '../components/inventario/DocumentoModal.vue';
import { useAuthStore } from '../stores/auth';
import Icono from '../components/Icono.vue';
import Paginador from '../components/Paginador.vue';

const ESTADOS = [
  { valor: 'vigentes', nombre: 'Con saldo' },
  { valor: 'por_vencer', nombre: 'Por vencer' },
  { valor: 'vencidos', nombre: 'Vencidos' },
  { valor: 'agotados', nombre: 'Agotados' },
  { valor: 'todos', nombre: 'Todos' }
];

const ruta = useRoute();
const router = useRouter();
const catalogos = useCatalogosStore();
const notif = useNotificacionesStore();

const lotes = ref([]);
const cargando = ref(true);
const estado = ref(ruta.query.estado || 'vigentes');
const categoria = ref('');
const busqueda = ref('');
const modal = ref(false);
const inicial = ref(null);
const auth = useAuthStore();

const POR_PAGINA = 25;
const pagina = ref(1);
const paginados = computed(() => filtrados.value.slice((pagina.value - 1) * POR_PAGINA, pagina.value * POR_PAGINA));
watch([estado, categoria, busqueda], () => { pagina.value = 1; });
const filtrados = computed(() => {
  const t = busqueda.value.trim().toLowerCase();
  return lotes.value.filter(l => !t || l.insumo.toLowerCase().includes(t) || (l.numero_lote || '').toLowerCase().includes(t));
});

const textoDias = (d) => (d < 0 ? `vencido hace ${-d} d` : d === 0 ? 'vence hoy' : `en ${d} d`);
const estadoLote = (l) => {
  if (!l.saldo) return { texto: 'Agotado', clase: 'et-neutra' };
  if (l.dias_restantes == null) return { texto: 'Vigente', clase: 'et-exito' };
  if (l.dias_restantes < 0) return { texto: 'Vencido', clase: 'et-peligro' };
  if (l.dias_restantes <= 30) return { texto: 'Vence pronto', clase: 'et-alerta' };
  if (l.dias_restantes <= 90) return { texto: 'Próximo', clase: 'et-info' };
  return { texto: 'Vigente', clase: 'et-exito' };
};

const cargar = async () => {
  cargando.value = true;
  try {
    const { data } = await inventario.lotes({
      estado: estado.value === 'todos' ? undefined : estado.value,
      categoria: categoria.value || undefined
    });
    lotes.value = data.lotes;
  } catch (e) {
    notif.error(mensajeError(e, 'No se pudieron cargar los lotes'));
  } finally {
    cargando.value = false;
  }
};

const darBaja = (l) => {
  inicial.value = { motivo_baja: 'vencimiento', observaciones: `Lote ${l.numero_lote || 's/n'} vencido`, lineas: [{ insumo_id: l.insumo_id, cantidad: l.saldo, lote_id: l.id }] };
  modal.value = true;
};

watch([estado, categoria], () => {
  router.replace({ query: { estado: estado.value } });
  cargar();
});
onMounted(() => {
  catalogos.cargar().catch(() => {});
  cargar();
});
</script>

<style scoped>
.enlace-limpio { text-decoration: none; }
.enlace-limpio:hover { text-decoration: underline; text-underline-offset: 2px; }
</style>
