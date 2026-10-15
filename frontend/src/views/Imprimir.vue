<template>
  <div class="animar">
    <div class="titulo-seccion">
      <div>
        <h1>Imprimir boletas</h1>
      </div>
      <div class="acciones">
        <button class="btn btn-primario btn-lg" :disabled="!seleccion.length || imprimiendo" @click="imprimir(seleccion)">
          <Icono nombre="imprimir" :tam="18" />Imprimir {{ seleccion.length ? `${seleccion.length} seleccionada${seleccion.length === 1 ? '' : 's'}` : 'seleccionadas' }}
        </button>
      </div>
    </div>

    <div class="barra-filtros">
      <div class="segmentos" role="tablist">
        <button v-for="p in PESTANAS" :key="p.valor" :class="{ activo: pestana === p.valor }" @click="pestana = p.valor">
          {{ p.nombre }}<span v-if="p.valor === 'pendiente'" class="cuenta">{{ impresion.pendientes }}</span>
        </button>
      </div>
      <div class="busqueda">
        <Icono nombre="buscar" :tam="17" />
        <input v-model="texto" class="control" type="search" placeholder="Buscar por número de control, dirección o paciente" aria-label="Buscar" />
      </div>
      <select v-model="tipo" class="control" style="width:auto" aria-label="Tipo de servicio">
        <option value="">Todos los tipos</option>
        <option v-for="t in TIPOS" :key="t.valor" :value="t.valor">{{ t.nombre }}</option>
      </select>
    </div>

    <div v-if="cargando && !boletas.length" class="esqueleto" style="height:280px"></div>

    <div v-else-if="!boletas.length" class="tarjeta vacio">
      <Icono :nombre="pestana === 'pendiente' ? 'check' : 'imprimir'" :tam="30" />
      <strong>{{ pestana === 'pendiente' ? 'No hay boletas pendientes de imprimir' : 'No hay boletas con estos filtros' }}</strong>
      <p v-if="pestana === 'pendiente'">Cuando registre una boleta aparecerá aquí hasta que se imprima.</p>
    </div>

    <template v-else>
      <label class="seleccionar-todo">
        <input type="checkbox" :checked="todasSeleccionadas" @change="alternarTodas" />
        Seleccionar las {{ boletas.length }} de esta página
      </label>

      <ul class="lista-boletas">
        <li v-for="b in boletas" :key="b.id" class="tarjeta" :class="{ elegida: seleccion.includes(b.id) }">
          <label class="check" :aria-label="`Seleccionar ${b.numero_control}`">
            <input type="checkbox" :value="b.id" v-model="seleccion" />
          </label>
          <span class="icono-tipo" :style="{ '--c': `var(--t-${b.tipo_servicio})` }"><Icono :nombre="b.tipo_servicio" :tam="22" /></span>
          <div class="datos crecer">
            <strong><span class="mono">{{ b.numero_control }}</span> · {{ nombreTipo(b.tipo_servicio) }}</strong>
            <span class="suave">{{ fechaLarga(b.fecha) }}{{ b.hora_salida ? `, ${hora(b.hora_salida)}` : '' }} · {{ b.sector || b.zona || 'Sin sector' }}</span>
            <span class="tenue dir">{{ b.direccion }}</span>
          </div>
          <span v-if="b.impresa_en" class="etiqueta et-exito" :title="`Impresa ${b.impresiones} vez/veces`">Impresa {{ fechaCorta(b.impresa_en.slice(0, 10)) }}</span>
          <span v-else class="etiqueta et-alerta">Sin imprimir</span>
          <router-link :to="`/historial/${b.id}`" class="btn btn-plano">Ver</router-link>
          <button class="btn btn-secundario" :disabled="imprimiendo" @click="imprimir([b.id])">
            <Icono nombre="imprimir" :tam="17" />Imprimir
          </button>
        </li>
      </ul>

      <Paginador :total="total" :pagina="pagina" :tamano="tamano" @update:pagina="(p) => { pagina = p; cargar(); }" class="tarjeta pag" />
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { emergencias, mensajeError } from '../services/api';
import { useImpresionStore } from '../stores/impresion';
import { useNotificacionesStore } from '../stores/notificaciones';
import { TIPOS, nombreTipo } from '../stores/catalogos';
import { fechaLarga, fechaCorta, hora } from '../utils/formato';
import Icono from '../components/Icono.vue';
import Paginador from '../components/Paginador.vue';

const PESTANAS = [
  { valor: 'pendiente', nombre: 'Por imprimir' },
  { valor: 'impresa', nombre: 'Impresas' },
  { valor: '', nombre: 'Todas' }
];

const impresion = useImpresionStore();
const notif = useNotificacionesStore();

const pestana = ref('pendiente');
const texto = ref('');
const tipo = ref('');
const boletas = ref([]);
const total = ref(0);
const pagina = ref(1);
const tamano = 20;
const cargando = ref(true);
const imprimiendo = ref(false);
const seleccion = ref([]);

const todasSeleccionadas = computed(() => boletas.value.length && boletas.value.every(b => seleccion.value.includes(b.id)));
const alternarTodas = () => {
  seleccion.value = todasSeleccionadas.value ? [] : boletas.value.map(b => b.id);
};

const cargar = async () => {
  cargando.value = true;
  try {
    const { data } = await emergencias.listar({
      estado: 'imprimibles', impresion: pestana.value || undefined,
      tipo_servicio: tipo.value || undefined, texto: texto.value || undefined,
      pagina: pagina.value, tamano
    });
    boletas.value = data.servicios;
    total.value = data.total;
    seleccion.value = seleccion.value.filter(id => data.servicios.some(b => b.id === id));
  } catch (e) {
    notif.error(mensajeError(e, 'No se pudieron cargar las boletas'));
  } finally {
    cargando.value = false;
  }
};

const imprimir = async (ids) => {
  imprimiendo.value = true;
  try {
    const n = await impresion.imprimir(ids);
    if (n) notif.exito(n === 1 ? 'Boleta marcada como impresa' : `${n} boletas marcadas como impresas`);
    seleccion.value = [];
    await cargar();
  } catch (e) {
    notif.error(mensajeError(e, 'No se pudo preparar la impresión'));
  } finally {
    imprimiendo.value = false;
  }
};

watch([pestana, tipo], () => { pagina.value = 1; seleccion.value = []; cargar(); });
let espera = null;
watch(texto, () => { clearTimeout(espera); espera = setTimeout(() => { pagina.value = 1; cargar(); }, 300); });

onMounted(() => {
  impresion.contarPendientes();
  cargar();
});
</script>

<style scoped>
.seleccionar-todo { display: inline-flex; align-items: center; gap: 10px; margin-bottom: 12px; font-size: 14.5px; color: var(--texto-suave); cursor: pointer; }
.lista-boletas { list-style: none; display: flex; flex-direction: column; gap: 10px; }
.lista-boletas li { display: flex; align-items: center; gap: 16px; padding: 14px 18px; flex-wrap: wrap; transition: border-color var(--transicion), background var(--transicion); }
.lista-boletas li.elegida { border-color: var(--acento); background: var(--acento-tenue); }
.check { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; cursor: pointer; }
input[type=checkbox] { width: 20px; height: 20px; accent-color: var(--acento); cursor: pointer; }
.icono-tipo { width: 46px; height: 46px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); flex-shrink: 0; }
.datos { min-width: 220px; }
.datos strong { display: block; font-size: 16.5px; }
.datos > span { display: block; font-size: 14px; }
.dir { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 520px; }
.pag { margin-top: 12px; }
@media (max-width: 760px) {
  .lista-boletas li .btn-secundario { flex: 1; }
}
</style>
