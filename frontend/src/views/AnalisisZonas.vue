<template>
  <div class="animar">
    <div class="titulo-seccion">
      <div>
        <h1>Zonas de incidencia</h1>
        <p class="sub">Análisis de las zonas del municipio con mayor frecuencia de emergencias</p>
      </div>
    </div>

    <!-- ── FILTROS ────────────────────────────── -->
    <div class="tarjeta panel-filtros">
      <div class="fila">
        <div class="campo">
          <label>Mes</label>
          <select v-model="filtros.mes" class="control" @change="cargarTabla">
            <option value="">Todo el año</option>
            <option v-for="(m,i) in meses" :key="i" :value="i+1">{{ m }}</option>
          </select>
        </div>
        <div class="campo">
          <label>Año</label>
          <select v-model="filtros.anio" class="control" @change="cargarTabla">
            <option value="">Histórico completo</option>
            <option v-for="a in anios" :key="a" :value="a">{{ a }}</option>
          </select>
        </div>
        <div class="campo">
          <label>Tipo de servicio</label>
          <select v-model="filtros.tipo_servicio" class="control" @change="cargarTabla">
            <option value="">Todos los tipos</option>
            <option value="ambulancia">Ambulancia</option>
            <option value="incendio">Incendio</option>
            <option value="rescate">Rescate</option>
            <option value="varios">Servicios varios</option>
            <option value="agua">Servicio de agua</option>
          </select>
        </div>
        <div class="crecer"></div>
        <button class="btn btn-primario" @click="generarAnalisis" :disabled="analizando">
          <template v-if="!analizando">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z"/>
              <path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/>
            </svg>
            <span>Generar análisis</span>
          </template>
          <template v-else><span class="cargador"></span><span>Analizando</span></template>
        </button>
      </div>
    </div>

    <!-- ── RESULTADO DEL ANÁLISIS ─────────────── -->
    <transition name="aparecer">
      <div v-if="resultado" class="tarjeta tarjeta-analisis">
        <div class="tarjeta-cabecera">
          <div class="fila">
            <div class="icono-analisis">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z"/>
                <path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/>
              </svg>
            </div>
            <div>
              <h2>Análisis generado</h2>
              <p class="cabecera-sub">
                Periodo: {{ resultado.periodo }} · {{ resultado.total_registros }} registros analizados
              </p>
            </div>
          </div>
          <button class="btn btn-secundario btn-sm" @click="imprimirAnalisis">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 6 2 18 2 18 9"/>
              <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
              <rect x="6" y="14" width="12" height="8"/>
            </svg>
            <span>Imprimir</span>
          </button>
        </div>
        <div class="tarjeta-cuerpo">
          <div v-if="!resultado.disponible" class="aviso-no-disponible">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <div>
              <strong>{{ resultado.mensaje }}</strong>
              <p>Puede consultar la distribución por zonas en la tabla inferior.</p>
            </div>
          </div>
          <div v-else class="texto-analisis">
            <p v-for="(p,i) in parrafos" :key="i">{{ p }}</p>
          </div>
        </div>
      </div>
    </transition>

    <!-- ── DISTRIBUCIÓN POR ZONA ──────────────── -->
    <div class="tarjeta">
      <div class="tarjeta-cabecera">
        <h2>Distribución por zona</h2>
      </div>

      <div v-if="cargando" class="tarjeta-cuerpo">
        <div class="estado-carga">
          <span class="cargador cargador-oscuro"></span>
          <p>Consultando distribución</p>
        </div>
      </div>

      <div v-else-if="!zonas.length" class="tarjeta-cuerpo">
        <div class="vacio"><p>No hay servicios registrados en el periodo seleccionado</p></div>
      </div>

      <div v-else class="tabla-contenedor sin-borde">
        <table>
          <thead>
            <tr><th>Zona o sector</th><th>Servicios atendidos</th><th>Tipo predominante</th><th>Proporción</th></tr>
          </thead>
          <tbody>
            <tr v-for="z in zonas" :key="z.zona">
              <td><strong>{{ z.zona }}</strong></td>
              <td>{{ z.total_servicios }}</td>
              <td>
                <span class="etiqueta" :class="claseTipo(z.tipo_predominante)">
                  {{ nombreTipo(z.tipo_predominante) }}
                </span>
              </td>
              <td>
                <div class="proporcion">
                  <div class="pista">
                    <div class="relleno" :style="{ width: proporcion(z.total_servicios) + '%' }"></div>
                  </div>
                  <span>{{ proporcion(z.total_servicios) }}%</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { analisis } from '../services/api';
import { useNotificacionesStore } from '../stores/notificaciones';

const notif = useNotificacionesStore();

const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
               'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const anioActual = new Date().getFullYear();
const anios = [anioActual, anioActual - 1, anioActual - 2];

const filtros = reactive({ mes: '', anio: anioActual, tipo_servicio: '' });

const zonas      = ref([]);
const resultado  = ref(null);
const cargando   = ref(true);
const analizando = ref(false);

const NOMBRES = {
  ambulancia:'Ambulancia', incendio:'Incendio', rescate:'Rescate',
  varios:'Servicios varios', agua:'Servicio de agua'
};
const CLASES = {
  ambulancia:'et-info', incendio:'et-peligro', rescate:'et-alerta',
  varios:'et-exito', agua:'et-info'
};
const nombreTipo = (t) => NOMBRES[t] || t || '—';
const claseTipo  = (t) => CLASES[t] || 'et-info';

const totalGeneral = computed(() =>
  zonas.value.reduce((a, z) => a + z.total_servicios, 0) || 1);
const proporcion = (v) => Math.round((v / totalGeneral.value) * 100);

const parrafos = computed(() =>
  (resultado.value?.analisis || '').split('\n').filter(p => p.trim()));

const cargarTabla = async () => {
  cargando.value = true;
  try {
    const params = {};
    if (filtros.mes)  params.mes  = filtros.mes;
    if (filtros.anio) params.anio = filtros.anio;
    const { data } = await analisis.zonasTabla(params);
    zonas.value = data.zonas;
  } catch {
    notif.error('No se pudo consultar la distribución');
  } finally {
    cargando.value = false;
  }
};

const generarAnalisis = async () => {
  analizando.value = true;
  try {
    const params = {};
    Object.entries(filtros).forEach(([k,v]) => { if (v) params[k] = v; });
    const { data } = await analisis.zonas(params);
    resultado.value = data;
    if (data.disponible) notif.exito('Análisis generado correctamente');
    else notif.alerta(data.mensaje);
  } catch (e) {
    notif.error(e.response?.data?.mensaje || 'No se pudo generar el análisis');
  } finally {
    analizando.value = false;
  }
};

const imprimirAnalisis = () => {
  if (!resultado.value) return;

  const filas = zonas.value.map(z => `
    <tr><td>${z.zona}</td><td>${z.total_servicios}</td>
    <td>${nombreTipo(z.tipo_predominante)}</td></tr>`).join('');

  const texto = resultado.value.disponible
    ? parrafos.value.map(p => `<p>${p}</p>`).join('')
    : `<p><em>${resultado.value.mensaje}</em></p>`;

  const w = window.open('', '_blank');
  w.document.write(`
    <html><head><title>Análisis de zonas</title><style>
      body{font-family:'Times New Roman',serif;padding:30px;color:#000;line-height:1.6}
      .enc{display:flex;align-items:center;gap:16px;border-bottom:2px solid #000;padding-bottom:12px;margin-bottom:8px}
      .enc img{width:70px;height:70px;object-fit:contain}
      .enc h1{font-size:14px;margin:0}
      .enc h2{font-size:13px;margin:3px 0 0;font-weight:normal}
      .meta{font-size:11px;margin-bottom:20px;color:#333}
      h3{font-size:12px;margin:22px 0 8px;text-transform:uppercase;border-bottom:1px solid #666;padding-bottom:4px}
      p{font-size:12px;text-align:justify;margin-bottom:10px;text-indent:1.2cm}
      table{width:100%;border-collapse:collapse;font-size:11px;margin-top:8px}
      th,td{border:1px solid #000;padding:5px 7px;text-align:left}
      th{background:#e8e8e8;font-weight:bold}
      .firmas{display:flex;justify-content:space-around;margin-top:48px;font-size:11px}
      .firmas div{text-align:center;width:220px}
      .raya{border-top:1px solid #000;margin-bottom:5px}
      @page{size:letter;margin:1.5cm}
    </style></head><body>
      <div class="enc">
        <img src="/LogoBomberos.png" />
        <div>
          <h1>BENEMÉRITO CUERPO VOLUNTARIO DE BOMBEROS DE GUATEMALA</h1>
          <h2>39ª Compañía de Chiquimula — Análisis de zonas de incidencia</h2>
        </div>
      </div>
      <div class="meta">
        Periodo analizado: <strong>${resultado.value.periodo}</strong> &nbsp;|&nbsp;
        Registros procesados: <strong>${resultado.value.total_registros}</strong> &nbsp;|&nbsp;
        Generado el ${new Date().toLocaleDateString('es-GT')}
      </div>
      <h3>Análisis</h3>
      ${texto}
      <h3>Distribución por zona</h3>
      <table><thead><tr>
        <th>Zona o sector</th><th>Servicios atendidos</th><th>Tipo predominante</th>
      </tr></thead><tbody>${filas}</tbody></table>
      <div class="firmas">
        <div><div class="raya"></div>Elaborado por</div>
        <div><div class="raya"></div>Vo. Bo. Comandante</div>
      </div>
    </body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 500);
};

onMounted(cargarTabla);
</script>

<style scoped>
.panel-filtros { padding: 16px 20px; margin-bottom: 18px; }
.panel-filtros .campo { margin-bottom: 0; min-width: 155px; }

.tarjeta { margin-bottom: 18px; }
.tabla-contenedor.sin-borde { border: none; border-radius: 0; }

.estado-carga {
  display: flex; flex-direction: column; align-items: center; gap: 13px; padding: 40px;
}
.estado-carga p { color: var(--texto-suave); font-size: 13.5px; }

.cabecera-sub { font-size: 12.5px; color: var(--texto-suave); margin-top: 3px; }

.tarjeta-analisis { border-left: 3px solid var(--rojo-bomberos); }

.icono-analisis {
  width: 38px; height: 38px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: var(--peligro-fondo); color: var(--rojo-bomberos);
  border-radius: 11px;
}

.texto-analisis p {
  font-size: 14px; line-height: 1.75; text-align: justify;
  color: var(--texto); margin-bottom: 13px;
}
.texto-analisis p:last-child { margin-bottom: 0; }

.aviso-no-disponible {
  display: flex; align-items: flex-start; gap: 11px;
  padding: 14px 16px;
  background: var(--alerta-fondo); color: var(--alerta);
  border-radius: var(--radio);
}
.aviso-no-disponible svg { flex-shrink: 0; margin-top: 2px; }
.aviso-no-disponible strong { font-size: 13.5px; }
.aviso-no-disponible p { font-size: 12.5px; margin-top: 3px; opacity: .85; }

.proporcion { display: flex; align-items: center; gap: 10px; min-width: 130px; }
.pista {
  flex: 1; height: 7px;
  background: var(--superficie-alt);
  border-radius: 99px; overflow: hidden;
}
.relleno {
  height: 100%; background: var(--rojo-bomberos);
  border-radius: 99px;
  transition: width 600ms cubic-bezier(.4,0,.2,1);
}
.proporcion span { font-size: 12px; color: var(--texto-suave); min-width: 34px; }

.aparecer-enter-active { animation: aparecer 320ms ease both; }

@media (max-width: 900px) {
  .panel-filtros .fila { flex-wrap: wrap; }
  .panel-filtros .campo { min-width: 140px; flex: 1; }
}
</style>