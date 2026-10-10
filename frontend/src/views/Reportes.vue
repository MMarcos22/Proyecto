<template>
  <div class="animar">
    <div class="titulo-seccion">
      <div>
        <h1>Informes</h1>
        <p class="sub">Consolidación de la información operativa y de inventario</p>
      </div>
    </div>

    <!-- ── PERIODO ────────────────────────────── -->
    <div class="tarjeta panel-periodo">
      <div class="fila">
        <div class="campo">
          <label>Mes</label>
          <select v-model="periodo.mes" class="control" @change="cargarIntegrado">
            <option v-for="(m,i) in meses" :key="i" :value="i+1">{{ m }}</option>
          </select>
        </div>
        <div class="campo">
          <label>Año</label>
          <select v-model="periodo.anio" class="control" @change="cargarIntegrado">
            <option v-for="a in anios" :key="a" :value="a">{{ a }}</option>
          </select>
        </div>
        <div class="crecer"></div>
        <div class="fila acciones-inventario">
          <button class="btn btn-secundario" @click="imprimirInventario" :disabled="descargando">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 6 2 18 2 18 9"/>
              <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
              <rect x="6" y="14" width="12" height="8"/>
            </svg>
            <span>Imprimir inventario</span>
          </button>
          <button class="btn btn-exito" @click="descargarExcel" :disabled="descargando">
            <template v-if="!descargando">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              <span>Descargar Excel</span>
            </template>
            <template v-else><span class="cargador"></span><span>Generando</span></template>
          </button>
        </div>
      </div>
    </div>

    <div v-if="cargando" class="tarjeta estado-carga">
      <span class="cargador cargador-oscuro"></span>
      <p>Generando informe</p>
    </div>

    <template v-else-if="datos">
      <!-- ── CONSUMO POR TIPO DE SERVICIO ─────── -->
      <div class="tarjeta">
        <div class="tarjeta-cabecera">
          <div>
            <h2>Consumo de insumos por tipo de servicio</h2>
            <p class="cabecera-sub">Relación entre los servicios atendidos y los materiales utilizados</p>
          </div>
        </div>
        <div v-if="!datos.consumo_por_tipo_servicio?.length" class="tarjeta-cuerpo">
          <div class="vacio"><p>Sin datos en el periodo seleccionado</p></div>
        </div>
        <div v-else class="tabla-contenedor sin-borde">
          <table>
            <thead>
              <tr>
                <th>Tipo de servicio</th>
                <th>Servicios atendidos</th>
                <th>Insumos consumidos</th>
                <th>Promedio por servicio</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="t in datos.consumo_por_tipo_servicio" :key="t.tipo_servicio">
                <td>
                  <span class="etiqueta" :class="claseTipo(t.tipo_servicio)">
                    {{ nombreTipo(t.tipo_servicio) }}
                  </span>
                </td>
                <td><strong>{{ t.servicios_atendidos }}</strong></td>
                <td><strong>{{ t.insumos_consumidos }}</strong></td>
                <td>{{ promedio(t.insumos_consumidos, t.servicios_atendidos) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="columnas">
        <!-- ── CONSUMO POR ZONA ───────────────── -->
        <div class="tarjeta">
          <div class="tarjeta-cabecera">
            <h2>Consumo por zona</h2>
          </div>
          <div v-if="!datos.consumo_por_zona?.length" class="tarjeta-cuerpo">
            <div class="vacio"><p>Sin datos</p></div>
          </div>
          <div v-else class="tabla-contenedor sin-borde">
            <table>
              <thead>
                <tr><th>Zona</th><th>Servicios</th><th>Insumos</th></tr>
              </thead>
              <tbody>
                <tr v-for="z in datos.consumo_por_zona" :key="z.zona">
                  <td>{{ z.zona }}</td>
                  <td>{{ z.servicios_atendidos }}</td>
                  <td><strong>{{ z.insumos_consumidos }}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- ── INSUMOS MÁS USADOS ─────────────── -->
        <div class="tarjeta">
          <div class="tarjeta-cabecera">
            <h2>Insumos más utilizados</h2>
          </div>
          <div v-if="!datos.insumos_mas_utilizados?.length" class="tarjeta-cuerpo">
            <div class="vacio"><p>Sin datos</p></div>
          </div>
          <div v-else class="tarjeta-cuerpo">
            <div class="lista-insumos">
              <div v-for="(i,idx) in datos.insumos_mas_utilizados" :key="i.nombre" class="insumo-fila">
                <span class="posicion">{{ idx + 1 }}</span>
                <div class="insumo-datos">
                  <strong>{{ i.nombre }}</strong>
                  <span class="capitalizar">{{ i.categoria }} · {{ i.servicios }} servicios</span>
                </div>
                <span class="insumo-total">{{ i.total_consumido }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { reportes } from '../services/api';
import { useNotificacionesStore } from '../stores/notificaciones';

const notif = useNotificacionesStore();

const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
               'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const anioActual = new Date().getFullYear();
const anios = [anioActual, anioActual - 1, anioActual - 2];

const periodo = reactive({ mes: new Date().getMonth() + 1, anio: anioActual });
const datos       = ref(null);
const cargando    = ref(true);
const descargando = ref(false);

const NOMBRES = {
  ambulancia:'Ambulancia', incendio:'Incendio', rescate:'Rescate',
  varios:'Servicios varios', agua:'Servicio de agua'
};
const CLASES = {
  ambulancia:'et-info', incendio:'et-peligro', rescate:'et-alerta',
  varios:'et-exito', agua:'et-info'
};
const nombreTipo = (t) => NOMBRES[t] || t;
const claseTipo  = (t) => CLASES[t] || 'et-info';

const promedio = (total, servicios) =>
  servicios ? (total / servicios).toFixed(1) : '0.0';

const cargarIntegrado = async () => {
  cargando.value = true;
  try {
    const { data } = await reportes.integrado({ mes: periodo.mes, anio: periodo.anio });
    datos.value = data;
  } catch {
    notif.error('No se pudo generar el informe');
  } finally {
    cargando.value = false;
  }
};

const descargarExcel = async () => {
  descargando.value = true;
  try {
    const blob = await reportes.inventarioExcel(periodo.mes, periodo.anio);
    const url  = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Inventario_${meses[periodo.mes-1]}_${periodo.anio}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    notif.exito('Archivo generado correctamente');
  } catch {
    notif.error('No se pudo generar el archivo');
  } finally {
    descargando.value = false;
  }
};

const imprimirInventario = async () => {
  descargando.value = true;
  try {
    const { data } = await reportes.inventarioImprimir({ mes: periodo.mes, anio: periodo.anio });

    const filasExist = data.existencias.map(e => `
      <tr><td>${e.nombre}</td><td>${e.categoria}</td><td>${e.unidad_medida||''}</td>
      <td>${e.stock_actual}</td><td>${e.stock_minimo}</td><td>${e.estado}</td></tr>`).join('');

    const filasMov = data.movimientos.map(m => `
      <tr><td>${fmt(m.fecha_movimiento)}</td><td>${m.insumo}</td><td>${m.categoria}</td>
      <td>${m.tipo_movimiento==='entrada'?'Entrada':'Salida'}</td><td>${m.cantidad}</td>
      <td>${m.numero_lote||''}</td><td>${m.fecha_vencimiento?fmt(m.fecha_vencimiento):''}</td>
      <td>${m.servicio||''}</td></tr>`).join('');

    const w = window.open('', '_blank');
    w.document.write(`
      <html><head><title>Informe de inventario</title><style>
        body{font-family:'Times New Roman',serif;padding:28px;color:#000}
        .enc{display:flex;align-items:center;gap:16px;border-bottom:2px solid #000;padding-bottom:12px;margin-bottom:8px}
        .enc img{width:70px;height:70px;object-fit:contain}
        .enc h1{font-size:14px;margin:0}
        .enc h2{font-size:13px;margin:3px 0 0;font-weight:normal}
        .meta{font-size:11px;margin-bottom:18px;color:#333}
        h3{font-size:12px;margin:22px 0 8px;text-transform:uppercase;border-bottom:1px solid #666;padding-bottom:4px}
        table{width:100%;border-collapse:collapse;font-size:10.5px}
        th,td{border:1px solid #000;padding:4px 6px;text-align:left}
        th{background:#e8e8e8;font-weight:bold}
        .firmas{display:flex;justify-content:space-around;margin-top:46px;font-size:11px}
        .firmas div{text-align:center;width:210px}
        .raya{border-top:1px solid #000;margin-bottom:5px}
        @page{size:letter;margin:1.4cm}
      </style></head><body>
        <div class="enc">
          <img src="/LogoBomberos.png" />
          <div>
            <h1>BENEMÉRITO CUERPO VOLUNTARIO DE BOMBEROS DE GUATEMALA</h1>
            <h2>39ª Compañía de Chiquimula — Informe de inventario</h2>
          </div>
        </div>
        <div class="meta">
          Periodo: <strong>${data.periodo.mes} de ${data.periodo.anio}</strong> &nbsp;|&nbsp;
          Total de entradas: <strong>${data.resumen.total_entradas}</strong> &nbsp;|&nbsp;
          Total de salidas: <strong>${data.resumen.total_salidas}</strong> &nbsp;|&nbsp;
          Generado el ${new Date().toLocaleDateString('es-GT')}
        </div>

        <h3>Existencias actuales</h3>
        <table><thead><tr>
          <th>Insumo</th><th>Categoría</th><th>Unidad</th><th>Existencia</th><th>Mínimo</th><th>Estado</th>
        </tr></thead><tbody>${filasExist}</tbody></table>

        <h3>Movimientos del periodo</h3>
        ${filasMov ? `<table><thead><tr>
          <th>Fecha</th><th>Insumo</th><th>Categoría</th><th>Tipo</th>
          <th>Cantidad</th><th>Lote</th><th>Vencimiento</th><th>Servicio</th>
        </tr></thead><tbody>${filasMov}</tbody></table>`
        : '<p style="font-size:11px">No se registraron movimientos en el periodo.</p>'}

        <div class="firmas">
          <div><div class="raya"></div>Encargado de bodega</div>
          <div><div class="raya"></div>Vo. Bo. Comandante</div>
        </div>
      </body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 500);
  } catch {
    notif.error('No se pudo generar el informe');
  } finally {
    descargando.value = false;
  }
};

const fmt = (f) => new Date(f).toLocaleDateString('es-GT',
  { day:'2-digit', month:'2-digit', year:'numeric', timeZone:'UTC' });

onMounted(cargarIntegrado);
</script>

<style scoped>
.panel-periodo { padding: 16px 20px; margin-bottom: 18px; }
.panel-periodo .campo { margin-bottom: 0; min-width: 150px; }

.estado-carga {
  display: flex; flex-direction: column; align-items: center; gap: 13px; padding: 56px;
}
.estado-carga p { color: var(--texto-suave); font-size: 13.5px; }

.cabecera-sub { font-size: 12.5px; color: var(--texto-suave); margin-top: 3px; }

.tarjeta { margin-bottom: 18px; }
.tabla-contenedor.sin-borde { border: none; border-radius: 0; }

.columnas { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

.lista-insumos { display: flex; flex-direction: column; gap: 8px; }
.insumo-fila {
  display: flex; align-items: center; gap: 11px;
  padding: 9px 11px;
  background: var(--superficie-alt);
  border-radius: var(--radio);
}
.posicion {
  width: 22px; height: 22px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: var(--superficie); border: 1px solid var(--borde);
  border-radius: 50%; font-size: 11px; font-weight: 700;
  color: var(--texto-suave);
}
.insumo-datos { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.insumo-datos strong {
  font-size: 13px; font-weight: 500;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.insumo-datos span { font-size: 11.5px; color: var(--texto-tenue); }
.insumo-total {
  font-size: 15px; font-weight: 700; color: var(--rojo-bomberos);
}

.capitalizar { text-transform: capitalize; }

@media (max-width: 1000px) {
  .columnas { grid-template-columns: 1fr; }
  .panel-periodo .fila { flex-wrap: wrap; }
  .acciones-inventario { width: 100%; }
}
</style>