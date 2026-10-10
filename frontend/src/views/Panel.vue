<template>
  <div class="animar">
    <div class="titulo-seccion">
      <div>
        <h1>Panel general</h1>
        <p class="sub">Resumen de la actividad operativa de la compañía</p>
      </div>
    </div>

    <div class="filtro-periodo">
      <div class="campo">
        <label>Mes</label>
        <select v-model="periodo.mes" class="control" @change="cargar">
          <option value="">Todo el año</option>
          <option v-for="(m,i) in meses" :key="i" :value="i+1">{{ m }}</option>
        </select>
      </div>
      <div class="campo">
        <label>Año</label>
        <select v-model="periodo.anio" class="control" @change="cargar">
          <option v-for="a in anios" :key="a" :value="a">{{ a }}</option>
        </select>
      </div>
    </div>

    <div v-if="cargando" class="tarjeta estado-carga">
      <span class="cargador cargador-oscuro"></span>
      <p>Cargando información</p>
    </div>

    <template v-else>
      <!-- ── INDICADORES ──────────────────────── -->
      <div class="indicadores">
        <div class="indicador">
          <div class="ind-icono ind-azul">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
            </svg>
          </div>
          <div>
            <span class="ind-valor">{{ datos.total_servicios }}</span>
            <span class="ind-texto">Servicios atendidos</span>
          </div>
        </div>

        <div class="indicador">
          <div class="ind-icono ind-naranja">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <div>
            <span class="ind-valor">{{ datos.insumos_bajo_minimo }}</span>
            <span class="ind-texto">Insumos bajo el mínimo</span>
          </div>
        </div>

        <div class="indicador">
          <div class="ind-icono ind-rojo">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
            </svg>
          </div>
          <div>
            <span class="ind-valor">{{ datos.insumos_agotados }}</span>
            <span class="ind-texto">Insumos agotados</span>
          </div>
        </div>

        <div class="indicador">
          <div class="ind-icono ind-verde">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
          </div>
          <div>
            <span class="ind-valor">{{ datos.servicios_por_zona?.length || 0 }}</span>
            <span class="ind-texto">Zonas con incidencia</span>
          </div>
        </div>
      </div>

      <div class="columnas">
        <!-- ── SERVICIOS POR TIPO ─────────────── -->
        <div class="tarjeta">
          <div class="tarjeta-cabecera">
            <h2>Servicios por tipo</h2>
          </div>
          <div class="tarjeta-cuerpo">
            <div v-if="!datos.servicios_por_tipo?.length" class="vacio">
              <p>Sin registros en el periodo</p>
            </div>
            <div v-else class="barras">
              <div v-for="t in datos.servicios_por_tipo" :key="t.tipo_servicio" class="barra-fila">
                <div class="barra-etiqueta">
                  <span class="punto-tipo" :class="`pt-${t.tipo_servicio}`"></span>
                  <span>{{ nombreTipo(t.tipo_servicio) }}</span>
                </div>
                <div class="barra-pista">
                  <div class="barra-relleno" :class="`br-${t.tipo_servicio}`"
                       :style="{ width: porcentaje(t.total, maxTipo) + '%' }"></div>
                </div>
                <strong class="barra-valor">{{ t.total }}</strong>
              </div>
            </div>
          </div>
        </div>

        <!-- ── ZONAS ──────────────────────────── -->
        <div class="tarjeta">
          <div class="tarjeta-cabecera">
            <h2>Zonas con mayor incidencia</h2>
          </div>
          <div class="tarjeta-cuerpo">
            <div v-if="!datos.servicios_por_zona?.length" class="vacio">
              <p>Sin registros en el periodo</p>
            </div>
            <ol v-else class="lista-zonas">
              <li v-for="(z,i) in datos.servicios_por_zona" :key="z.zona">
                <span class="posicion">{{ i + 1 }}</span>
                <span class="zona-nombre">{{ z.zona }}</span>
                <span class="etiqueta et-info">{{ z.total }}</span>
              </li>
            </ol>
          </div>
        </div>
      </div>

      <!-- ── ALERTAS ────────────────────────────── -->
      <div v-if="alertas.existencia_critica.length" class="tarjeta">
        <div class="tarjeta-cabecera">
          <h2>Insumos que requieren atención</h2>
          <router-link to="/inventario" class="btn btn-plano btn-sm">Ver inventario</router-link>
        </div>
        <div class="tabla-contenedor sin-borde">
          <table>
            <thead>
              <tr><th>Insumo</th><th>Categoría</th><th>Existencia</th><th>Mínimo</th><th>Estado</th></tr>
            </thead>
            <tbody>
              <tr v-for="a in alertas.existencia_critica.slice(0,8)" :key="a.id">
                <td>{{ a.nombre }}</td>
                <td class="capitalizar">{{ a.categoria }}</td>
                <td><strong>{{ a.stock_actual }}</strong></td>
                <td>{{ a.stock_minimo }}</td>
                <td>
                  <span class="etiqueta" :class="a.estado === 'agotado' ? 'et-peligro' : 'et-alerta'">
                    {{ a.estado === 'agotado' ? 'Agotado' : 'Existencia baja' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { reportes, inventario } from '../services/api';
import { useNotificacionesStore } from '../stores/notificaciones';

const notif = useNotificacionesStore();

const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
               'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const anioActual = new Date().getFullYear();
const anios = [anioActual, anioActual - 1, anioActual - 2];

const periodo = reactive({ mes: new Date().getMonth() + 1, anio: anioActual });
const datos    = ref({});
const alertas  = ref({ existencia_critica: [], proximos_a_vencer: [] });
const cargando = ref(true);

const NOMBRES = {
  ambulancia: 'Ambulancia', incendio: 'Incendio', rescate: 'Rescate',
  varios: 'Servicios varios', agua: 'Servicio de agua'
};
const nombreTipo = (t) => NOMBRES[t] || t;

const maxTipo = computed(() =>
  Math.max(...(datos.value.servicios_por_tipo?.map(t => t.total) || [1]), 1)
);
const porcentaje = (v, max) => Math.round((v / max) * 100);

const cargar = async () => {
  cargando.value = true;
  try {
    const params = { anio: periodo.anio };
    if (periodo.mes) params.mes = periodo.mes;

    const [est, alr] = await Promise.all([
      reportes.estadisticas(params),
      inventario.alertas()
    ]);
    datos.value   = est.data;
    alertas.value = alr.data;
  } catch {
    notif.error('No se pudo cargar la información del panel');
  } finally {
    cargando.value = false;
  }
};

onMounted(cargar);
</script>

<style scoped>
.filtro-periodo {
  display: flex; gap: 12px; margin-bottom: 20px;
}
.filtro-periodo .campo { margin-bottom: 0; min-width: 150px; }

.estado-carga {
  display: flex; flex-direction: column; align-items: center; gap: 13px; padding: 56px;
}
.estado-carga p { color: var(--texto-suave); font-size: 13.5px; }

/* ── INDICADORES ──────────────────────────────── */
.indicadores {
  display: grid; grid-template-columns: repeat(4, 1fr);
  gap: 14px; margin-bottom: 20px;
}
.indicador {
  display: flex; align-items: center; gap: 14px;
  padding: 18px 20px;
  background: var(--superficie);
  border: 1px solid var(--borde);
  border-radius: var(--radio-lg);
  box-shadow: var(--sombra-sm);
  transition: transform var(--transicion), box-shadow var(--transicion);
}
.indicador:hover { transform: translateY(-2px); box-shadow: var(--sombra); }

.ind-icono {
  width: 44px; height: 44px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  border-radius: 12px;
}
.ind-azul   { background: var(--info-fondo);    color: var(--info); }
.ind-naranja{ background: var(--alerta-fondo);  color: var(--alerta); }
.ind-rojo   { background: var(--peligro-fondo); color: var(--peligro); }
.ind-verde  { background: var(--exito-fondo);   color: var(--exito); }

.ind-valor {
  display: block; font-size: 25px; font-weight: 700;
  line-height: 1.1; letter-spacing: -.02em;
}
.ind-texto { font-size: 12.5px; color: var(--texto-suave); }

/* ── COLUMNAS ─────────────────────────────────── */
.columnas {
  display: grid; grid-template-columns: 1.3fr 1fr;
  gap: 16px; margin-bottom: 20px;
}

/* ── BARRAS ───────────────────────────────────── */
.barras { display: flex; flex-direction: column; gap: 15px; }
.barra-fila {
  display: grid; grid-template-columns: 145px 1fr 36px;
  align-items: center; gap: 12px;
}
.barra-etiqueta {
  display: flex; align-items: center; gap: 8px;
  font-size: 13px; color: var(--texto);
}
.punto-tipo { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.pt-ambulancia { background: #1565C0; }
.pt-incendio   { background: #C62828; }
.pt-rescate    { background: #F57C00; }
.pt-varios     { background: #2E7D32; }
.pt-agua       { background: #00838F; }

.barra-pista {
  height: 9px; background: var(--superficie-alt);
  border-radius: 99px; overflow: hidden;
}
.barra-relleno {
  height: 100%; border-radius: 99px;
  transition: width 600ms cubic-bezier(.4,0,.2,1);
}
.br-ambulancia { background: #1565C0; }
.br-incendio   { background: #C62828; }
.br-rescate    { background: #F57C00; }
.br-varios     { background: #2E7D32; }
.br-agua       { background: #00838F; }

.barra-valor { font-size: 14px; text-align: right; }

/* ── ZONAS ────────────────────────────────────── */
.lista-zonas { list-style: none; display: flex; flex-direction: column; gap: 9px; }
.lista-zonas li {
  display: flex; align-items: center; gap: 11px;
  padding: 9px 11px;
  background: var(--superficie-alt);
  border-radius: var(--radio);
}
.posicion {
  width: 22px; height: 22px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: var(--superficie); border: 1px solid var(--borde);
  border-radius: 50%;
  font-size: 11px; font-weight: 700; color: var(--texto-suave);
}
.zona-nombre {
  flex: 1; font-size: 13px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

.capitalizar { text-transform: capitalize; }
.tabla-contenedor.sin-borde { border: none; border-radius: 0; }

@media (max-width: 1100px) {
  .indicadores { grid-template-columns: repeat(2, 1fr); }
  .columnas { grid-template-columns: 1fr; }
}
@media (max-width: 560px) {
  .indicadores { grid-template-columns: 1fr; }
  .barra-fila { grid-template-columns: 110px 1fr 32px; }
}
</style>