<template>
  <div class="animar">
    <div class="titulo-seccion fila-entre no-imprimir">
      <div>
        <h1>Control de ingresos y egresos</h1>
        <p class="sub">Hoja mensual de movimientos por categoría de insumo</p>
      </div>
      <div class="fila">
        <button class="btn btn-secundario" @click="imprimir" :disabled="cargando">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 6 2 18 2 18 9"/>
            <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
            <rect x="6" y="14" width="12" height="8"/>
          </svg>
          <span>Imprimir</span>
        </button>
        <button class="btn btn-exito" @click="descargarExcel" :disabled="descargando">
          <template v-if="!descargando">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            <span>Exportar a Excel</span>
          </template>
          <template v-else><span class="cargador"></span><span>Generando</span></template>
        </button>
      </div>
    </div>

    <div class="barra-control no-imprimir">
      <div class="pestanas">
        <button v-for="(c, i) in datos.categorias" :key="c.clave"
                class="pestana" :class="{ activa: hojaActiva === i }"
                @click="hojaActiva = i">
          {{ c.hoja }}
        </button>
      </div>
      <div class="fila">
        <select v-model.number="periodo.mes" class="control control-sm" @change="cargar">
          <option v-for="(m,i) in meses" :key="i" :value="i+1">{{ m }}</option>
        </select>
        <select v-model.number="periodo.anio" class="control control-sm" @change="cargar">
          <option v-for="a in anios" :key="a" :value="a">{{ a }}</option>
        </select>
      </div>
    </div>

    <div v-if="cargando" class="tarjeta estado-carga">
      <span class="cargador cargador-oscuro"></span>
      <p>Cargando control mensual</p>
    </div>

    <div v-else-if="categoria" class="hoja-control">
      <div class="hc-encabezado">
        <img src="/LogoBomberos.png" alt="Logo" />
        <div>
          <p>BENEMÉRITO CUERPO VOLUNTARIO DE BOMBEROS</p>
          <p>TRIGÉSIMA NOVENA COMPAÑÍA CHIQUIMULA, GUATEMALA</p>
          <p>{{ categoria.titulo }}</p>
          <p>DURANTE EL MES DE {{ datos.periodo.mes.toUpperCase() }} DE {{ datos.periodo.anio }}</p>
        </div>
      </div>

      <table class="hc-tabla">
        <thead>
          <tr>
            <th rowspan="2" class="w-no">No.</th>
            <th rowspan="2" class="w-ins">INSUMO</th>
            <th>MES: {{ datos.mes_anterior.toUpperCase() }}</th>
            <th colspan="2">INGRESO</th>
            <th>EXISTENCIA</th>
            <th>SALIDA</th>
            <th rowspan="2">TOTAL</th>
          </tr>
          <tr>
            <th>VIENEN</th><th>FECHA</th><th>CANTIDAD</th>
            <th>CANTIDAD</th><th>CANTIDAD</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(r, i) in categoria.insumos" :key="r.id">
            <td class="c">{{ i + 1 }}</td>
            <td class="l">{{ r.nombre.toUpperCase() }}</td>
            <td class="c calc">{{ r.vienen }}</td>
            <td class="c calc">{{ r.fecha_ingreso || '' }}</td>
            <td class="c celda-edit" :class="{ vacia: !r.ingreso }"
                @click="abrirEntrada(r)" title="Registrar ingreso">
              {{ r.ingreso || '' }}
            </td>
            <td class="c calc">{{ r.vienen + r.ingreso }}</td>
            <td class="c celda-edit" :class="{ vacia: !r.salida }"
                @click="abrirSalida(r)" title="Registrar salida">
              {{ r.salida || '' }}
            </td>
            <td class="c calc fuerte">{{ r.vienen + r.ingreso - r.salida }}</td>
          </tr>
          <tr class="fila-vacia"><td colspan="8">&nbsp;</td></tr>
          <tr class="fila-vacia"><td colspan="8">&nbsp;</td></tr>
        </tbody>
      </table>

      <div class="hc-firma">
        <div class="raya"></div>
        <p>Of. I As. Kevin Gabriel Cerín Marroquín</p>
        <p>Director 39 Compañía</p>
      </div>
    </div>

    <p class="pista no-imprimir">
      Haga clic sobre las celdas de <strong>Ingreso</strong> o <strong>Salida</strong>
      para registrar un movimiento. Las demás columnas se calculan automáticamente.
    </p>

    <!-- ══ MODAL ENTRADA ══════════════════════ -->
    <Modal v-model="modalEntrada" titulo="Registrar ingreso de insumo">
      <p class="insumo-sel">{{ insumoSel?.nombre }}</p>

      <div class="rejilla rejilla-2">
        <div class="campo">
          <label>Cantidad <span class="req">*</span></label>
          <input v-model.number="entrada.cantidad" class="control" type="number" min="1" />
        </div>
        <div class="campo">
          <label>Fecha del ingreso</label>
          <input v-model="entrada.fecha_movimiento" class="control" type="date" />
        </div>
      </div>

      <div class="rejilla rejilla-2">
        <div class="campo">
          <label>Número de lote</label>
          <input v-model="entrada.numero_lote" class="control" type="text" />
        </div>
        <div class="campo">
          <label>Fecha de vencimiento</label>
          <input v-model="entrada.fecha_vencimiento" class="control" type="date" :min="hoy" />
        </div>
      </div>

      <div class="campo">
        <label>Observaciones</label>
        <textarea v-model="entrada.observaciones" class="control" rows="2"></textarea>
      </div>

      <template #acciones>
        <button class="btn btn-secundario" @click="modalEntrada = false">Cancelar</button>
        <button class="btn btn-exito" @click="guardarEntrada" :disabled="procesando">
          <span v-if="!procesando">Registrar ingreso</span>
          <template v-else><span class="cargador"></span><span>Guardando</span></template>
        </button>
      </template>
    </Modal>

    <!-- ══ MODAL SALIDA ═══════════════════════ -->
    <Modal v-model="modalSalida" titulo="Registrar salida de insumo">
      <p class="insumo-sel">{{ insumoSel?.nombre }}</p>

      <div class="nota-info">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
        </svg>
        <span>Toda salida debe vincularse al servicio de emergencia en que se utilizó el insumo.</span>
      </div>

      <div class="rejilla rejilla-2">
        <div class="campo">
          <label>Cantidad <span class="req">*</span></label>
          <input v-model.number="salida.cantidad" class="control" type="number" min="1" />
        </div>
        <div class="campo">
          <label>Fecha de la salida</label>
          <input v-model="salida.fecha_movimiento" class="control" type="date" />
        </div>
      </div>

      <div class="campo">
        <label>Servicio de emergencia <span class="req">*</span></label>
        <select v-model="salida.emergencia_id" class="control">
          <option value="">Seleccione el servicio</option>
          <option v-for="s in servicios" :key="s.id" :value="s.id">
            {{ s.numero_control }} · {{ nombreTipo(s.tipo_servicio) }} · {{ fmt(s.fecha) }}
          </option>
        </select>
      </div>

      <div class="campo">
        <label>Observaciones</label>
        <textarea v-model="salida.observaciones" class="control" rows="2"></textarea>
      </div>

      <template #acciones>
        <button class="btn btn-secundario" @click="modalSalida = false">Cancelar</button>
        <button class="btn btn-primario" @click="guardarSalida" :disabled="procesando">
          <span v-if="!procesando">Registrar salida</span>
          <template v-else><span class="cargador"></span><span>Guardando</span></template>
        </button>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { reportes, inventario, emergencias } from '../services/api';
import { useNotificacionesStore } from '../stores/notificaciones';
import { useAlertasStore } from '../stores/alertas';
import Modal from '../components/Modal.vue';

const notif = useNotificacionesStore();
const alertasStore = useAlertasStore();

const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
               'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const anioActual = new Date().getFullYear();
const anios = [anioActual, anioActual - 1, anioActual - 2];
const hoy = new Date().toISOString().split('T')[0];

const periodo = reactive({ mes: new Date().getMonth() + 1, anio: anioActual });
const datos = ref({ categorias: [], periodo: {}, mes_anterior: '' });
const hojaActiva = ref(0);
const cargando   = ref(true);
const descargando= ref(false);
const procesando = ref(false);

const servicios = ref([]);
const insumoSel = ref(null);
const modalEntrada = ref(false);
const modalSalida  = ref(false);

const entrada = reactive({
  cantidad: null, fecha_movimiento: hoy,
  numero_lote: '', fecha_vencimiento: '', observaciones: ''
});
const salida = reactive({
  cantidad: null, fecha_movimiento: hoy,
  emergencia_id: '', observaciones: ''
});

const categoria = computed(() => datos.value.categorias[hojaActiva.value]);

const NOMBRES = {
  ambulancia:'Ambulancia', incendio:'Incendio', rescate:'Rescate',
  varios:'Varios', agua:'Agua'
};
const nombreTipo = (t) => NOMBRES[t] || t;
const fmt = (f) => new Date(f).toLocaleDateString('es-GT',
  { day:'2-digit', month:'2-digit', year:'numeric', timeZone:'UTC' });

const cargar = async () => {
  cargando.value = true;
  try {
    const { data } = await reportes.inventarioControlMensual({
      mes: periodo.mes, anio: periodo.anio
    });
    datos.value = data;
  } catch {
    notif.error('No se pudo cargar el control mensual');
  } finally {
    cargando.value = false;
  }
};

const cargarServicios = async () => {
  try {
    const { data } = await emergencias.paraVinculo();
    servicios.value = data;
  } catch { /* silencioso */ }
};

const abrirEntrada = (r) => {
  insumoSel.value = r;
  Object.assign(entrada, {
    cantidad: null, fecha_movimiento: hoy,
    numero_lote: '', fecha_vencimiento: '', observaciones: ''
  });
  modalEntrada.value = true;
};

const abrirSalida = async (r) => {
  insumoSel.value = r;
  Object.assign(salida, {
    cantidad: null, fecha_movimiento: hoy,
    emergencia_id: '', observaciones: ''
  });
  if (!servicios.value.length) await cargarServicios();
  modalSalida.value = true;
};

const guardarEntrada = async () => {
  if (!entrada.cantidad || entrada.cantidad <= 0) {
    return notif.alerta('Indique una cantidad válida');
  }
  procesando.value = true;
  try {
    await inventario.entrada({
      insumo_id: insumoSel.value.id,
      cantidad: entrada.cantidad,
      numero_lote: entrada.numero_lote || null,
      fecha_vencimiento: entrada.fecha_vencimiento || null,
      fecha_movimiento: entrada.fecha_movimiento || null,
      observaciones: entrada.observaciones || null
    });
    notif.exito('Ingreso registrado correctamente');
    modalEntrada.value = false;
    cargar();
    alertasStore.cargar();
  } catch (e) {
    notif.error(e.response?.data?.mensaje || 'No se pudo registrar el ingreso');
  } finally {
    procesando.value = false;
  }
};

const guardarSalida = async () => {
  if (!salida.cantidad || salida.cantidad <= 0) {
    return notif.alerta('Indique una cantidad válida');
  }
  if (!salida.emergencia_id) {
    return notif.alerta('Debe vincular la salida a un servicio de emergencia');
  }
  procesando.value = true;
  try {
    const { data } = await inventario.salida({
      insumo_id: insumoSel.value.id,
      cantidad: salida.cantidad,
      emergencia_id: salida.emergencia_id,
      fecha_movimiento: salida.fecha_movimiento || null,
      observaciones: salida.observaciones || null
    });
    notif.exito('Salida registrada correctamente');
    if (data.alerta) notif.alerta(data.alerta);
    modalSalida.value = false;
    cargar();
    alertasStore.cargar();
  } catch (e) {
    notif.error(e.response?.data?.mensaje || 'No se pudo registrar la salida');
  } finally {
    procesando.value = false;
  }
};

const descargarExcel = async () => {
  descargando.value = true;
  try {
    const blob = await reportes.inventarioExcel(periodo.mes, periodo.anio);
    const url = URL.createObjectURL(blob);
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

const imprimir = () => window.print();

onMounted(cargar);
</script>

<style scoped>
.barra-control {
  display: flex; align-items: center; justify-content: space-between;
  gap: 14px; margin-bottom: 16px; flex-wrap: wrap;
}
.pestanas {
  display: flex; gap: 4px; padding: 4px;
  background: var(--superficie-alt);
  border: 1px solid var(--borde);
  border-radius: var(--radio);
}
.pestana {
  padding: 7px 15px;
  background: transparent; border: none; border-radius: var(--radio-sm);
  color: var(--texto-suave);
  font: inherit; font-size: 12px; font-weight: 500;
  cursor: pointer; transition: all var(--transicion);
}
.pestana:hover { color: var(--texto); }
.pestana.activa {
  background: var(--superficie); color: var(--rojo-bomberos);
  box-shadow: var(--sombra-sm);
}
.control-sm { width: auto; min-width: 128px; }

.estado-carga {
  display: flex; flex-direction: column; align-items: center; gap: 13px; padding: 56px;
}
.estado-carga p { color: var(--texto-suave); font-size: 13.5px; }

/* ── HOJA ─────────────────────────────────── */
.hoja-control {
  width: 21.6cm; margin: 0 auto; padding: 1.2cm;
  box-sizing: border-box;
  background: var(--superficie);
  border: 1px solid var(--borde);
  border-radius: var(--radio-lg);
  box-shadow: var(--sombra);
  overflow-x: auto;
}

.hc-encabezado {
  display: flex; align-items: center; gap: 14px; margin-bottom: 14px;
}
.hc-encabezado img { width: 62px; height: 62px; object-fit: contain; }
.hc-encabezado > div { flex: 1; text-align: center; }
.hc-encabezado p {
  font-size: 11.5px; font-weight: 700; line-height: 1.45;
  color: var(--texto);
}

.hc-tabla { width: 100%; border-collapse: collapse; }
.hc-tabla th, .hc-tabla td {
  border: 1px solid var(--texto);
  padding: 3px 5px; font-size: 10px;
  color: var(--texto);
}
.hc-tabla th {
  font-weight: 700; text-align: center; vertical-align: middle;
  background: var(--superficie-alt);
}
.hc-tabla td.c { text-align: center; }
.hc-tabla td.l { text-align: left; }
.hc-tabla .w-no  { width: 30px; }
.hc-tabla .w-ins { width: 40%; }
.hc-tabla .calc  { color: var(--texto-suave); }
.hc-tabla .fuerte { font-weight: 700; color: var(--texto); }

.celda-edit {
  cursor: pointer; position: relative;
  transition: background var(--transicion);
}
.celda-edit:hover {
  background: var(--peligro-fondo);
  box-shadow: inset 0 0 0 1.5px var(--rojo-bomberos);
}
.celda-edit.vacia::after {
  content: '+'; color: var(--texto-tenue);
  font-size: 12px; opacity: 0;
  transition: opacity var(--transicion);
}
.celda-edit.vacia:hover::after { opacity: 1; color: var(--rojo-bomberos); }

.fila-vacia td { height: 18px; }

.hc-firma { width: 300px; margin: 48px auto 0; text-align: center; }
.hc-firma .raya { border-top: 1px solid var(--texto); margin-bottom: 4px; }
.hc-firma p { font-size: 10px; line-height: 1.4; color: var(--texto); }

.pista {
  width: 21.6cm; margin: 12px auto 0;
  font-size: 12px; color: var(--texto-tenue); text-align: center;
}
.pista strong { color: var(--texto-suave); }

.insumo-sel {
  padding: 9px 13px; margin-bottom: 16px;
  background: var(--superficie-alt);
  border-left: 3px solid var(--rojo-bomberos);
  border-radius: var(--radio-sm);
  font-size: 13.5px; font-weight: 600; color: var(--texto);
}

.nota-info {
  display: flex; align-items: flex-start; gap: 9px;
  padding: 11px 14px; margin-bottom: 16px;
  background: var(--info-fondo); color: var(--info);
  border-radius: var(--radio);
  font-size: 12.5px; line-height: 1.5;
}
.nota-info svg { flex-shrink: 0; margin-top: 1px; }

/* ── IMPRESIÓN ────────────────────────────── */
@media print {
  .no-imprimir, .barra-lateral, .encabezado,
  .titulo-seccion, .barra-control, .pista { display: none !important; }

  html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
  .disposicion { display: block !important; }
  .zona-principal { display: block !important; }
  .contenido { padding: 0 !important; }

  .hoja-control {
    width: 100%; margin: 0; padding: 0;
    border: none; border-radius: 0; box-shadow: none;
    background: #fff;
  }
  .hc-encabezado p, .hc-tabla th, .hc-tabla td,
  .hc-firma p { color: #000 !important; }
  .hc-tabla th { background: none !important; }
  .hc-tabla th, .hc-tabla td { border-color: #000 !important; }
  .celda-edit:hover { background: none !important; box-shadow: none !important; }
  .hc-firma .raya { border-top-color: #000 !important; }

  @page { size: 21.6cm 33cm; margin: 1.2cm; }
}

@media (max-width: 1000px) {
  .hoja-control { width: 100%; padding: 16px; }
  .pista { width: 100%; }
}
</style>