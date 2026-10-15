<template>
  <div class="animar">
    <div class="titulo-seccion">
      <div>
        <h1>Movimientos por insumo y lote</h1>
      </div>
    </div>

    <div class="barra-filtros">
      <div class="busqueda">
        <Icono nombre="buscar" :tam="15" />
        <input v-model="texto" class="control" type="search" placeholder="Insumo, lote o número de control" aria-label="Buscar" />
      </div>
      <div class="segmentos" role="group" aria-label="Tipo de movimiento">
        <button :class="{ activo: !f.tipo }" @click="f.tipo = ''; f.motivo = ''">Todos <span class="cuenta">{{ totales.n }}</span></button>
        <button :class="{ activo: f.tipo === 'entrada' }" @click="f.tipo = 'entrada'; f.motivo = ''">Entradas <span class="cuenta">{{ totales.entradas }}</span></button>
        <button :class="{ activo: f.tipo === 'salida' }" @click="f.tipo = 'salida'; f.motivo = ''">Salidas <span class="cuenta">{{ totales.salidas }}</span></button>
      </div>
      <select v-model="f.motivo" class="control control-sm" style="width:auto" :disabled="!f.tipo" aria-label="Motivo">
        <option value="">Todos los motivos</option>
        <option v-for="m in catalogos.motivos(f.tipo)" :key="m.valor" :value="m.valor">{{ m.nombre }}</option>
      </select>
      <select v-model="f.categoria" class="control control-sm" style="width:auto" aria-label="Categoría">
        <option value="">Todas las categorías</option>
        <option v-for="c in catalogos.categorias" :key="c.valor" :value="c.valor">{{ c.nombre }}</option>
      </select>
      <div class="fila">
        <input v-model="f.desde" type="date" class="control control-sm mono" aria-label="Desde" />
        <span class="tenue">a</span>
        <input v-model="f.hasta" type="date" class="control control-sm mono" aria-label="Hasta" />
      </div>
    </div>

    <div class="tabla-contenedor">
      <table>
        <thead>
          <tr><th>Fecha</th><th>Insumo</th><th>Movimiento</th><th class="num">Cantidad</th><th>Lote</th><th>Referencia</th><th>Registró</th></tr>
        </thead>
        <tbody>
          <template v-if="cargando && !movimientos.length">
            <tr v-for="i in 8" :key="i"><td colspan="7"><div class="esqueleto" style="height:14px"></div></td></tr>
          </template>
          <tr v-for="m in movimientos" :key="m.id">
            <td class="mono">{{ fecha(m.fecha_movimiento) }}</td>
            <td>
              <router-link :to="`/inventario/${m.insumo_id}`" class="celda-principal enlace-limpio">{{ m.insumo }}</router-link>
              <span class="celda-sec">{{ catalogos.nombreCategoria(m.categoria) }}</span>
            </td>
            <td><span class="mov" :class="m.tipo_movimiento">{{ catalogos.nombreMotivo(m.tipo_movimiento, m.motivo) }}</span></td>
            <td class="num" :class="m.tipo_movimiento === 'entrada' ? 'entra' : 'sale'">
              {{ m.tipo_movimiento === 'entrada' ? '+' : '−' }}{{ m.cantidad }} <span class="tenue">{{ m.unidad_medida }}</span>
            </td>
            <td class="mono">{{ m.numero_lote || '—' }}<span v-if="m.fecha_vencimiento" class="celda-sec">vence {{ fecha(m.fecha_vencimiento) }}</span></td>
            <td>
              <router-link v-if="m.emergencia_id" :to="`/historial/${m.emergencia_id}`" class="mono enlace-ref">{{ m.servicio }}</router-link>
              <span v-else-if="m.documento">{{ m.documento }}</span>
              <span v-else class="tenue">{{ m.observaciones || '—' }}</span>
            </td>
            <td class="suave">{{ m.registrado_por }}</td>
          </tr>
        </tbody>
      </table>
      <div v-if="!cargando && !movimientos.length" class="vacio">
        <Icono nombre="movimientos" :tam="28" />
        <strong>Sin movimientos</strong>
        <p>No hay entradas ni salidas con estos filtros.</p>
      </div>
      <Paginador :total="totales.n" :pagina="pagina" :tamano="tamano" @update:pagina="(p) => { pagina = p; cargar(); }" />
    </div>

  </div>
</template>

<script setup>
import { ref, reactive, watch, onMounted } from 'vue';
import { inventario, mensajeError } from '../services/api';
import { useCatalogosStore } from '../stores/catalogos';
import { useNotificacionesStore } from '../stores/notificaciones';
import { fecha } from '../utils/formato';
import Paginador from '../components/Paginador.vue';
import Icono from '../components/Icono.vue';

const catalogos = useCatalogosStore();
const notif = useNotificacionesStore();

const f = reactive({ tipo: '', motivo: '', categoria: '', desde: '', hasta: '' });
const texto = ref('');
const movimientos = ref([]);
const totales = ref({ n: 0, entradas: 0, salidas: 0 });
const pagina = ref(1);
const tamano = 50;
const cargando = ref(true);

const cargar = async () => {
  cargando.value = true;
  try {
    const params = { pagina: pagina.value, tamano, texto: texto.value || undefined };
    for (const [k, v] of Object.entries(f)) if (v) params[k] = v;
    const { data } = await inventario.movimientos(params);
    movimientos.value = data.movimientos;
    totales.value = { n: data.total, entradas: data.entradas, salidas: data.salidas };
  } catch (e) {
    notif.error(mensajeError(e, 'No se pudieron cargar los movimientos'));
  } finally {
    cargando.value = false;
  }
};

watch(f, () => { pagina.value = 1; cargar(); });
let espera = null;
watch(texto, () => { clearTimeout(espera); espera = setTimeout(() => { pagina.value = 1; cargar(); }, 300); });

onMounted(() => {
  catalogos.cargar().catch(() => {});
  cargar();
});
</script>

<style scoped>
.enlace-limpio { text-decoration: none; }
.enlace-limpio:hover { text-decoration: underline; text-underline-offset: 2px; }
.mov { font-size: 12.5px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
.mov::before { content: ''; width: 0; height: 0; border-left: 4px solid transparent; border-right: 4px solid transparent; }
.mov.entrada::before { border-bottom: 6px solid var(--exito); }
.mov.salida::before { border-top: 6px solid var(--peligro); }
.entra { color: var(--exito); }
.sale { color: var(--peligro); }
.enlace-ref { font-size: 12px; font-weight: 600; }
</style>
