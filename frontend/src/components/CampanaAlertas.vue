<template>
  <div class="campana-contenedor" ref="contenedor">
    <button class="btn-campana" :class="{ activa: abierto }" @click="alternar">
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 01-3.46 0"/>
      </svg>
      <transition name="pulso">
        <span v-if="total > 0" class="contador">{{ total > 99 ? '99+' : total }}</span>
      </transition>
    </button>

    <transition name="panel">
      <div v-if="abierto" class="panel-alertas">
        <div class="panel-cabecera">
          <h3>Alertas de inventario</h3>
          <button class="btn-cerrar" @click="abierto = false">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div class="panel-cuerpo">
          <div v-if="alertas.cargando" class="panel-carga">
            <span class="cargador cargador-oscuro"></span>
          </div>

          <div v-else-if="total === 0" class="panel-vacio">
            <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <p>Todo el inventario se encuentra en orden</p>
          </div>

          <template v-else>
            <div v-if="d.insumos_agotados.length" class="seccion-alerta">
              <div class="seccion-cabecera sc-peligro">
                <span class="indicador"></span>
                <span>Insumos agotados</span>
                <strong>{{ d.insumos_agotados.length }}</strong>
              </div>
              <div v-for="i in d.insumos_agotados.slice(0,5)" :key="'a'+i.id" class="fila-alerta">
                <div class="fila-datos">
                  <strong>{{ i.nombre }}</strong>
                  <span class="capitalizar">{{ i.categoria }}</span>
                </div>
                <span class="etiqueta et-peligro">0</span>
              </div>
              <p v-if="d.insumos_agotados.length > 5" class="mas">
                y {{ d.insumos_agotados.length - 5 }} más
              </p>
            </div>

            <div v-if="d.lotes_vencidos.length" class="seccion-alerta">
              <div class="seccion-cabecera sc-peligro">
                <span class="indicador"></span>
                <span>Lotes vencidos</span>
                <strong>{{ d.lotes_vencidos.length }}</strong>
              </div>
              <div v-for="l in d.lotes_vencidos.slice(0,5)" :key="'v'+l.numero_lote" class="fila-alerta">
                <div class="fila-datos">
                  <strong>{{ l.nombre }}</strong>
                  <span>Lote {{ l.numero_lote || '—' }} · venció hace {{ Math.abs(l.dias_restantes) }} días</span>
                </div>
                <span class="etiqueta et-peligro">Vencido</span>
              </div>
            </div>

            <div v-if="d.existencia_baja.length" class="seccion-alerta">
              <div class="seccion-cabecera sc-alerta">
                <span class="indicador"></span>
                <span>Existencia baja</span>
                <strong>{{ d.existencia_baja.length }}</strong>
              </div>
              <div v-for="i in d.existencia_baja.slice(0,5)" :key="'b'+i.id" class="fila-alerta">
                <div class="fila-datos">
                  <strong>{{ i.nombre }}</strong>
                  <span>Mínimo requerido: {{ i.stock_minimo }}</span>
                </div>
                <span class="etiqueta et-alerta">{{ i.stock_actual }}</span>
              </div>
              <p v-if="d.existencia_baja.length > 5" class="mas">
                y {{ d.existencia_baja.length - 5 }} más
              </p>
            </div>

            <div v-if="d.lotes_por_vencer.length" class="seccion-alerta">
              <div class="seccion-cabecera sc-info">
                <span class="indicador"></span>
                <span>Próximos a vencer</span>
                <strong>{{ d.lotes_por_vencer.length }}</strong>
              </div>
              <div v-for="l in d.lotes_por_vencer.slice(0,5)" :key="'p'+l.numero_lote" class="fila-alerta">
                <div class="fila-datos">
                  <strong>{{ l.nombre }}</strong>
                  <span>Lote {{ l.numero_lote || '—' }} · {{ formatoFecha(l.fecha_vencimiento) }}</span>
                </div>
                <span class="etiqueta" :class="l.dias_restantes <= 30 ? 'et-alerta' : 'et-info'">
                  {{ l.dias_restantes }} días
                </span>
              </div>
              <p v-if="d.lotes_por_vencer.length > 5" class="mas">
                y {{ d.lotes_por_vencer.length - 5 }} más
              </p>
            </div>
          </template>
        </div>

        <div class="panel-pie">
          <router-link to="/inventario" class="btn btn-plano btn-sm" @click="abierto = false">
            Ver inventario completo
          </router-link>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useAlertasStore } from '../stores/alertas';

const alertas = useAlertasStore();
const abierto = ref(false);
const contenedor = ref(null);

const d = computed(() => alertas.datos);
const total = computed(() => alertas.datos.resumen.total);

const alternar = () => {
  abierto.value = !abierto.value;
  if (abierto.value) alertas.cargar();
};

const formatoFecha = (f) => new Date(f).toLocaleDateString('es-GT',
  { day:'2-digit', month:'short', year:'numeric', timeZone:'UTC' });

const clicFuera = (e) => {
  if (contenedor.value && !contenedor.value.contains(e.target)) abierto.value = false;
};

let intervalo = null;

onMounted(() => {
  alertas.cargar();
  document.addEventListener('click', clicFuera);
  intervalo = setInterval(() => alertas.cargar(), 300000);
});

onUnmounted(() => {
  document.removeEventListener('click', clicFuera);
  if (intervalo) clearInterval(intervalo);
});
</script>

<style scoped>
.campana-contenedor { position: relative; }

.btn-campana {
  position: relative;
  width: 36px; height: 36px;
  display: flex; align-items: center; justify-content: center;
  background: var(--superficie-alt);
  border: 1px solid var(--borde);
  border-radius: var(--radio);
  color: var(--texto-suave);
  cursor: pointer;
  transition: all var(--transicion);
}
.btn-campana:hover, .btn-campana.activa {
  color: var(--rojo-bomberos);
  border-color: var(--rojo-bomberos);
  background: var(--peligro-fondo);
}

.contador {
  position: absolute; top: -5px; right: -5px;
  min-width: 18px; height: 18px;
  display: flex; align-items: center; justify-content: center;
  padding: 0 5px;
  background: var(--rojo-bomberos); color: #fff;
  font-size: 10px; font-weight: 700;
  border-radius: 99px;
  border: 2px solid var(--superficie);
}

.panel-alertas {
  position: absolute; top: calc(100% + 10px); right: 0;
  width: 380px; max-height: 520px;
  display: flex; flex-direction: column;
  background: var(--superficie);
  border: 1px solid var(--borde);
  border-radius: var(--radio-lg);
  box-shadow: var(--sombra-lg);
  overflow: hidden;
  z-index: 100;
}

.panel-cabecera {
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid var(--borde);
  flex-shrink: 0;
}
.panel-cabecera h3 { font-size: 14.5px; }
.btn-cerrar {
  display: flex; padding: 5px;
  background: none; border: none; border-radius: var(--radio-sm);
  color: var(--texto-tenue); cursor: pointer;
}
.btn-cerrar:hover { background: var(--superficie-alt); color: var(--texto); }

.panel-cuerpo { overflow-y: auto; flex: 1; }

.panel-carga, .panel-vacio {
  display: flex; flex-direction: column; align-items: center;
  gap: 12px; padding: 44px 24px;
  color: var(--texto-tenue);
}
.panel-vacio svg { opacity: .4; }
.panel-vacio p { font-size: 13px; text-align: center; }

.seccion-alerta { border-bottom: 1px solid var(--borde); }
.seccion-alerta:last-child { border-bottom: none; }

.seccion-cabecera {
  display: flex; align-items: center; gap: 8px;
  padding: 9px 18px;
  background: var(--superficie-alt);
  font-size: 11.5px; font-weight: 600;
  text-transform: uppercase; letter-spacing: .04em;
}
.seccion-cabecera strong { margin-left: auto; font-size: 12px; }
.indicador { width: 7px; height: 7px; border-radius: 50%; }
.sc-peligro { color: var(--peligro); }
.sc-peligro .indicador { background: var(--peligro); }
.sc-alerta  { color: var(--alerta); }
.sc-alerta  .indicador { background: var(--alerta); }
.sc-info    { color: var(--info); }
.sc-info    .indicador { background: var(--info); }

.fila-alerta {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 18px;
  transition: background var(--transicion);
}
.fila-alerta:hover { background: var(--superficie-alt); }
.fila-datos { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.fila-datos strong {
  font-size: 13px; font-weight: 500;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.fila-datos span { font-size: 11.5px; color: var(--texto-tenue); }

.mas {
  padding: 6px 18px 10px;
  font-size: 11.5px; color: var(--texto-tenue); font-style: italic;
}

.panel-pie {
  padding: 10px 14px;
  border-top: 1px solid var(--borde);
  background: var(--superficie-alt);
  flex-shrink: 0;
}
.panel-pie .btn { width: 100%; justify-content: center; }

.capitalizar { text-transform: capitalize; }

.panel-enter-active { animation: escalar 220ms cubic-bezier(.2,.9,.3,1.1) both; }
.panel-leave-active { transition: all 150ms ease; }
.panel-leave-to { opacity: 0; transform: scale(.97) translateY(-6px); }

.pulso-enter-active { animation: brincar 420ms cubic-bezier(.2,.9,.3,1.3) both; }
@keyframes brincar {
  0%   { transform: scale(0); opacity: 0; }
  60%  { transform: scale(1.25); }
  100% { transform: scale(1); opacity: 1; }
}

@media (max-width: 480px) {
  .panel-alertas {
    position: fixed; top: 64px; left: 12px; right: 12px;
    width: auto; max-height: calc(100vh - 90px);
  }
}
</style>