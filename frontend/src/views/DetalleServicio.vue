<template>
  <div class="animar">
    <div v-if="cargando" class="tarjeta estado-carga">
      <span class="cargador cargador-oscuro"></span>
      <p>Cargando servicio</p>
    </div>

    <template v-else-if="s">
      <div class="titulo-seccion fila-entre no-imprimir">
        <div class="fila">
          <router-link to="/historial" class="btn btn-plano btn-icono" title="Regresar">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
            </svg>
          </router-link>
          <div>
            <h1>Servicio {{ s.numero_control }}</h1>
            <p class="sub">{{ nombreTipo }} · {{ formatoFecha(s.fecha) }}</p>
          </div>
        </div>
        <button class="btn btn-primario" @click="imprimir">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 6 2 18 2 18 9"/>
            <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
            <rect x="6" y="14" width="12" height="8"/>
          </svg>
          <span>Imprimir boleta</span>
        </button>
      </div>

      <div class="tarjeta vista-boleta">
        <div class="tarjeta-cuerpo">
          <div class="boleta-encabezado">
            <img src="/LogoBomberos.png" alt="Logo" />
            <div>
              <h2>BENEMÉRITO CUERPO VOLUNTARIO DE BOMBEROS DE GUATEMALA</h2>
              <h3>{{ tituloBoleta }}</h3>
            </div>
          </div>

          <div class="grupo">
            <div class="linea"><span>Control No.</span><b>{{ v(s.numero_control) }}</b></div>
            <div class="linea"><span>Minutos trabajados</span><b>{{ v(s.minutos_trabajados) }}</b></div>
            <div class="linea"><span>Fecha</span><b>{{ formatoFecha(s.fecha) }}</b></div>
            <div class="linea"><span>Solicitud por teléfono</span><b>{{ v(s.solicitud_por_telefono) }}</b></div>
            <div class="linea"><span>Personal</span><b>{{ v(s.personal) }}</b></div>
            <div class="linea"><span>Salida de</span><b>{{ v(s.salida_de) }}</b></div>
            <div class="linea"><span>Hora de salida</span><b>{{ v(s.hora_salida) }}</b></div>
            <div class="linea"><span>Entrada a</span><b>{{ v(s.entrada_a) }}</b></div>
            <div class="linea"><span>Hora de entrada</span><b>{{ v(s.hora_entrada) }}</b></div>
            <div class="linea ancha"><span>Dirección</span><b>{{ v(s.direccion) }}</b></div>
            <div class="linea"><span>Zona o sector</span><b>{{ v(s.zona) }}</b></div>
            <div class="linea ancha"><span>Solicitante</span><b>{{ v(s.solicitante) }}</b></div>
          </div>

          <!-- ── AMBULANCIA ── -->
          <template v-if="s.tipo_servicio === 'ambulancia'">
            <h4 class="seccion">Datos del paciente</h4>
            <div class="grupo">
              <div class="linea ancha"><span>Nombre de los pacientes</span><b>{{ v(d.nombres_pacientes) }}</b></div>
              <div class="linea"><span>Fallecidos</span><b>{{ d.hubo_fallecidos ? 'Sí' : 'No' }}</b></div>
              <div class="linea"><span>Nombre de fallecidos</span><b>{{ v(d.fallecidos) }}</b></div>
              <div class="linea"><span>Edades</span><b>{{ v(d.edades) }}</b></div>
              <div class="linea ancha"><span>Domicilios</span><b>{{ v(d.domicilios) }}</b></div>
              <div class="linea ancha"><span>Acompañantes</span><b>{{ v(d.acompanantes) }}</b></div>
            </div>
            <h4 class="seccion">Tipo de servicio</h4>
            <div class="grupo">
              <div class="linea"><span>Servicio por maternidad</span><b>{{ v(d.serv_maternidad) }}</b></div>
              <div class="linea"><span>Accidente de tránsito</span><b>{{ v(d.acc_transito) }}</b></div>
              <div class="linea"><span>Accidente de trabajo</span><b>{{ v(d.acc_trabajo) }}</b></div>
              <div class="linea ancha"><span>Otros</span><b>{{ v(d.otros) }}</b></div>
            </div>
            <h4 class="seccion">Traslado</h4>
            <div class="grupo">
              <div class="linea"><span>Hospital Modular</span><b>{{ v(d.hosp_modular) }}</b></div>
              <div class="linea"><span>Hospital Privado</span><b>{{ v(d.hosp_privado) }}</b></div>
              <div class="linea"><span>Hospital I.G.S.S.</span><b>{{ v(d.hosp_igss) }}</b></div>
              <div class="linea"><span>Otros</span><b>{{ v(d.otro_traslado) }}</b></div>
            </div>
          </template>

          <!-- ── INCENDIO ── -->
          <template v-else-if="s.tipo_servicio === 'incendio'">
            <h4 class="seccion">Propiedad inmueble</h4>
            <div class="grupo">
              <div class="linea ancha"><span>Propietario</span><b>{{ v(d.prop_propietario) }}</b></div>
              <div class="linea ancha"><span>Sitio donde principió</span><b>{{ v(d.sitio_inicio) }}</b></div>
              <div class="linea ancha"><span>Causas</span><b>{{ v(d.causas) }}</b></div>
              <div class="linea"><span>Valor del inmueble</span><b>{{ q(d.valor_inmueble) }}</b></div>
              <div class="linea"><span>Monto de pérdidas</span><b>{{ q(d.perdidas_inmueble) }}</b></div>
              <div class="linea"><span>Compañía aseguradora</span><b>{{ v(d.aseguradora_inmueble) }}</b></div>
            </div>
            <h4 class="seccion">Datos del vehículo</h4>
            <div class="grupo">
              <div class="linea"><span>Propietario</span><b>{{ v(d.veh_propietario) }}</b></div>
              <div class="linea"><span>Conductor</span><b>{{ v(d.conductor) }}</b></div>
              <div class="linea"><span>Descripción tipo</span><b>{{ v(d.descripcion_tipo) }}</b></div>
              <div class="linea"><span>Marca</span><b>{{ v(d.marca) }}</b></div>
              <div class="linea"><span>Modelo</span><b>{{ v(d.modelo) }}</b></div>
              <div class="linea"><span>Placas</span><b>{{ v(d.placas) }}</b></div>
              <div class="linea"><span>Valor aproximado</span><b>{{ q(d.valor_vehiculo) }}</b></div>
              <div class="linea"><span>Pérdidas aprox.</span><b>{{ q(d.perdidas_vehiculo) }}</b></div>
              <div class="linea"><span>Compañía aseguradora</span><b>{{ v(d.aseguradora_vehiculo) }}</b></div>
            </div>
          </template>

          <!-- ── RESCATE ── -->
          <template v-else-if="s.tipo_servicio === 'rescate'">
            <h4 class="seccion">Datos del rescate</h4>
            <div class="grupo">
              <div class="linea ancha"><span>Forma de aviso por teléfono</span><b>{{ v(d.forma_aviso) }}</b></div>
              <div class="linea ancha"><span>Nombre de los rescatados</span><b>{{ v(d.nombres_rescatados) }}</b></div>
              <div class="linea"><span>Edades</span><b>{{ v(d.edades) }}</b></div>
              <div class="linea ancha"><span>Con domicilio en</span><b>{{ v(d.domicilios) }}</b></div>
              <div class="linea ancha"><span>Traslado a</span><b>{{ v(d.traslado_a) }}</b></div>
            </div>
          </template>

          <!-- ── VARIOS ── -->
          <template v-else-if="s.tipo_servicio === 'varios'">
            <h4 class="seccion">Clase de servicio</h4>
            <div class="grupo">
              <div class="linea ancha"><span>Clase de servicio</span><b>{{ v(d.clase_servicio) }}</b></div>
            </div>
          </template>

          <!-- ── AGUA ── -->
          <template v-else-if="s.tipo_servicio === 'agua'">
            <h4 class="seccion">Datos del beneficiario</h4>
            <div class="grupo">
              <div class="linea ancha"><span>Residencia</span><b>{{ v(d.residencia) }}</b></div>
              <div class="linea ancha"><span>Nombre del establecimiento</span><b>{{ v(d.nombre_establecimiento) }}</b></div>
              <div class="linea ancha"><span>Centro asistencial</span><b>{{ v(d.centro_asistencial) }}</b></div>
              <div class="linea"><span>Colonia</span><b>{{ v(d.colonia) }}</b></div>
              <div class="linea ancha"><span>Nota</span><b>{{ v(d.nota) }}</b></div>
            </div>
            <h4 class="seccion">Distribución y donativo</h4>
            <div class="grupo">
              <div class="linea ancha"><span>Servicio autorizado por</span><b>{{ v(d.servicio_autorizado_por) }}</b></div>
              <div class="linea"><span>Galones distribuidos</span><b>{{ v(d.galones_distribuidos) }}</b></div>
              <div class="linea ancha"><span>Forma en que se distribuyó</span><b>{{ v(d.forma_distribucion) }}</b></div>
              <div class="linea"><span>Donativo</span><b>{{ q(d.donativo) }}</b></div>
              <div class="linea ancha"><span>En letras</span><b>{{ v(d.donativo_letras) }}</b></div>
            </div>
          </template>

          <h4 class="seccion">Personal y unidad</h4>
          <div class="grupo">
            <div class="linea"><span>Radiotelefonista</span><b>{{ v(s.radiotelefonista) }}</b></div>
            <div class="linea"><span>Piloto</span><b>{{ v(s.piloto) }}</b></div>
            <div class="linea"><span>Unidad</span><b>{{ v(s.unidad) }}</b></div>
            <div class="linea ancha"><span>Personal destacado</span><b>{{ v(s.personal_destacado) }}</b></div>
          </div>

          <h4 class="seccion">Observaciones</h4>
          <p class="observaciones">{{ v(s.observaciones) }}</p>

                    <template v-if="s.tipo_servicio === 'incendio'">
            <div class="firmas firmas-dos">
              <div>
                <p class="firma-valor">{{ v(s.responsable) }}</p>
                <div class="raya"></div>
                <span>Responsable</span>
              </div>
              <div>
                <p class="firma-valor">{{ v(s.jefes_servicio) }}</p>
                <div class="raya"></div>
                <span>Jefes de Servicio</span>
              </div>
            </div>
          </template>

          <template v-else>
            <div class="firmas">
              <div>
                <p class="firma-valor">{{ v(s.reporte_formulado_por) }}</p>
                <div class="raya"></div>
                <span>Reporte formulado por</span>
              </div>
              <div>
                <p class="firma-valor">{{ v(s.conforme_piloto) }}</p>
                <div class="raya"></div>
                <span>Es conforme el piloto</span>
              </div>
              <div>
                <p class="firma-valor">{{ v(s.vobo_jefe_servicio) }}</p>
                <div class="raya"></div>
                <span>Vo. Bo. Jefe de Servicio</span>
              </div>
            </div>

            <div v-if="llevaCertificacion" class="certificacion">
              <p class="razon">
                Razón: la pone la Secretaría Ejecutiva del Cuerpo, para que conste que en
                esta fecha y a solicitud se extiende copia certificada de este reporte a
                Sr. (a) (ita): <strong>{{ v(s.copia_certificada_a) }}</strong>
              </p>
              <p class="lugar-fecha">
                Guatemala, {{ fechaCertificacion }}
              </p>
              <div class="firma-secretaria">
                <div class="raya"></div>
                <span>{{ s.tipo_servicio === 'rescate' ? 'Secretaría Ejecutiva' : 'Secretaria' }}</span>
              </div>
            </div>
          </template>

         
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { emergencias } from '../services/api';
import { useNotificacionesStore } from '../stores/notificaciones';

const ruta  = useRoute();
const notif = useNotificacionesStore();

const s = ref(null);
const cargando = ref(true);

const d = computed(() => s.value?.detalle || {});

const TITULOS = {
  ambulancia: 'REPORTE DE AMBULANCIA',
  incendio:   'REPORTE DE INCENDIO',
  rescate:    'SERVICIO DE RESCATE',
  varios:     'REPORTE DE SERVICIOS VARIOS',
  agua:       'REPORTE DE SERVICIOS DE AGUA'
};
const NOMBRES = {
  ambulancia: 'Servicio de ambulancia', incendio: 'Servicio de incendio',
  rescate: 'Servicio de rescate', varios: 'Servicios varios', agua: 'Servicio de agua'
};

const tituloBoleta = computed(() => TITULOS[s.value?.tipo_servicio] || '');
const nombreTipo   = computed(() => NOMBRES[s.value?.tipo_servicio] || '');
const llevaCertificacion = computed(() =>
  ['ambulancia','rescate','varios'].includes(s.value?.tipo_servicio)
);

const fechaCertificacion = computed(() => {
  const f = s.value?.fecha_certificacion;
  if (!f) return '_____ de ___________________ de 20____';
  const d = new Date(f);
  const meses = ['enero','febrero','marzo','abril','mayo','junio',
                 'julio','agosto','septiembre','octubre','noviembre','diciembre'];
  return `${d.getUTCDate()} de ${meses[d.getUTCMonth()]} de ${d.getUTCFullYear()}`;
});

const v = (x) => (x === null || x === undefined || x === '') ? '—' : x;
const q = (x) => (x === null || x === undefined) ? '—' : `Q ${Number(x).toFixed(2)}`;

const formatoFecha = (f) => {
  if (!f) return '—';
  return new Date(f).toLocaleDateString('es-GT',
    { day:'2-digit', month:'long', year:'numeric', timeZone:'UTC' });
};

const imprimir = () => window.print();

onMounted(async () => {
  try {
    const { data } = await emergencias.obtener(ruta.params.id);
    s.value = data;
  } catch {
    notif.error('No se pudo cargar el servicio');
  } finally {
    cargando.value = false;
  }
});
</script>

<style scoped>
.estado-carga {
  display: flex; flex-direction: column; align-items: center; gap: 13px; padding: 56px;
}
.estado-carga p { color: var(--texto-suave); font-size: 13.5px; }

/* ── HOJA OFICIO 21.6 × 33 cm ──────────────────── */
.vista-boleta {
  width: 21.6cm;
  height: 33cm;
  margin: 0 auto;
  padding: 1.5cm;
  box-sizing: border-box;
  overflow: hidden;
}
.vista-boleta .tarjeta-cuerpo {
  padding: 0; height: 100%;
  display: flex; flex-direction: column;
}

.boleta-encabezado {
  display: flex; align-items: center; gap: 15px;
  padding-bottom: 9px;
  border-bottom: 2px solid var(--texto);
  flex: 0 0 auto;
}
.boleta-encabezado img { width: 62px; height: 62px; object-fit: contain; }
.boleta-encabezado h2 { font-size: 12px; font-weight: 700; line-height: 1.3; }
.boleta-encabezado h3 {
  font-size: 11.5px; font-weight: 600; margin-top: 3px;
  color: var(--rojo-bomberos);
}

.seccion {
  padding-bottom: 4px; margin: 0 0 7px;
  border-bottom: 1.2px solid var(--borde-fuerte);
  font-size: 9.5px; font-weight: 700;
  text-transform: uppercase; letter-spacing: .06em;
  color: var(--texto-suave);
  flex: 0 0 auto;
}

.grupo {
  display: grid; grid-template-columns: repeat(4, 1fr);
  gap: 4px 18px;
  flex: 1 1 auto; align-content: space-evenly;
  min-height: 0;
}
.linea {
  display: flex; flex-direction: column; gap: 2px;
  padding-bottom: 3px;
  border-bottom: 1px dotted var(--borde-fuerte);
}
.linea.ancha { grid-column: span 4; }
.linea span { font-size: 7.6px; color: var(--texto-tenue); line-height: 1.25; }
.linea b { font-size: 10.5px; font-weight: 500; color: var(--texto); line-height: 1.35; }

.observaciones {
  flex: 1.6 1 auto; min-height: 50px;
  padding: 8px 10px;
  background: var(--superficie-alt);
  border: 1px solid var(--borde);
  border-radius: var(--radio-sm);
  font-size: 10.5px; white-space: pre-wrap;
}

.firmas {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px;
  padding-top: 22px;
  flex: 0 0 auto;
}
.firmas-dos { grid-template-columns: repeat(2, 1fr); }
.firmas > div { text-align: center; }
.firma-valor { font-size: 10.5px; min-height: 15px; margin-bottom: 4px; color: var(--texto); }
.raya { border-top: 1px solid var(--texto); margin-bottom: 4px; }
.firmas span { font-size: 9.5px; color: var(--texto-suave); }

.certificacion { margin-top: 18px; flex: 0 0 auto; }
.razon {
  font-size: 9.5px; line-height: 1.55; text-align: justify;
  color: var(--texto-suave);
}
.razon strong { color: var(--texto); }
.lugar-fecha { margin-top: 12px; font-size: 10.5px; text-align: center; }
.firma-secretaria { width: 215px; margin: 18px auto 0; text-align: center; }

.registrado { display: none; }

/* ── IMPRESIÓN ─────────────────────────────────── */
@media print {
  .vista-boleta {
    width: 18.6cm;
    height: 30cm;
    padding: 0; margin: 0;
    border: none; box-shadow: none;
    background: #fff;
    overflow: hidden;
    break-inside: avoid;
    box-sizing: border-box;
  }
  .vista-boleta .tarjeta-cuerpo {
    height: 30cm;
    display: flex; flex-direction: column;
  }

  .boleta-encabezado { flex: 0 0 auto; border-bottom-color: #000; }
  .boleta-encabezado h3 { color: #000; }

  .seccion {
    flex: 0 0 auto; margin: 0 0 6px;
    color: #000; border-bottom-color: #555;
  }

  .grupo { flex: 1 1 auto; align-content: space-evenly; }
  .linea { border-bottom-color: #999; }
  .linea span { color: #555; }
  .linea b { color: #000; }

  .observaciones {
    flex: 2 1 auto;
    background: none; border-color: #888; color: #000;
  }

  .firmas { flex: 0 0 auto; padding-top: 18px; }
  .certificacion { flex: 0 0 auto; margin-top: 14px; }

  .raya { border-top-color: #000; }
  .firmas span, .firma-valor, .lugar-fecha, .razon, .razon strong { color: #000; }

  @page { size: 21.6cm 33cm; margin: 1.5cm; }
}

@media (max-width: 900px) {
  .vista-boleta { width: 100%; height: auto; padding: 20px; overflow: visible; }
  .grupo { flex: none; align-content: start; gap: 12px 16px; }
  .observaciones { flex: none; min-height: 80px; }
}
</style>