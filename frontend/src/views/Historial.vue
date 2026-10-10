<template>
  <div class="animar">
    <div class="titulo-seccion fila-entre">
      <div>
        <h1>Historial de servicios</h1>
        <p class="sub">Consulte los servicios de emergencia registrados en el sistema</p>
      </div>
      <button class="btn btn-secundario" @click="imprimirListado" :disabled="!servicios.length">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 6 2 18 2 18 9"/>
          <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
          <rect x="6" y="14" width="12" height="8"/>
        </svg>
        <span>Imprimir listado</span>
      </button>
    </div>

    <!-- ── FILTROS ────────────────────────────── -->
    <div class="tarjeta panel-filtros">
      <div class="rejilla rejilla-4">
        <div class="campo">
          <label>Tipo de servicio</label>
          <select v-model="filtros.tipo_servicio" class="control">
            <option value="">Todos los tipos</option>
            <option value="ambulancia">Ambulancia</option>
            <option value="incendio">Incendio</option>
            <option value="rescate">Rescate</option>
            <option value="varios">Servicios varios</option>
            <option value="agua">Servicio de agua</option>
          </select>
        </div>
        <div class="campo">
          <label>Desde</label>
          <input v-model="filtros.fecha_inicio" class="control" type="date" />
        </div>
        <div class="campo">
          <label>Hasta</label>
          <input v-model="filtros.fecha_fin" class="control" type="date" />
        </div>
        <div class="campo">
          <label>Unidad</label>
          <input v-model="filtros.unidad" class="control" type="text" placeholder="Ej. 39-1" />
        </div>
      </div>

      <div class="fila fila-fin">
        <button class="btn btn-plano btn-sm" @click="limpiarFiltros">Limpiar</button>
        <button class="btn btn-primario btn-sm" @click="cargar">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <span>Buscar</span>
        </button>
      </div>
    </div>

    <!-- ── RESULTADOS ─────────────────────────── -->
    <div v-if="cargando" class="tarjeta estado-carga">
      <span class="cargador cargador-oscuro"></span>
      <p>Consultando registros</p>
    </div>

    <div v-else-if="!servicios.length" class="tarjeta">
      <div class="vacio">
        <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <p>No se encontraron servicios con los criterios indicados</p>
      </div>
    </div>

    <template v-else>
      <div class="resumen-resultados">
        <span><strong>{{ servicios.length }}</strong> servicios encontrados</span>
      </div>

      <div class="tabla-contenedor">
        <table>
          <thead>
            <tr>
              <th>Control</th>
              <th>Tipo</th>
              <th>Fecha</th>
              <th>Dirección</th>
              <th>Zona</th>
              <th>Unidad</th>
              <th>Piloto</th>
              <th style="width:60px"></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in servicios" :key="s.id">
              <td><strong>{{ s.numero_control }}</strong></td>
              <td><span class="etiqueta" :class="claseTipo(s.tipo_servicio)">{{ nombreTipo(s.tipo_servicio) }}</span></td>
              <td>{{ formatoFecha(s.fecha) }}</td>
              <td class="celda-larga">{{ s.direccion }}</td>
              <td>{{ s.zona || '—' }}</td>
              <td>{{ s.unidad || '—' }}</td>
              <td class="celda-larga">{{ s.piloto || '—' }}</td>
              <td>
                <router-link :to="`/historial/${s.id}`" class="btn btn-plano btn-icono" title="Ver detalle">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                  </svg>
                </router-link>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { emergencias } from '../services/api';
import { useNotificacionesStore } from '../stores/notificaciones';

const notif = useNotificacionesStore();

const servicios = ref([]);
const cargando  = ref(false);

const filtros = reactive({
  tipo_servicio: '', fecha_inicio: '', fecha_fin: '', unidad: ''
});

const NOMBRES = {
  ambulancia: 'Ambulancia', incendio: 'Incendio', rescate: 'Rescate',
  varios: 'Varios', agua: 'Agua'
};
const CLASES = {
  ambulancia: 'et-info', incendio: 'et-peligro', rescate: 'et-alerta',
  varios: 'et-exito', agua: 'et-info'
};

const nombreTipo = (t) => NOMBRES[t] || t;
const claseTipo  = (t) => CLASES[t] || 'et-info';

const formatoFecha = (f) => {
  if (!f) return '—';
  const d = new Date(f);
  return d.toLocaleDateString('es-GT', { day:'2-digit', month:'2-digit', year:'numeric', timeZone:'UTC' });
};

const cargar = async () => {
  cargando.value = true;
  try {
    const params = {};
    Object.entries(filtros).forEach(([k,v]) => { if (v) params[k] = v; });
    const { data } = await emergencias.listar(params);
    servicios.value = data.servicios;
  } catch {
    notif.error('No se pudo consultar el historial');
  } finally {
    cargando.value = false;
  }
};

const limpiarFiltros = () => {
  Object.keys(filtros).forEach(k => filtros[k] = '');
  cargar();
};

const imprimirListado = () => {
  const filas = servicios.value.map(s => `
    <tr>
      <td>${s.numero_control}</td>
      <td>${nombreTipo(s.tipo_servicio)}</td>
      <td>${formatoFecha(s.fecha)}</td>
      <td>${s.direccion}</td>
      <td>${s.zona || ''}</td>
      <td>${s.unidad || ''}</td>
      <td>${s.piloto || ''}</td>
    </tr>`).join('');

  const tipoTexto = filtros.tipo_servicio ? nombreTipo(filtros.tipo_servicio) : 'Todos los tipos';

  const ventana = window.open('', '_blank');
  ventana.document.write(`
    <html><head><title>Listado de servicios</title>
    <style>
      body{font-family:'Times New Roman',serif;padding:30px;color:#000}
      .enc{display:flex;align-items:center;gap:16px;border-bottom:2px solid #000;padding-bottom:12px;margin-bottom:6px}
      .enc img{width:70px;height:70px;object-fit:contain}
      .enc h1{font-size:14px;margin:0}
      .enc h2{font-size:13px;margin:2px 0 0;font-weight:normal}
      .meta{font-size:11px;margin-bottom:14px;color:#333}
      table{width:100%;border-collapse:collapse;font-size:11px}
      th,td{border:1px solid #000;padding:5px 7px;text-align:left}
      th{background:#e8e8e8;font-weight:bold}
      .pie{margin-top:22px;font-size:10px;text-align:center;color:#444}
      @page{size:letter landscape;margin:1.5cm}
    </style></head><body>
      <div class="enc">
        <img src="/LogoBomberos.png" />
        <div>
          <h1>BENEMÉRITO CUERPO VOLUNTARIO DE BOMBEROS DE GUATEMALA</h1>
          <h2>39ª Compañía de Chiquimula — Listado de servicios atendidos</h2>
        </div>
      </div>
      <div class="meta">
        Tipo de servicio: <strong>${tipoTexto}</strong> &nbsp;|&nbsp;
        Total de registros: <strong>${servicios.value.length}</strong> &nbsp;|&nbsp;
        Generado el ${new Date().toLocaleDateString('es-GT')}
      </div>
      <table>
        <thead><tr>
          <th>Control</th><th>Tipo</th><th>Fecha</th><th>Dirección</th>
          <th>Zona</th><th>Unidad</th><th>Piloto</th>
        </tr></thead>
        <tbody>${filas}</tbody>
      </table>
      <p class="pie">Sistema de control operativo y administrativo — 39ª Compañía de Chiquimula</p>
    </body></html>`);
  ventana.document.close();
  setTimeout(() => ventana.print(), 400);
};

onMounted(cargar);
</script>

<style scoped>
.panel-filtros { padding: 18px 20px 14px; margin-bottom: 18px; }
.panel-filtros .campo { margin-bottom: 12px; }

.estado-carga {
  display: flex; flex-direction: column; align-items: center; gap: 13px;
  padding: 56px;
}
.estado-carga p { color: var(--texto-suave); font-size: 13.5px; }

.resumen-resultados {
  margin-bottom: 12px;
  font-size: 13px; color: var(--texto-suave);
}
.resumen-resultados strong { color: var(--texto); }

.celda-larga {
  max-width: 220px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
</style>