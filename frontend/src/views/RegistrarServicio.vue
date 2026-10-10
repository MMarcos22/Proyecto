<template>
  <div class="animar">
    <div class="titulo-seccion no-imprimir">
      <div>
        <h1>Registrar servicio</h1>
        <p class="sub">Complete la boleta correspondiente al tipo de emergencia atendida</p>
      </div>
    </div>

    <div class="selector-tipos no-imprimir">
      <button v-for="t in tipos" :key="t.valor"
              class="tarjeta-tipo" :class="{ activa: datos.tipo_servicio === t.valor }"
              @click="cambiarTipo(t.valor)">
        <div class="tipo-icono" v-html="t.icono"></div>
        <span>{{ t.nombre }}</span>
      </button>
    </div>

    <div class="envoltura-hoja">
      <div class="hoja-oficio" :class="{ 'modo-blanco': imprimirEnBlanco }">
        <div class="bol-encabezado">
          <img src="/LogoBomberos.png" alt="Logo" />
          <div>
            <h2>BENEMÉRITO CUERPO VOLUNTARIO DE BOMBEROS DE GUATEMALA</h2>
            <h3>{{ tipoActual.tituloBoleta }}</h3>
          </div>
        </div>

        <div class="bol-cuerpo">
          <component :is="tipoActual.componente" v-model="datos" />

          <div class="bol-observaciones">
            <span class="bol-et">Observaciones:</span>
            <textarea v-model="datos.observaciones"></textarea>
          </div>

          <!-- INCENDIO: responsable y jefes lado a lado -->
          <template v-if="datos.tipo_servicio === 'incendio'">
            <div class="bol-firmas-col">
              <div class="bol-firma-bloque">
                <span class="bol-et">Responsable:</span>
                <input v-model="datos.responsable" class="bol-linea" type="text" />
              </div>
              <div class="bol-firma-bloque">
                <span class="bol-et">Jefes de Servicio:</span>
                <input v-model="datos.jefes_servicio" class="bol-linea" type="text" />
              </div>
            </div>
            <div class="bol-firma-rubrica">
              <div><div class="raya-f">(f)</div></div>
              <div><div class="raya-f">(f)</div></div>
            </div>
          </template>

          <!-- DEMÁS: tres firmas en línea -->
          <template v-else>
            <div class="bol-firmas-linea">
              <div class="bol-firma-fila">
                <span class="bol-et">Reporte formulado por:</span>
                <input v-model="datos.reporte_formulado_por" class="bol-linea" type="text" />
                <span class="bol-firma-f">f.</span>
                <input class="bol-linea w-lg" type="text" />
              </div>
              <div class="bol-firma-fila">
                <span class="bol-et">Es conforme el piloto:</span>
                <input v-model="datos.conforme_piloto" class="bol-linea" type="text" />
                <span class="bol-firma-f">f.</span>
                <input class="bol-linea w-lg" type="text" />
              </div>
              <div class="bol-firma-fila">
                <span class="bol-et">Vo. Bo. Jefe de Servicio:</span>
                <input v-model="datos.vobo_jefe_servicio" class="bol-linea" type="text" />
                <span class="bol-firma-f">f.</span>
                <input class="bol-linea w-lg" type="text" />
              </div>
            </div>

            <template v-if="llevaCertificacion">
              <p class="bol-razon">
                Razón: {{ datos.tipo_servicio === 'ambulancia'
                  ? 'La Secretaría Ejecutiva del Cuerpo, para que conste que en esta fecha y a solicitud en esta fecha se extiende copia certificada de este reporte a Sr. (a) (ita):'
                  : 'la pone la Secretaría Ejecutiva del Cuerpo, para que conste que en esta fecha a su solicitud se extiende copia certificada de este reporte.' }}
              </p>
              <div class="bol-razon-fila">
                <span class="bol-et">Sr. (a) (ita)</span>
                <input v-model="datos.copia_certificada_a" class="bol-linea" type="text" />
              </div>
              <div class="bol-lugar">
                <span>Guatemala,</span>
                <input v-model="cert.dia" class="bol-linea w-xs" type="text" />
                <span>de</span>
                <input v-model="cert.mes" class="bol-linea w-lg" type="text" />
                <span>de 20</span>
                <input v-model="cert.anio" class="bol-linea w-xs" type="text" />
              </div>
              <div class="bol-secretaria">
                <div class="raya-sec"></div>
                <span>{{ datos.tipo_servicio === 'rescate' ? 'Secretaria Ejecutiva' : 'Secretaria' }}</span>
              </div>
            </template>
          </template>
        </div>
      </div>
    </div>

    <div class="acciones-hoja no-imprimir">
      <button type="button" class="btn btn-secundario" @click="limpiarConfirmar = true">Limpiar</button>
      <div class="crecer"></div>
      <button type="button" class="btn btn-secundario" @click="imprimir(true)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
        </svg>
        <span>Imprimir en blanco</span>
      </button>
      <button type="button" class="btn btn-secundario" @click="imprimir(false)">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 6 2 18 2 18 9"/>
          <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
          <rect x="6" y="14" width="12" height="8"/>
        </svg>
        <span>Imprimir con datos</span>
      </button>
      <button type="button" class="btn btn-primario" @click="guardar" :disabled="guardando">
        <template v-if="!guardando">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
            <polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
          </svg>
          <span>Guardar registro</span>
        </template>
        <template v-else><span class="cargador"></span><span>Guardando</span></template>
      </button>
    </div>

    <Modal v-model="limpiarConfirmar" titulo="Limpiar boleta" ancho="380px">
      <p style="color: var(--texto-suave)">Se borrarán todos los datos ingresados. ¿Desea continuar?</p>
      <template #acciones>
        <button class="btn btn-secundario" @click="limpiarConfirmar = false">Cancelar</button>
        <button class="btn btn-primario" @click="limpiar">Limpiar</button>
      </template>
    </Modal>

    <Modal v-model="modalGuardado" titulo="Servicio registrado" ancho="400px">
      <div class="confirmacion">
        <div class="icono-exito">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <p>El servicio <strong>{{ ultimoControl }}</strong> quedó registrado correctamente.</p>
      </div>
      <template #acciones>
        <button class="btn btn-primario" @click="modalGuardado = false">Aceptar</button>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, nextTick } from 'vue';
import { emergencias } from '../services/api';
import { useNotificacionesStore } from '../stores/notificaciones';
import Modal from '../components/Modal.vue';
import BolAmbulancia from '../components/formularios/BolAmbulancia.vue';
import BolIncendio   from '../components/formularios/BolIncendio.vue';
import BolRescate    from '../components/formularios/BolRescate.vue';
import BolVarios     from '../components/formularios/BolVarios.vue';
import BolAgua       from '../components/formularios/BolAgua.vue';

const notif = useNotificacionesStore();

const tipos = [
  { valor:'ambulancia', nombre:'Ambulancia', tituloBoleta:'REPORTE DE AMBULANCIA', componente:BolAmbulancia,
    icono:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M10 10H6"/><path d="M8 8v4"/><path d="M19 17h2v-3.3a2 2 0 00-.6-1.4l-2.7-2.7a2 2 0 00-1.4-.6H15"/><path d="M3 17h1"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/><path d="M15 5H4a1 1 0 00-1 1v11"/></svg>` },
  { valor:'incendio', nombre:'Incendio', tituloBoleta:'REPORTE DE INCENDIO', componente:BolIncendio,
    icono:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z"/></svg>` },
  { valor:'rescate', nombre:'Rescate', tituloBoleta:'SERVICIO DE RESCATE', componente:BolRescate,
    icono:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/><line x1="4.93" y1="4.93" x2="9.17" y2="9.17"/><line x1="14.83" y1="14.83" x2="19.07" y2="19.07"/><line x1="14.83" y1="9.17" x2="19.07" y2="4.93"/><line x1="4.93" y1="19.07" x2="9.17" y2="14.83"/></svg>` },
  { valor:'varios', nombre:'Servicios varios', tituloBoleta:'REPORTE DE SERVICIOS VARIOS', componente:BolVarios,
    icono:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>` },
  { valor:'agua', nombre:'Servicio de agua', tituloBoleta:'REPORTE DE SERVICIOS DE AGUA', componente:BolAgua,
    icono:`<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22a7 7 0 007-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 007 7z"/></svg>` }
];

const hoy = new Date().toISOString().split('T')[0];

const estadoInicial = () => ({
  tipo_servicio:'ambulancia',
  numero_control:'', fecha:hoy, minutos_trabajados:null,
  solicitud_por_telefono:'', personal:'',
  salida_de:'', hora_salida:'', entrada_a:'', hora_entrada:'',
  direccion:'', zona:'', solicitante:'',
  radiotelefonista:'', piloto:'', unidad:'',
  personal_destacado:'', observaciones:'',
  hubo_fallecidos:false,
  reporte_formulado_por:'', conforme_piloto:'', vobo_jefe_servicio:'',
  responsable:'', jefes_servicio:'',
  copia_certificada_a:'', fecha_certificacion:''
});

const datos = reactive(estadoInicial());
const cert  = reactive({ dia:'', mes:'', anio:'' });

const guardando = ref(false);
const limpiarConfirmar = ref(false);
const modalGuardado = ref(false);
const ultimoControl = ref('');
const imprimirEnBlanco = ref(false);

const tipoActual = computed(() => tipos.find(t => t.valor === datos.tipo_servicio));
const llevaCertificacion = computed(() =>
  ['ambulancia','rescate','varios'].includes(datos.tipo_servicio));

const MESES = ['enero','febrero','marzo','abril','mayo','junio',
               'julio','agosto','septiembre','octubre','noviembre','diciembre'];

watch(cert, (c) => {
  const i = MESES.indexOf((c.mes || '').toLowerCase());
  if (c.dia && i >= 0 && c.anio) {
    const a = c.anio.length === 2 ? `20${c.anio}` : c.anio;
    datos.fecha_certificacion =
      `${a}-${String(i+1).padStart(2,'0')}-${String(c.dia).padStart(2,'0')}`;
  } else {
    datos.fecha_certificacion = '';
  }
}, { deep: true });

const cambiarTipo = (valor) => {
  const c = { ...datos };
  Object.assign(datos, estadoInicial(), {
    numero_control:c.numero_control, fecha:c.fecha,
    minutos_trabajados:c.minutos_trabajados,
    solicitud_por_telefono:c.solicitud_por_telefono, personal:c.personal,
    salida_de:c.salida_de, hora_salida:c.hora_salida,
    entrada_a:c.entrada_a, hora_entrada:c.hora_entrada,
    direccion:c.direccion, zona:c.zona, solicitante:c.solicitante,
    radiotelefonista:c.radiotelefonista, piloto:c.piloto, unidad:c.unidad,
    personal_destacado:c.personal_destacado, observaciones:c.observaciones,
    reporte_formulado_por:c.reporte_formulado_por,
    conforme_piloto:c.conforme_piloto, vobo_jefe_servicio:c.vobo_jefe_servicio,
    responsable:c.responsable, jefes_servicio:c.jefes_servicio,
    copia_certificada_a:c.copia_certificada_a,
    fecha_certificacion:c.fecha_certificacion,
    tipo_servicio: valor
  });
};

const limpiar = () => {
  const t = datos.tipo_servicio;
  Object.assign(datos, estadoInicial(), { tipo_servicio: t });
  Object.assign(cert, { dia:'', mes:'', anio:'' });
  limpiarConfirmar.value = false;
};

const imprimir = async (enBlanco) => {
  imprimirEnBlanco.value = enBlanco;
  await nextTick();
  window.print();
  setTimeout(() => { imprimirEnBlanco.value = false; }, 500);
};

const guardar = async () => {
  if (!datos.numero_control || !datos.fecha || !datos.direccion) {
    return notif.alerta('Complete el número de control, la fecha y la dirección');
  }
  guardando.value = true;
  try {
    const carga = { ...datos };
    Object.keys(carga).forEach(k => { if (carga[k] === '') carga[k] = null; });
    const { data } = await emergencias.registrar(carga);
    ultimoControl.value = data.emergencia.numero_control;
    notif.exito(`Servicio ${ultimoControl.value} registrado correctamente`);
    limpiar();
    modalGuardado.value = true;
  } catch (e) {
    notif.error(e.response?.data?.mensaje || 'No se pudo registrar el servicio');
  } finally {
    guardando.value = false;
  }
};
</script>

<style scoped>
.selector-tipos {
  display: grid; grid-template-columns: repeat(5, 1fr);
  gap: 11px; margin-bottom: 20px;
}
.tarjeta-tipo {
  display: flex; flex-direction: column; align-items: center; gap: 9px;
  padding: 16px 10px;
  background: var(--superficie);
  border: 1.5px solid var(--borde);
  border-radius: var(--radio-lg);
  color: var(--texto-suave);
  font: inherit; font-size: 12.5px; font-weight: 500;
  cursor: pointer; transition: all var(--transicion);
}
.tarjeta-tipo:hover {
  border-color: var(--rojo-claro); color: var(--texto);
  transform: translateY(-2px); box-shadow: var(--sombra);
}
.tarjeta-tipo.activa {
  background: var(--peligro-fondo);
  border-color: var(--rojo-bomberos);
  color: var(--rojo-bomberos); font-weight: 600;
}
.tipo-icono { display: flex; }

.acciones-hoja {
  display: flex; align-items: center; gap: 10px;
  width: min(29cm, 100%); margin: 16px auto 0;
}

.confirmacion { text-align: center; padding: 6px 0; }
.icono-exito {
  width: 52px; height: 52px; margin: 0 auto 16px;
  display: flex; align-items: center; justify-content: center;
  background: var(--exito-fondo); color: var(--exito);
  border-radius: 50%;
}
.confirmacion p { color: var(--texto-suave); font-size: 14px; }
.confirmacion strong { color: var(--texto); }

@media (max-width: 1100px) { .selector-tipos { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 900px) {
  .acciones-hoja { width: 100%; flex-wrap: wrap; }
  .acciones-hoja .btn { flex: 1; }
}
@media (max-width: 640px) { .selector-tipos { grid-template-columns: repeat(2, 1fr); } }
</style>