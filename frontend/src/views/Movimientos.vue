<template>
  <div class="animar">
    <div class="titulo-seccion">
      <div>
        <h1>Movimientos de inventario</h1>
        <p class="sub">Historial de entradas y salidas con su trazabilidad</p>
      </div>
    </div>

    <div class="tarjeta panel-filtros">
      <div class="rejilla rejilla-4">
        <div class="campo">
          <label>Tipo de movimiento</label>
          <select v-model="filtros.tipo" class="control">
            <option value="">Todos</option>
            <option value="entrada">Entradas</option>
            <option value="salida">Salidas</option>
          </select>
        </div>
        <div class="campo">
          <label>Categoría</label>
          <select v-model="filtros.categoria" class="control">
            <option value="">Todas</option>
            <option value="prehospitalario">Pre-hospitalario</option>
            <option value="cafeteria">Cafetería</option>
            <option value="libreria">Librería</option>
            <option value="limpieza">Limpieza</option>
          </select>
        </div>
        <div class="campo">
          <label>Mes</label>
          <select v-model="filtros.mes" class="control">
            <option value="">Todos</option>
            <option v-for="(m,i) in meses" :key="i" :value="i+1">{{ m }}</option>
          </select>
        </div>
        <div class="campo">
          <label>Año</label>
          <select v-model="filtros.anio" class="control">
            <option value="">Todos</option>
            <option v-for="a in anios" :key="a" :value="a">{{ a }}</option>
          </select>
        </div>
      </div>

      <div class="fila fila-fin">
        <button class="btn btn-plano btn-sm" @click="limpiar">Limpiar</button>
        <button class="btn btn-primario btn-sm" @click="cargar">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <span>Buscar</span>
        </button>
      </div>
    </div>

    <div v-if="cargando" class="tarjeta estado-carga">
      <span class="cargador cargador-oscuro"></span>
      <p>Cargando movimientos</p>
    </div>

    <div v-else-if="!movimientos.length" class="tarjeta">
      <div class="vacio"><p>No se registraron movimientos con los criterios indicados</p></div>
    </div>

    <template v-else>
      <div class="totales">
        <div class="total-item">
          <span class="punto-entrada"></span>
          <span>Entradas: <strong>{{ totalEntradas }}</strong></span>
        </div>
        <div class="total-item">
          <span class="punto-salida"></span>
          <span>Salidas: <strong>{{ totalSalidas }}</strong></span>
        </div>
        <div class="crecer"></div>
        <span class="conteo">{{ movimientos.length }} movimientos</span>
      </div>

      <div class="tabla-contenedor">
        <table>
          <thead>
            <tr>
              <th>Fecha</th><th>Insumo</th><th>Categoría</th><th>Tipo</th>
              <th>Cantidad</th><th>Lote</th><th>Vencimiento</th>
              <th>Servicio</th><th>Registró</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in movimientos" :key="m.id">
              <td>{{ formatoFecha(m.fecha_movimiento) }}</td>
              <td class="celda-larga">{{ m.insumo }}</td>
              <td class="capitalizar">{{ m.categoria }}</td>
              <td>
                <span class="etiqueta" :class="m.tipo_movimiento === 'entrada' ? 'et-exito' : 'et-info'">
                  {{ m.tipo_movimiento === 'entrada' ? 'Entrada' : 'Salida' }}
                </span>
              </td>
              <td><strong>{{ m.cantidad }}</strong></td>
              <td>{{ m.numero_lote || '—' }}</td>
              <td>{{ m.fecha_vencimiento ? formatoFecha(m.fecha_vencimiento) : '—' }}</td>
              <td>
                <span v-if="m.servicio" class="vinculo-servicio">{{ m.servicio }}</span>
                <span v-else>—</span>
              </td>
              <td class="celda-larga">{{ m.registrado_por }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { inventario } from '../services/api';
import { useNotificacionesStore } from '../stores/notificaciones';

const notif = useNotificacionesStore();

const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
               'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const anioActual = new Date().getFullYear();
const anios = [anioActual, anioActual - 1, anioActual - 2];

const movimientos = ref([]);
const cargando    = ref(true);

const filtros = reactive({ tipo: '', categoria: '', mes: '', anio: '' });

const totalEntradas = computed(() =>
  movimientos.value.filter(m => m.tipo_movimiento === 'entrada')
    .reduce((a, m) => a + m.cantidad, 0));
const totalSalidas = computed(() =>
  movimientos.value.filter(m => m.tipo_movimiento === 'salida')
    .reduce((a, m) => a + m.cantidad, 0));

const formatoFecha = (f) => new Date(f).toLocaleDateString('es-GT',
  { day:'2-digit', month:'2-digit', year:'numeric', timeZone:'UTC' });

const cargar = async () => {
  cargando.value = true;
  try {
    const params = {};
    Object.entries(filtros).forEach(([k,v]) => { if (v) params[k] = v; });
    const { data } = await inventario.movimientos(params);
    movimientos.value = data.movimientos;
  } catch {
    notif.error('No se pudieron cargar los movimientos');
  } finally {
    cargando.value = false;
  }
};

const limpiar = () => {
  Object.keys(filtros).forEach(k => filtros[k] = '');
  cargar();
};

onMounted(cargar);
</script>

<style scoped>
.panel-filtros { padding: 18px 20px 14px; margin-bottom: 18px; }
.panel-filtros .campo { margin-bottom: 12px; }

.estado-carga {
  display: flex; flex-direction: column; align-items: center; gap: 13px; padding: 56px;
}
.estado-carga p { color: var(--texto-suave); font-size: 13.5px; }

.totales {
  display: flex; align-items: center; gap: 20px;
  margin-bottom: 12px;
  font-size: 13px; color: var(--texto-suave);
}
.total-item { display: flex; align-items: center; gap: 7px; }
.total-item strong { color: var(--texto); }
.punto-entrada, .punto-salida {
  width: 8px; height: 8px; border-radius: 50%;
}
.punto-entrada { background: var(--exito); }
.punto-salida  { background: var(--info); }
.conteo { font-size: 12.5px; }

.vinculo-servicio {
  padding: 2px 8px;
  background: var(--superficie-alt);
  border: 1px solid var(--borde);
  border-radius: var(--radio-sm);
  font-size: 12px; font-weight: 500;
}

.capitalizar { text-transform: capitalize; }
.celda-larga {
  max-width: 200px; overflow: hidden;
  text-overflow: ellipsis; white-space: nowrap;
}
</style>