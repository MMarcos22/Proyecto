<template>
  <Modal :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" :titulo="TITULOS[tipo]" ancho="900px">
    <p class="suave mb">{{ AYUDAS[tipo] }}</p>

    <div class="rejilla rejilla-3">
      <div class="campo">
        <label for="doc-fecha">Fecha</label>
        <input id="doc-fecha" v-model="f.fecha" type="date" class="control mono" :max="hoy()" />
      </div>

      <template v-if="tipo === 'entrada'">
        <div class="campo ancho-2">
          <label for="doc-origen">¿De dónde viene?</label>
          <select id="doc-origen" v-model="f.origen" class="control">
            <option v-for="(n, v) in catalogos.dominio?.ORIGENES_ENTRADA" :key="v" :value="v">{{ n }}</option>
          </select>
        </div>
        <div class="campo"><label for="doc-const">Constancia o factura</label><input id="doc-const" v-model="f.constancia" class="control" placeholder="Número de la constancia de ingreso" /></div>
        <div v-if="f.origen === 'donacion'" class="campo"><label for="doc-don">Donante</label><input id="doc-don" v-model="f.donante" class="control" /></div>
      </template>

      <template v-if="tipo === 'vale'">
        <div class="campo ancho-2">
          <label for="doc-cat">Categoría <span class="req">*</span> <span class="opcional">un vale por categoría, como la hoja de papel</span></label>
          <select id="doc-cat" v-model="f.categoria" class="control" @change="cambiarCategoria(f.categoria)">
            <option :value="null" disabled>Elija…</option>
            <option v-for="c in catalogos.categorias" :key="c.valor" :value="c.valor">{{ c.nombre }}</option>
          </select>
        </div>
        <div class="campo">
          <label for="doc-esc">Escuadra <span class="req">*</span></label>
          <select id="doc-esc" v-model="f.escuadra_id" class="control">
            <option :value="null" disabled>Elija…</option>
            <option v-for="e in catalogos.escuadras" :key="e.id" :value="e.id">{{ e.nombre }}</option>
          </select>
        </div>
        <div class="campo">
          <label for="doc-recibe">Recibido por <span class="req">*</span></label>
          <select id="doc-recibe" v-model="f.recibe_id" class="control" :disabled="!f.escuadra_id">
            <option :value="null">{{ f.escuadra_id ? 'Elija…' : 'Primero elija la escuadra' }}</option>
            <option v-for="p in personalOrdenado" :key="p.id" :value="p.id">{{ p.nombre_completo }}</option>
          </select>
          <span v-if="f.escuadra_id && !personalOrdenado.length" class="ayuda">Esa escuadra no tiene personal registrado. Asígnelo en Configuración › Catálogos › Personal.</span>
        </div>
        <div class="campo"><label for="doc-entrega">Entregado por <span class="req">*</span></label><input id="doc-entrega" v-model="f.entrega" class="control" /></div>
      </template>

      <template v-if="tipo === 'baja'">
        <div class="campo ancho-2">
          <label for="doc-motivo">Motivo de la baja <span class="req">*</span></label>
          <select id="doc-motivo" v-model="f.motivo_baja" class="control">
            <option :value="null" disabled>Elija…</option>
            <option value="vencimiento">Vencimiento</option>
            <option value="dano">Daño o pérdida</option>
          </select>
        </div>
      </template>
    </div>

    <div v-if="tipo === 'baja' || tipo === 'ajuste'" class="campo">
      <label for="doc-obs">{{ tipo === 'ajuste' ? 'Motivo del ajuste' : 'Observaciones' }}<span v-if="tipo === 'ajuste'" class="req">*</span></label>
      <input id="doc-obs" v-model="f.observaciones" class="control" :placeholder="tipo === 'ajuste' ? 'Ej.: conteo físico del 31 de octubre' : 'Ej.: lote enviado a destrucción'" />
    </div>

    <!-- ══ LÍNEAS ════════════════════════════════════ -->
    <div class="lineas">
      <div class="lineas-cabecera">
        <span>Insumo</span><span>Cantidad</span><span v-if="pideLote">Lote y vencimiento</span><span></span>
      </div>
      <div v-for="(l, i) in f.lineas" :key="i" class="linea">
        <select v-model="l.insumo_id" class="control control-sm" :aria-label="`Insumo de la línea ${i + 1}`">
          <option :value="null">Elija un insumo…</option>
          <optgroup v-for="g in insumosAgrupados" :key="g.categoria" :label="g.nombre">
            <option v-for="x in g.insumos" :key="x.id" :value="x.id" :disabled="esSalida && !x.stock_actual">
              {{ x.nombre }}{{ esSalida ? ` (${x.stock_actual} ${x.unidad_medida || ''})` : '' }}
            </option>
          </optgroup>
        </select>
        <div class="cantidad">
          <input v-model.number="l.cantidad" type="number" :min="tipo === 'ajuste' ? undefined : 1" class="control control-sm num" :aria-label="`Cantidad de la línea ${i + 1}`" />
          <label v-if="insumo(l)?.presentacion && insumo(l).factor_presentacion > 1" class="presentacion">
            <input type="checkbox" v-model="l.en_presentacion" />en {{ insumo(l).presentacion }} de {{ insumo(l).factor_presentacion }}
          </label>
          <span v-else class="tenue unidad">{{ insumo(l)?.unidad_medida || '' }}</span>
        </div>
        <div v-if="pideLote || l.lote_id" class="lote">
          <template v-if="!esSalida || (tipo === 'ajuste' && l.cantidad > 0)">
            <input v-model="l.numero_lote" class="control control-sm mono" placeholder="Lote" :aria-label="`Lote de la línea ${i + 1}`"
                   :class="{ error: faltaLote(l) }" />
            <input v-model="l.fecha_vencimiento" type="date" class="control control-sm mono" :aria-label="`Vencimiento de la línea ${i + 1}`"
                   :class="{ error: faltaLote(l) }" />
          </template>
          <span v-else class="tenue">{{ l.lote_id ? 'Lote indicado' : 'Se toma el lote que vence primero' }}</span>
        </div>
        <button type="button" class="btn btn-plano btn-icono btn-sm" @click="f.lineas.splice(i, 1)" :disabled="f.lineas.length === 1" aria-label="Quitar línea"><Icono nombre="papelera" :tam="15" /></button>
      </div>
      <button type="button" class="btn btn-plano btn-sm" @click="agregarLinea"><Icono nombre="mas" :tam="14" />Agregar otro insumo</button>
    </div>

    <div v-if="mesCerrado" class="campo mt">
      <label for="doc-just">Ese mes ya se cerró. ¿Por qué se registra ahora?</label>
      <input id="doc-just" v-model="f.justificacion" class="control" />
    </div>

    <p v-if="falta" class="falta"><Icono nombre="info" :tam="16" />{{ falta }}</p>

    <template #acciones>
      <button class="btn btn-secundario" @click="$emit('update:modelValue', false)">Cancelar</button>
      <button class="btn btn-primario" :disabled="!!falta || guardando" @click="guardar">
        <span v-if="guardando" class="cargador"></span>Registrar {{ TITULOS[tipo].toLowerCase() }}
      </button>
    </template>
  </Modal>
</template>

<script setup>
import { reactive, ref, computed, watch } from 'vue';
import { inventario, mensajeError } from '../../services/api';
import { useCatalogosStore } from '../../stores/catalogos';
import { useAuthStore } from '../../stores/auth';
import { useNotificacionesStore } from '../../stores/notificaciones';
import { hoy } from '../../utils/formato';
import Modal from '../Modal.vue';
import Icono from '../Icono.vue';

// inicial: datos para abrir el documento ya preparado (p. ej. la baja de un lote vencido)
const props = defineProps({ modelValue: Boolean, tipo: { type: String, default: 'entrada' }, inicial: { type: Object, default: null } });
const emit = defineEmits(['update:modelValue', 'guardado']);
const catalogos = useCatalogosStore();
const auth = useAuthStore();
const notif = useNotificacionesStore();

const TITULOS = { entrada: 'Entrada', vale: 'Vale de entrega', baja: 'Baja', ajuste: 'Ajuste por conteo' };
const AYUDAS = {
  entrada: 'Lo que llega a bodega, con su constancia. Los insumos que vencen piden lote y fecha de vencimiento.',
  vale: 'Lo que retira la comisión de la escuadra. Se imprime con el formato de siempre para la firma de recibido.',
  baja: 'Lo que sale de bodega sin usarse: lotes vencidos, daños o pérdidas.',
  ajuste: 'Diferencia entre el conteo físico y lo registrado: positivo si sobra, negativo si falta.'
};

const insumos = ref([]);
const cierres = ref([]);
const guardando = ref(false);
const nueva = () => ({ insumo_id: null, cantidad: 1, en_presentacion: false, numero_lote: '', fecha_vencimiento: '' });
const f = reactive({});
const reiniciar = () => Object.assign(f, {
  fecha: hoy(), origen: 'envio_capital', constancia: '', donante: '', categoria: null, escuadra_id: null,
  recibe_id: null, entrega: auth.usuario?.nombre || '', motivo_baja: null, observaciones: '', justificacion: '', lineas: [nueva()]
});
reiniciar();

const esSalida = computed(() => ['vale', 'baja', 'ajuste'].includes(props.tipo));
const pideLote = computed(() => props.tipo === 'entrada' || props.tipo === 'ajuste');
const insumo = (l) => insumos.value.find(x => x.id === l.insumo_id);
const faltaLote = (l) => props.tipo === 'entrada' && f.origen !== 'inventario_inicial' && insumo(l)?.clase === 'consumible_vence' && (!l.numero_lote?.trim() || !l.fecha_vencimiento);

const insumosAgrupados = computed(() => catalogos.categorias
  .filter(c => !f.categoria || c.valor === f.categoria)
  .map(c => ({ categoria: c.valor, nombre: c.nombre, insumos: insumos.value.filter(i => i.categoria === c.valor && (props.tipo !== 'vale' || i.clase !== 'equipo')) }))
  .filter(g => g.insumos.length));

// Recibe solo alguien de la escuadra del vale
const personalOrdenado = computed(() => catalogos.personal
  .filter(p => f.escuadra_id && p.escuadra_id === f.escuadra_id)
  .sort((a, b) => a.nombre_completo.localeCompare(b.nombre_completo)));
// Al cambiar de escuadra, quien recibía deja de valer si no es de la nueva
watch(() => f.escuadra_id, () => {
  if (f.recibe_id && !personalOrdenado.value.some(p => p.id === f.recibe_id)) f.recibe_id = null;
});

const mesCerrado = computed(() => cierres.value.some(c => c.anio === Number(f.fecha?.slice(0, 4)) && c.mes === Number(f.fecha?.slice(5, 7))));

const falta = computed(() => {
  const lineas = f.lineas.filter(l => l.insumo_id);
  if (!lineas.length) return 'Agregue al menos un insumo';
  if (lineas.some(l => !l.cantidad || (props.tipo !== 'ajuste' && l.cantidad < 0))) return 'Revise las cantidades';
  if (props.tipo === 'vale' && (!f.categoria || !f.escuadra_id || !f.recibe_id || !f.entrega.trim())) return 'El vale necesita categoría, escuadra, quién recibe y quién entrega';
  if (props.tipo === 'baja' && !f.motivo_baja) return 'Indique el motivo de la baja';
  if (props.tipo === 'ajuste' && !f.observaciones.trim()) return 'Explique el motivo del ajuste';
  if (lineas.some(faltaLote)) return 'Los insumos que vencen necesitan lote y fecha de vencimiento';
  if (mesCerrado.value && !f.justificacion.trim()) return 'Explique por qué se registra en un mes cerrado';
  return '';
});

const cambiarCategoria = (c) => {
  f.categoria = c;
  f.lineas = f.lineas.filter(l => !l.insumo_id || insumo(l)?.categoria === c);
  if (!f.lineas.length) f.lineas.push(nueva());
};
const agregarLinea = () => f.lineas.push(nueva());

const guardar = async () => {
  guardando.value = true;
  try {
    const { data } = await inventario.registrarDocumento({ ...f, tipo: props.tipo, lineas: f.lineas.filter(l => l.insumo_id) });
    notif.exito(data.mensaje);
    for (const a of data.alertas || []) notif.alerta(a);
    emit('guardado', data);
    emit('update:modelValue', false);
  } catch (e) {
    notif.error(mensajeError(e, 'No se pudo registrar el documento'));
  } finally {
    guardando.value = false;
  }
};

watch(() => props.modelValue, async (abierto) => {
  if (!abierto) return;
  reiniciar();
  if (props.inicial) {
    const { lineas, ...resto } = props.inicial;
    Object.assign(f, resto);
    if (lineas?.length) f.lineas = lineas.map(l => ({ ...nueva(), ...l }));
  }
  try {
    const [i, c] = await Promise.all([inventario.listar(), inventario.cierres(), catalogos.cargar()]);
    insumos.value = i.data.insumos;
    cierres.value = c.data;
  } catch { /* listas vacías */ }
});
</script>

<style scoped>
.ancho-2 { grid-column: span 2; }
.lineas { margin-top: 6px; border: 1px solid var(--borde); border-radius: var(--radio-lg); padding: 12px 14px; }
.lineas-cabecera, .linea { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1.2fr) minmax(0, 1.6fr) 40px; gap: 10px; align-items: center; }
.lineas-cabecera { font-size: 13px; font-weight: 600; color: var(--texto-suave); padding-bottom: 6px; }
.linea { padding: 6px 0; border-bottom: 1px solid var(--borde); }
.cantidad { display: flex; align-items: center; gap: 8px; }
.cantidad .control { max-width: 90px; }
.presentacion { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--texto-suave); white-space: nowrap; }
.unidad { font-size: 13px; }
.lote { display: flex; gap: 8px; }
.lote .tenue { font-size: 13px; }
.lineas > .btn { margin-top: 8px; }
.falta { display: flex; align-items: center; gap: 8px; margin-top: 12px; font-weight: 600; color: var(--texto-suave); }
@media (max-width: 760px) {
  .ancho-2 { grid-column: auto; }
  .lineas-cabecera { display: none; }
  .linea { grid-template-columns: 1fr; }
}
</style>
