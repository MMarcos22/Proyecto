<template>
  <div class="animar">
    <div class="titulo-seccion fila-entre">
      <div>
        <h1>Existencias de inventario</h1>
        <p class="sub">Control de insumos disponibles en la bodega de la compañía</p>
      </div>
      <div v-if="auth.esOperativo" class="fila">
        <button class="btn btn-secundario" @click="abrirInsumo()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          <span>Nuevo insumo</span>
        </button>
        <button class="btn btn-exito" @click="abrirEntrada">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          <span>Registrar entrada</span>
        </button>
        <button class="btn btn-primario" @click="abrirSalida">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          <span>Registrar salida</span>
        </button>
      </div>
    </div>

    <div v-if="totalAlertas" class="aviso-alertas">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
      <span>
        <strong>{{ alertas.existencia_critica.length }}</strong> insumos con existencia crítica
        <template v-if="alertas.proximos_a_vencer.length">
          y <strong>{{ alertas.proximos_a_vencer.length }}</strong> próximos a vencer
        </template>
      </span>
    </div>

    <div class="barra-filtros">
      <div class="pestanas">
        <button v-for="c in categorias" :key="c.valor"
                class="pestana" :class="{ activa: filtros.categoria === c.valor }"
                @click="filtros.categoria = c.valor; cargar()">
          {{ c.nombre }}
        </button>
      </div>
      <div class="fila">
        <input v-model="busqueda" class="control control-busqueda" type="text"
               placeholder="Buscar insumo" />
        <select v-model="filtros.estado" class="control control-estado" @change="cargar">
          <option value="">Todos los estados</option>
          <option value="normal">Normal</option>
          <option value="bajo">Existencia baja</option>
          <option value="agotado">Agotado</option>
        </select>
      </div>
    </div>

    <div v-if="cargando" class="tarjeta estado-carga">
      <span class="cargador cargador-oscuro"></span>
      <p>Cargando existencias</p>
    </div>

    <div v-else-if="!insumosFiltrados.length" class="tarjeta">
      <div class="vacio"><p>No hay insumos que coincidan con el filtro</p></div>
    </div>

    <div v-else class="tabla-contenedor">
      <table>
        <thead>
          <tr>
            <th>Insumo</th><th>Categoría</th><th>Unidad</th>
            <th>Existencia</th><th>Mínimo</th><th>Estado</th>
            <th v-if="auth.esOperativo" style="width:92px">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="i in insumosFiltrados" :key="i.id">
            <td>{{ i.nombre }}</td>
            <td class="capitalizar">{{ i.categoria }}</td>
            <td>{{ i.unidad_medida || '—' }}</td>
            <td><strong>{{ i.stock_actual }}</strong></td>
            <td>{{ i.stock_minimo }}</td>
            <td><span class="etiqueta" :class="claseEstado(i.estado)">{{ textoEstado(i.estado) }}</span></td>
            <td v-if="auth.esOperativo">
              <div class="acciones-fila">
                <button class="btn-accion" title="Editar" @click="abrirInsumo(i)">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                    <path d="M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
                <button class="btn-accion btn-accion-peligro" title="Eliminar" @click="confirmarEliminar(i)">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                    <line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>
                  </svg>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ══ MODAL NUEVO / EDITAR INSUMO ════════ -->
    <Modal v-model="modalInsumo" :titulo="insumo.id ? 'Editar insumo' : 'Nuevo insumo'">
      <div class="campo">
        <label>Nombre del insumo <span class="req">*</span></label>
        <input v-model="insumo.nombre" class="control" type="text" />
      </div>

      <div class="rejilla rejilla-2">
        <div class="campo">
          <label>Categoría <span class="req">*</span></label>
          <select v-model="insumo.categoria" class="control">
            <option value="">Seleccione</option>
            <option value="prehospitalario">Pre-hospitalario</option>
            <option value="cafeteria">Cafetería</option>
            <option value="libreria">Librería</option>
            <option value="limpieza">Limpieza</option>
          </select>
        </div>
        <div class="campo">
          <label>Unidad de medida</label>
          <input v-model="insumo.unidad_medida" class="control" type="text"
                 placeholder="Ej. caja, unidad, galón" />
        </div>
      </div>

      <div class="campo">
        <label>Existencia mínima</label>
        <input v-model.number="insumo.stock_minimo" class="control" type="number" min="0" />
        <span class="ayuda">Cantidad bajo la cual el sistema generará una alerta</span>
      </div>

      <template #acciones>
        <button class="btn btn-secundario" @click="modalInsumo = false">Cancelar</button>
        <button class="btn btn-primario" @click="guardarInsumo" :disabled="procesando">
          <span v-if="!procesando">{{ insumo.id ? 'Guardar cambios' : 'Agregar insumo' }}</span>
          <template v-else><span class="cargador"></span><span>Guardando</span></template>
        </button>
      </template>
    </Modal>

    <!-- ══ MODAL ELIMINAR ═════════════════════ -->
    <Modal v-model="modalEliminar" titulo="Eliminar insumo" ancho="420px">
      <p class="texto-eliminar">
        ¿Está seguro que desea eliminar <strong>{{ insumoEliminar?.nombre }}</strong>?
      </p>
      <p class="nota-eliminar">
        Si el insumo tiene movimientos registrados se desactivará en lugar de eliminarse,
        para conservar el historial de la institución.
      </p>
      <template #acciones>
        <button class="btn btn-secundario" @click="modalEliminar = false">Cancelar</button>
        <button class="btn btn-peligro" @click="eliminarInsumo" :disabled="procesando">
          <span v-if="!procesando">Eliminar</span>
          <template v-else><span class="cargador"></span><span>Eliminando</span></template>
        </button>
      </template>
    </Modal>

    <!-- ══ MODAL ENTRADA ══════════════════════ -->
    <Modal v-model="modalEntrada" titulo="Registrar entrada de insumos">
      <div class="campo">
        <label>Insumo <span class="req">*</span></label>
        <select v-model="entrada.insumo_id" class="control">
          <option value="">Seleccione el insumo</option>
          <optgroup v-for="c in categorias.slice(1)" :key="c.valor" :label="c.nombre">
            <option v-for="i in porCategoria(c.valor)" :key="i.id" :value="i.id">
              {{ i.nombre }} — existencia: {{ i.stock_actual }}
            </option>
          </optgroup>
        </select>
      </div>

      <div class="rejilla rejilla-2">
        <div class="campo">
          <label>Cantidad <span class="req">*</span></label>
          <input v-model.number="entrada.cantidad" class="control" type="number" min="1" />
        </div>
        <div class="campo">
          <label>Número de lote</label>
          <input v-model="entrada.numero_lote" class="control" type="text" placeholder="Ej. LOTE-2026-001" />
        </div>
      </div>

      <div class="campo">
        <label>Fecha de vencimiento</label>
        <input v-model="entrada.fecha_vencimiento" class="control" type="date" :min="hoy" />
        <span class="ayuda">No se admiten fechas anteriores al día de hoy</span>
      </div>

      <div class="campo">
        <label>Observaciones</label>
        <textarea v-model="entrada.observaciones" class="control" rows="2"></textarea>
      </div>

      <template #acciones>
        <button class="btn btn-secundario" @click="modalEntrada = false">Cancelar</button>
        <button class="btn btn-exito" @click="guardarEntrada" :disabled="procesando">
          <span v-if="!procesando">Registrar entrada</span>
          <template v-else><span class="cargador"></span><span>Guardando</span></template>
        </button>
      </template>
    </Modal>

    <!-- ══ MODAL SALIDA ═══════════════════════ -->
    <Modal v-model="modalSalida" titulo="Registrar salida de insumos">
      <div class="nota-info">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
        </svg>
        <span>Toda salida debe vincularse al servicio de emergencia en que se utilizó el insumo.</span>
      </div>

      <div class="campo">
        <label>Insumo <span class="req">*</span></label>
        <select v-model="salida.insumo_id" class="control">
          <option value="">Seleccione el insumo</option>
          <optgroup v-for="c in categorias.slice(1)" :key="c.valor" :label="c.nombre">
            <option v-for="i in porCategoria(c.valor)" :key="i.id" :value="i.id"
                    :disabled="i.stock_actual === 0">
              {{ i.nombre }} — disponible: {{ i.stock_actual }}
            </option>
          </optgroup>
        </select>
      </div>

      <div class="campo">
        <label>Cantidad <span class="req">*</span></label>
        <input v-model.number="salida.cantidad" class="control" type="number" min="1" />
      </div>

      <div class="campo">
        <label>Servicio de emergencia <span class="req">*</span></label>
        <select v-model="salida.emergencia_id" class="control">
          <option value="">Seleccione el servicio</option>
          <option v-for="s in serviciosVinculo" :key="s.id" :value="s.id">
            {{ s.numero_control }} · {{ nombreTipo(s.tipo_servicio) }} · {{ formatoFecha(s.fecha) }}
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
import { inventario, emergencias } from '../services/api';
import { useAuthStore } from '../stores/auth';
import { useAlertasStore } from '../stores/alertas';
import { useNotificacionesStore } from '../stores/notificaciones';
import Modal from '../components/Modal.vue';

const auth    = useAuthStore();
const notif   = useNotificacionesStore();
const alertasStore = useAlertasStore();

const hoy = new Date().toISOString().split('T')[0];

const categorias = [
  { valor: '',                nombre: 'Todas' },
  { valor: 'prehospitalario', nombre: 'Pre-hospitalario' },
  { valor: 'cafeteria',       nombre: 'Cafetería' },
  { valor: 'libreria',        nombre: 'Librería' },
  { valor: 'limpieza',        nombre: 'Limpieza' }
];

const insumos   = ref([]);
const todos     = ref([]);
const alertas   = ref({ existencia_critica: [], proximos_a_vencer: [] });
const serviciosVinculo = ref([]);
const cargando  = ref(true);
const procesando= ref(false);
const busqueda  = ref('');

const filtros = reactive({ categoria: '', estado: '' });

const modalInsumo   = ref(false);
const modalEliminar = ref(false);
const modalEntrada  = ref(false);
const modalSalida   = ref(false);

const insumo = reactive({
  id: null, nombre: '', categoria: '', unidad_medida: '', stock_minimo: 5
});
const insumoEliminar = ref(null);

const entrada = reactive({
  insumo_id: '', cantidad: null, numero_lote: '',
  fecha_vencimiento: '', observaciones: ''
});
const salida = reactive({
  insumo_id: '', cantidad: null, emergencia_id: '', observaciones: ''
});

const totalAlertas = computed(() =>
  alertas.value.existencia_critica.length + alertas.value.proximos_a_vencer.length
);

const insumosFiltrados = computed(() => {
  const t = busqueda.value.trim().toLowerCase();
  if (!t) return insumos.value;
  return insumos.value.filter(i => i.nombre.toLowerCase().includes(t));
});

const porCategoria = (cat) => todos.value.filter(i => i.categoria === cat);

const claseEstado = (e) =>
  e === 'agotado' ? 'et-peligro' : e === 'bajo' ? 'et-alerta' : 'et-exito';
const textoEstado = (e) =>
  e === 'agotado' ? 'Agotado' : e === 'bajo' ? 'Existencia baja' : 'Normal';

const NOMBRES = {
  ambulancia:'Ambulancia', incendio:'Incendio', rescate:'Rescate',
  varios:'Varios', agua:'Agua'
};
const nombreTipo = (t) => NOMBRES[t] || t;
const formatoFecha = (f) => new Date(f).toLocaleDateString('es-GT',
  { day:'2-digit', month:'2-digit', year:'numeric', timeZone:'UTC' });

const cargar = async () => {
  cargando.value = true;
  try {
    const params = {};
    if (filtros.categoria) params.categoria = filtros.categoria;
    if (filtros.estado)    params.estado    = filtros.estado;

    const [lista, completa, alr] = await Promise.all([
      inventario.listar(params),
      inventario.listar(),
      inventario.alertas()
    ]);
    insumos.value = lista.data.insumos;
    todos.value   = completa.data.insumos;
    alertas.value = alr.data;
    alertasStore.cargar();
  } catch {
    notif.error('No se pudo cargar el inventario');
  } finally {
    cargando.value = false;
  }
};

// ── INSUMO ──────────────────────────────────────
const abrirInsumo = (i = null) => {
  if (i) {
    Object.assign(insumo, {
      id: i.id, nombre: i.nombre, categoria: i.categoria,
      unidad_medida: i.unidad_medida || '', stock_minimo: i.stock_minimo
    });
  } else {
    Object.assign(insumo, {
      id: null, nombre: '', categoria: '', unidad_medida: '', stock_minimo: 5
    });
  }
  modalInsumo.value = true;
};

const guardarInsumo = async () => {
  if (!insumo.nombre || !insumo.categoria) {
    return notif.alerta('Indique el nombre y la categoría del insumo');
  }
  procesando.value = true;
  try {
    const carga = {
      nombre: insumo.nombre.trim(),
      categoria: insumo.categoria,
      unidad_medida: insumo.unidad_medida || null,
      stock_minimo: insumo.stock_minimo ?? 5
    };
    const { data } = insumo.id
      ? await inventario.editarInsumo(insumo.id, carga)
      : await inventario.crearInsumo(carga);

    notif.exito(data.mensaje);
    modalInsumo.value = false;
    cargar();
  } catch (e) {
    notif.error(e.response?.data?.mensaje || 'No se pudo guardar el insumo');
  } finally {
    procesando.value = false;
  }
};

const confirmarEliminar = (i) => {
  insumoEliminar.value = i;
  modalEliminar.value = true;
};

const eliminarInsumo = async () => {
  procesando.value = true;
  try {
    const { data } = await inventario.eliminarInsumo(insumoEliminar.value.id);
    notif.exito(data.mensaje);
    modalEliminar.value = false;
    cargar();
  } catch (e) {
    notif.error(e.response?.data?.mensaje || 'No se pudo eliminar el insumo');
  } finally {
    procesando.value = false;
  }
};

// ── ENTRADA Y SALIDA ────────────────────────────
const abrirEntrada = () => {
  Object.assign(entrada, { insumo_id:'', cantidad:null, numero_lote:'',
                           fecha_vencimiento:'', observaciones:'' });
  modalEntrada.value = true;
};

const abrirSalida = async () => {
  Object.assign(salida, { insumo_id:'', cantidad:null, emergencia_id:'', observaciones:'' });
  try {
    const { data } = await emergencias.paraVinculo();
    serviciosVinculo.value = data;
  } catch { /* silencioso */ }
  modalSalida.value = true;
};

const guardarEntrada = async () => {
  if (!entrada.insumo_id || !entrada.cantidad) {
    return notif.alerta('Seleccione el insumo e indique la cantidad');
  }
  if (entrada.fecha_vencimiento && entrada.fecha_vencimiento < hoy) {
    return notif.alerta('La fecha de vencimiento no puede ser anterior a hoy');
  }
  procesando.value = true;
  try {
    const { data } = await inventario.entrada({
      ...entrada,
      numero_lote: entrada.numero_lote || null,
      fecha_vencimiento: entrada.fecha_vencimiento || null
    });
    notif.exito(`Entrada registrada. ${data.insumo.nombre}: ${data.insumo.stock_actual}`);
    modalEntrada.value = false;
    cargar();
  } catch (e) {
    notif.error(e.response?.data?.mensaje || 'No se pudo registrar la entrada');
  } finally {
    procesando.value = false;
  }
};

const guardarSalida = async () => {
  if (!salida.insumo_id || !salida.cantidad) {
    return notif.alerta('Seleccione el insumo e indique la cantidad');
  }
  if (!salida.emergencia_id) {
    return notif.alerta('Debe vincular la salida a un servicio de emergencia');
  }
  procesando.value = true;
  try {
    const { data } = await inventario.salida(salida);
    notif.exito(`Salida registrada. ${data.insumo.nombre}: ${data.insumo.stock_actual}`);
    if (data.alerta) notif.alerta(data.alerta);
    modalSalida.value = false;
    cargar();
  } catch (e) {
    notif.error(e.response?.data?.mensaje || 'No se pudo registrar la salida');
  } finally {
    procesando.value = false;
  }
};

onMounted(cargar);
</script>

<style scoped>
.aviso-alertas {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 16px; margin-bottom: 16px;
  background: var(--alerta-fondo); color: var(--alerta);
  border: 1px solid currentColor;
  border-radius: var(--radio);
  font-size: 13.5px;
}
.aviso-alertas svg { flex-shrink: 0; }

.barra-filtros {
  display: flex; align-items: center; justify-content: space-between;
  gap: 14px; margin-bottom: 16px; flex-wrap: wrap;
}

.pestanas {
  display: flex; gap: 4px;
  padding: 4px;
  background: var(--superficie-alt);
  border: 1px solid var(--borde);
  border-radius: var(--radio);
}
.pestana {
  padding: 7px 14px;
  background: transparent; border: none; border-radius: var(--radio-sm);
  color: var(--texto-suave);
  font: inherit; font-size: 12.5px; font-weight: 500;
  cursor: pointer;
  transition: all var(--transicion);
}
.pestana:hover { color: var(--texto); }
.pestana.activa {
  background: var(--superficie); color: var(--rojo-bomberos);
  box-shadow: var(--sombra-sm);
}

.control-estado   { width: auto; min-width: 170px; }
.control-busqueda { width: auto; min-width: 190px; }

.estado-carga {
  display: flex; flex-direction: column; align-items: center; gap: 13px; padding: 56px;
}
.estado-carga p { color: var(--texto-suave); font-size: 13.5px; }

.capitalizar { text-transform: capitalize; }

.acciones-fila { display: flex; gap: 5px; }
.btn-accion {
  display: flex; padding: 6px;
  background: transparent;
  border: 1px solid var(--borde);
  border-radius: var(--radio-sm);
  color: var(--texto-suave);
  cursor: pointer;
  transition: all var(--transicion);
}
.btn-accion:hover {
  background: var(--superficie-alt);
  border-color: var(--texto-tenue);
  color: var(--texto);
}
.btn-accion-peligro:hover {
  background: var(--peligro-fondo);
  border-color: var(--peligro);
  color: var(--peligro);
}

.nota-info {
  display: flex; align-items: flex-start; gap: 9px;
  padding: 11px 14px; margin-bottom: 18px;
  background: var(--info-fondo); color: var(--info);
  border-radius: var(--radio);
  font-size: 12.5px; line-height: 1.5;
}
.nota-info svg { flex-shrink: 0; margin-top: 1px; }

.ayuda {
  display: block; margin-top: 5px;
  font-size: 11.5px; color: var(--texto-tenue);
}

.texto-eliminar { font-size: 14px; color: var(--texto); }
.texto-eliminar strong { color: var(--peligro); }
.nota-eliminar {
  margin-top: 10px; padding: 10px 13px;
  background: var(--superficie-alt);
  border-radius: var(--radio);
  font-size: 12.5px; line-height: 1.5;
  color: var(--texto-suave);
}

@media (max-width: 900px) {
  .pestanas { width: 100%; overflow-x: auto; }
  .control-estado, .control-busqueda { width: 100%; }
}
</style>