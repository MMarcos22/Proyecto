<template>
  <div class="animar">
    <div v-if="!datos && cargando" class="vacio"><span class="cargador cargador-oscuro" style="display:inline-block"></span></div>

    <template v-else-if="datos">
      <div class="titulo-seccion">
        <div>
          <router-link to="/inventario" class="volver"><Icono nombre="flecha_izq" :tam="13" />Existencias</router-link>
          <h1>{{ ins.nombre }}</h1>
          <p class="sub">{{ catalogos.nombreCategoria(ins.categoria) }} · medido en {{ ins.unidad_medida || 'unidades' }}</p>
        </div>
        <div v-if="auth.esAdministrador" class="acciones">
          <button class="btn btn-secundario" @click="abrir('vale')" :disabled="!ins.stock_actual || ins.clase === 'equipo'"><Icono nombre="salida" :tam="15" />Vale de entrega</button>
          <button class="btn btn-primario" @click="abrir('entrada')"><Icono nombre="entrada" :tam="15" />Entrada</button>
        </div>
      </div>

      <section class="indicadores mb">
        <div class="indicador" :class="{ critico: ins.stock_actual === 0, atencion: ins.stock_actual > 0 && ins.stock_actual <= ins.stock_minimo }">
          <span class="rotulo">Existencia</span>
          <div class="valor">{{ ins.stock_actual }}<small>{{ ins.unidad_medida }}</small></div>
          <div class="pie">mínimo {{ ins.stock_minimo }}</div>
        </div>
        <div class="indicador">
          <span class="rotulo">Lotes con saldo</span>
          <div class="valor">{{ lotesVigentes.length }}</div>
          <div class="pie">{{ lotesVencidos ? `${lotesVencidos} vencido(s)` : 'ninguno vencido' }}</div>
        </div>
        <div class="indicador">
          <span class="rotulo">Entradas</span>
          <div class="valor">{{ totales.entradas }}</div>
          <div class="pie">en el periodo mostrado</div>
        </div>
        <div class="indicador">
          <span class="rotulo">Salidas</span>
          <div class="valor">{{ totales.salidas }}</div>
          <div class="pie">{{ totales.servicios }} en servicios de emergencia</div>
        </div>
      </section>

      <section class="tarjeta mb">
        <div class="tarjeta-cabecera">
          <h3>Lotes</h3>
          <label class="interruptor"><input type="checkbox" v-model="verAgotados" /> Mostrar lotes agotados</label>
        </div>
        <div class="tabla-contenedor">
          <table>
            <thead><tr><th>Lote</th><th>Ingreso</th><th>Vencimiento</th><th class="num">Inicial</th><th class="num">Saldo</th><th style="width:180px">Consumido</th><th></th></tr></thead>
            <tbody>
              <tr v-for="l in lotesMostrados" :key="l.id" :class="{ atenuada: !l.saldo }">
                <td class="mono celda-principal">{{ l.numero_lote || 'Sin número' }}</td>
                <td class="mono">{{ fecha(l.fecha_ingreso) }}</td>
                <td class="mono" :class="claseVenc(l)">
                  {{ l.fecha_vencimiento ? fecha(l.fecha_vencimiento) : '—' }}
                  <span v-if="l.fecha_vencimiento && l.saldo" class="celda-sec">{{ textoDias(l.dias_restantes) }}</span>
                </td>
                <td class="num">{{ l.cantidad_inicial }}</td>
                <td class="num"><strong>{{ l.saldo }}</strong></td>
                <td><div class="barra"><span :style="{ width: (100 - (l.saldo / l.cantidad_inicial) * 100) + '%' }"></span></div></td>
                <td class="der">
                  <button v-if="auth.esAdministrador && l.saldo && l.dias_restantes < 0" class="btn btn-peligro btn-sm" @click="darBaja(l)">Dar de baja</button>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-if="!lotesMostrados.length" class="vacio vacio-compacto"><p>Sin lotes registrados. Cada entrada crea un lote.</p></div>
        </div>
      </section>

      <section class="tarjeta">
        <div class="tarjeta-cabecera">
          <h3>Movimientos</h3>
          <div class="fila">
            <input v-model="desde" type="date" class="control control-sm mono" aria-label="Desde" />
            <span class="tenue">a</span>
            <input v-model="hasta" type="date" class="control control-sm mono" aria-label="Hasta" />
          </div>
        </div>
        <div class="tabla-contenedor">
          <table>
            <thead>
              <tr><th>Fecha</th><th>Movimiento</th><th>Lote</th><th>Referencia</th><th class="num">Entra</th><th class="num">Sale</th><th class="num">Saldo</th><th>Registró</th></tr>
            </thead>
            <tbody>
              <tr v-for="m in movimientosOrdenados" :key="m.id">
                <td class="mono">{{ fecha(m.fecha_movimiento) }}</td>
                <td><span class="mov" :class="m.tipo_movimiento">{{ catalogos.nombreMotivo(m.tipo_movimiento, m.motivo) }}</span></td>
                <td class="mono">{{ m.numero_lote || '—' }}</td>
                <td>
                  <router-link v-if="m.emergencia_id" :to="`/historial/${m.emergencia_id}`" class="mono enlace-ref">{{ m.servicio }}</router-link>
                  <span v-else-if="m.documento" class="mono">{{ m.documento }}</span>
                  <span v-else class="tenue">{{ m.observaciones || '—' }}</span>
                </td>
                <td class="num entra">{{ m.tipo_movimiento === 'entrada' ? m.cantidad : '' }}</td>
                <td class="num sale">{{ m.tipo_movimiento === 'salida' ? m.cantidad : '' }}</td>
                <td class="num"><strong>{{ m.saldo }}</strong></td>
                <td class="suave">{{ m.registrado_por }}</td>
              </tr>
            </tbody>
          </table>
          <div v-if="!movimientosOrdenados.length" class="vacio vacio-compacto"><p>Sin movimientos en el periodo.</p></div>
        </div>
      </section>
    </template>

    <DocumentoModal v-model="modal" :tipo="tipo" :inicial="inicial" @guardado="cargar" />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { inventario, mensajeError } from '../services/api';
import { useCatalogosStore } from '../stores/catalogos';
import { useNotificacionesStore } from '../stores/notificaciones';
import { useAlertasStore } from '../stores/alertas';
import { fecha } from '../utils/formato';
import DocumentoModal from '../components/inventario/DocumentoModal.vue';
import { useAuthStore } from '../stores/auth';
import Icono from '../components/Icono.vue';

const ruta = useRoute();
const catalogos = useCatalogosStore();
const notif = useNotificacionesStore();
const alertas = useAlertasStore();

const datos = ref(null);
const lotes = ref([]);
const cargando = ref(true);
const verAgotados = ref(false);
const desde = ref('');
const hasta = ref('');
const auth = useAuthStore();
const modal = ref(false);
const tipo = ref('entrada');
const inicial = ref(null);

const ins = computed(() => datos.value?.insumo || {});
const lotesVigentes = computed(() => lotes.value.filter(l => l.saldo > 0));
const lotesVencidos = computed(() => lotesVigentes.value.filter(l => l.dias_restantes < 0).length);
const lotesMostrados = computed(() => (verAgotados.value ? lotes.value : lotesVigentes.value));
const movimientosOrdenados = computed(() => [...(datos.value?.movimientos || [])].reverse());
const totales = computed(() => {
  const m = datos.value?.movimientos || [];
  const sum = (fn) => m.filter(fn).reduce((a, x) => a + x.cantidad, 0);
  return {
    entradas: sum(x => x.tipo_movimiento === 'entrada'),
    salidas: sum(x => x.tipo_movimiento === 'salida'),
    servicios: sum(x => x.motivo === 'consumo_servicio')
  };
});

const textoDias = (d) => (d < 0 ? `vencido hace ${-d} d` : d === 0 ? 'vence hoy' : `en ${d} d`);
const claseVenc = (l) => (!l.saldo || l.dias_restantes == null ? '' : l.dias_restantes < 0 ? 'vencido' : l.dias_restantes <= 30 ? 'critico' : '');

const cargar = async () => {
  cargando.value = true;
  try {
    const [k, l] = await Promise.all([
      inventario.kardex(ruta.params.id, { desde: desde.value || undefined, hasta: hasta.value || undefined }),
      inventario.lotes({ insumo_id: ruta.params.id })
    ]);
    datos.value = k.data;
    lotes.value = l.data.lotes;
  } catch (e) {
    notif.error(mensajeError(e, 'No se pudo cargar el kardex'));
  } finally {
    cargando.value = false;
  }
};

// Abre el documento con este insumo ya puesto
const abrir = (t, extra = {}) => {
  tipo.value = t;
  inicial.value = { categoria: t === 'vale' ? ins.value.categoria : null, lineas: [{ insumo_id: ins.value.id, cantidad: 1 }], ...extra };
  modal.value = true;
};
const darBaja = (l) => abrir('baja', { motivo_baja: 'vencimiento', observaciones: `Lote ${l.numero_lote || 's/n'} vencido`, lineas: [{ insumo_id: ins.value.id, cantidad: l.saldo, lote_id: l.id }] });


watch([desde, hasta], cargar);
onMounted(() => {
  catalogos.cargar().catch(() => {});
  cargar();
});
</script>

<style scoped>
.volver { display: inline-flex; align-items: center; gap: 5px; margin-bottom: 6px; font-size: 12px; font-weight: 600; color: var(--texto-tenue); text-decoration: none; }
.volver:hover { color: var(--texto); }
.interruptor { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--texto-suave); cursor: pointer; }
.vacio-compacto { padding: 20px; }
.vencido { color: var(--peligro); font-weight: 600; }
.critico { color: var(--alerta); font-weight: 600; }
.mov { font-size: 12.5px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; }
.mov::before { content: ''; width: 0; height: 0; border-left: 4px solid transparent; border-right: 4px solid transparent; }
.mov.entrada::before { border-bottom: 6px solid var(--exito); }
.mov.salida::before { border-top: 6px solid var(--peligro); }
.entra { color: var(--exito); }
.sale { color: var(--peligro); }
.enlace-ref { font-size: 12px; font-weight: 600; }
</style>
