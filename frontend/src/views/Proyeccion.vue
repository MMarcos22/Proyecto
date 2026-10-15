<template>
  <div class="animar">
    <div class="titulo-seccion">
      <div>
        <h1>Proyección anual de insumos</h1>
      </div>
      <div class="acciones no-imprimir">
        <button class="btn btn-secundario" :disabled="!datos" @click="exportar"><Icono nombre="descargar" :tam="16" />Excel</button>
        <button class="btn btn-primario" :disabled="!datos" @click="imprimir"><Icono nombre="imprimir" :tam="16" />Imprimir solicitud</button>
      </div>
    </div>

    <EncabezadoInforme titulo="Proyección anual de insumos" :periodo="datos ? `Base: ${fecha(datos.periodo.desde)} a ${fecha(datos.periodo.hasta)}` : ''" destinatario="Capital (solicitud anual)" />

    <div v-if="cargando && !datos" class="esqueleto" style="height:300px"></div>
    <template v-else-if="datos">
      <div v-if="datos.periodo.anualizado" class="aviso aviso-info mb no-imprimir">
        <Icono nombre="info" :tam="18" />
        <div>Hay {{ datos.periodo.dias_con_datos }} días de datos: el consumo se lleva a un año completo en proporción. La proyección será más precisa con un año entero registrado.</div>
      </div>

      <section class="indicadores mb">
        <div class="indicador"><span class="rotulo">Servicios en 12 meses</span><div class="valor">{{ datos.servicios.actual }}</div>
          <div class="pie">{{ datos.servicios.anterior ? `${datos.servicios.anterior} el año anterior` : 'sin año anterior para comparar' }}</div></div>
        <div class="indicador"><span class="rotulo">Crecimiento aplicado</span><div class="valor">{{ Math.round(datos.servicios.crecimiento * 100) }}<small>%</small></div>
          <div class="pie">solo a prehospitalario</div></div>
        <div class="indicador" :class="{ atencion: aPedir }"><span class="rotulo">Insumos a pedir</span><div class="valor">{{ aPedir }}</div>
          <div class="pie">de {{ datos.insumos.length }} consumibles</div></div>
      </section>

      <div class="barra-filtros no-imprimir">
        <div class="segmentos">
          <button :class="{ activo: !categoria }" @click="categoria = ''">Todas</button>
          <button v-for="c in catalogos.categorias" :key="c.valor" :class="{ activo: categoria === c.valor }" @click="categoria = c.valor">{{ c.nombre }}</button>
        </div>
        <label class="solo"><input type="checkbox" v-model="soloPedir" /> Solo lo que hay que pedir</label>
      </div>

      <div class="tabla-contenedor">
        <table>
          <thead>
            <tr><th>Insumo</th><th class="num">Consumido</th><th class="num">Recibido de la capital</th><th class="num">Proyectado para un año</th><th class="num">Existencia vigente</th><th class="num">Alcanza para</th><th class="num">Pedir</th></tr>
          </thead>
          <tbody>
            <tr v-for="i in filas" :key="i.id">
              <td class="celda-principal"><router-link :to="`/inventario/${i.id}`" class="enlace-limpio">{{ i.nombre }}</router-link>
                <span class="celda-sec">{{ catalogos.nombreCategoria(i.categoria) }} · {{ i.unidad_medida || 'unidad' }}{{ i.por_servicio ? ` · ${i.por_servicio} por servicio` : '' }}</span></td>
              <td class="num">{{ i.consumo }}</td>
              <td class="num">{{ i.recibido_capital || '—' }}</td>
              <td class="num">{{ i.proyectado }}</td>
              <td class="num">{{ i.vigente }}</td>
              <td class="num">{{ i.cobertura_dias == null ? 'sin consumo' : i.cobertura_dias > 365 ? 'más de un año' : `${i.cobertura_dias} días` }}</td>
              <td class="num"><strong>{{ i.pedir || '—' }}</strong><span v-if="i.pedir_presentacion" class="celda-sec">{{ i.pedir_presentacion }} {{ i.presentacion }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>

      <section class="tarjeta mt criterios">
        <div class="tarjeta-cabecera"><h3>Cómo se calcula</h3></div>
        <ul>
          <li><strong>Consumido:</strong> {{ datos.criterios.consumo }}.</li>
          <li><strong>Crecimiento:</strong> {{ datos.criterios.crecimiento }}.</li>
          <li><strong>Pedir:</strong> {{ datos.criterios.pedir }}.</li>
        </ul>
      </section>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { informes, mensajeError } from '../services/api';
import { useCatalogosStore } from '../stores/catalogos';
import { useNotificacionesStore } from '../stores/notificaciones';
import { fecha } from '../utils/formato';
import { exportarExcel } from '../utils/exportar';
import Icono from '../components/Icono.vue';
import EncabezadoInforme from '../components/informes/EncabezadoInforme.vue';

const catalogos = useCatalogosStore();
const notif = useNotificacionesStore();
const datos = ref(null);
const cargando = ref(true);
const categoria = ref('');
const soloPedir = ref(false);

const filas = computed(() => (datos.value?.insumos || []).filter(i => (!categoria.value || i.categoria === categoria.value) && (!soloPedir.value || i.pedir)));
const aPedir = computed(() => (datos.value?.insumos || []).filter(i => i.pedir).length);

const exportar = () => exportarExcel('Proyeccion_anual_insumos', 'Proyección anual de insumos',
  ['Insumo', 'Categoría', 'Unidad', 'Consumido 12 meses', 'Recibido de la capital', 'Proyectado', 'Existencia vigente', 'Pedir'],
  filas.value.map(i => [i.nombre, catalogos.nombreCategoria(i.categoria), i.unidad_medida, i.consumo, i.recibido_capital, i.proyectado, i.vigente, i.pedir]));
const imprimir = () => window.print();

onMounted(async () => {
  catalogos.cargar().catch(() => {});
  try {
    const { data } = await informes.proyeccion();
    datos.value = data;
  } catch (e) {
    notif.error(mensajeError(e, 'No se pudo calcular la proyección'));
  } finally {
    cargando.value = false;
  }
});
</script>

<style scoped>
.solo { display: inline-flex; align-items: center; gap: 8px; font-size: 14.5px; color: var(--texto-suave); }
.enlace-limpio { color: var(--texto); text-decoration: none; }
.enlace-limpio:hover { text-decoration: underline; }
.criterios ul { padding: 14px 20px 16px 38px; display: flex; flex-direction: column; gap: 6px; font-size: 14px; color: var(--texto-suave); }
.criterios strong { color: var(--texto); }
</style>
