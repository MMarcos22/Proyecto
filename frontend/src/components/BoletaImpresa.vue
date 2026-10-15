<template>
  <!-- Boleta oficial en hoja oficio, en solo lectura. Es lo que se imprime. -->
  <div class="hoja-oficio boleta-impresa" :class="{ 'modo-blanco': enBlanco }">
    <div class="bol-encabezado">
      <img src="/LogoBomberos.png" alt="Logo" />
      <div>
        <h2>BENEMÉRITO CUERPO VOLUNTARIO DE BOMBEROS DE GUATEMALA</h2>
        <h3>{{ titulo }}</h3>
      </div>
    </div>

    <div class="bol-cuerpo" inert>
      <component :is="COMPONENTES[d.tipo_servicio]" v-model="d" />

      <div class="bol-observaciones">
        <span class="bol-et">Observaciones:</span>
        <textarea :value="d.observaciones || ''" readonly></textarea>
      </div>

      <template v-if="d.tipo_servicio === 'incendio'">
        <div class="bol-firmas-col">
          <div class="bol-firma-bloque">
            <span class="bol-et">Responsable:</span>
            <input :value="d.responsable || ''" class="bol-linea" readonly />
          </div>
          <div class="bol-firma-bloque">
            <span class="bol-et">Jefes de Servicio:</span>
            <input :value="d.jefes_servicio || ''" class="bol-linea" readonly />
          </div>
        </div>
        <div class="bol-firma-rubrica">
          <div><div class="raya-f">(f)</div></div>
          <div><div class="raya-f">(f)</div></div>
        </div>
      </template>

      <template v-else>
        <div class="bol-firmas-linea">
          <div class="bol-firma-fila" v-for="f in FIRMAS" :key="f.campo">
            <span class="bol-et">{{ f.texto }}</span>
            <input :value="d[f.campo] || ''" class="bol-linea" readonly />
            <span class="bol-firma-f">f.</span>
            <input class="bol-linea w-lg" readonly />
          </div>
        </div>

        <template v-if="llevaCertificacion">
          <p class="bol-razon">
            Razón: {{ d.tipo_servicio === 'ambulancia'
              ? 'La Secretaría Ejecutiva del Cuerpo, para que conste que en esta fecha y a solicitud en esta fecha se extiende copia certificada de este reporte a Sr. (a) (ita):'
              : 'la pone la Secretaría Ejecutiva del Cuerpo, para que conste que en esta fecha a su solicitud se extiende copia certificada de este reporte.' }}
          </p>
          <div class="bol-razon-fila">
            <span class="bol-et">Sr. (a) (ita)</span>
            <input :value="d.copia_certificada_a || ''" class="bol-linea" readonly />
          </div>
          <div class="bol-lugar">
            <span>Guatemala,</span>
            <input :value="cert.dia" class="bol-linea w-xs" readonly />
            <span>de</span>
            <input :value="cert.mes" class="bol-linea w-lg" readonly />
            <span>de 20</span>
            <input :value="cert.anio" class="bol-linea w-xs" readonly />
          </div>
          <div class="bol-secretaria">
            <div class="raya-sec"></div>
            <span>{{ d.tipo_servicio === 'rescate' ? 'Secretaria Ejecutiva' : 'Secretaria' }}</span>
          </div>
        </template>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { TIPOS, useCatalogosStore } from '../stores/catalogos';
import { conNoAplica } from '../utils/boleta';
import { MESES } from '../utils/formato';
import BolAmbulancia from './formularios/BolAmbulancia.vue';
import BolIncendio from './formularios/BolIncendio.vue';
import BolRescate from './formularios/BolRescate.vue';
import BolVarios from './formularios/BolVarios.vue';
import BolAgua from './formularios/BolAgua.vue';

const COMPONENTES = { ambulancia: BolAmbulancia, incendio: BolIncendio, rescate: BolRescate, varios: BolVarios, agua: BolAgua };
const FIRMAS = [
  { campo: 'reporte_formulado_por', texto: 'Reporte formulado por:' },
  { campo: 'conforme_piloto', texto: 'Es conforme el piloto:' },
  { campo: 'vobo_jefe_servicio', texto: 'Vo. Bo. Jefe de Servicio:' }
];

const props = defineProps({
  datos: { type: Object, required: true },   // campos tal como los guarda la base de datos
  enBlanco: { type: Boolean, default: false }
});

const catalogos = useCatalogosStore();

// Copia local: los formatos usan v-model, pero aquí nada se edita.
// Los campos marcados "No aplica" se imprimen con ese texto (la revisión
// distingue así un campo olvidado de uno que no corresponde).
const d = ref({});
watch(() => [props.datos, catalogos.dominio], () => {
  const v = props.datos;
  const base = { ...v, hora_salida: v.hora_salida?.slice(0, 5) || '', hora_entrada: v.hora_entrada?.slice(0, 5) || '' };
  d.value = conNoAplica(base, catalogos.camposBoleta(v.tipo_servicio), v.no_aplica || []);
}, { immediate: true, deep: true });

const titulo = computed(() => TIPOS.find(t => t.valor === d.value.tipo_servicio)?.titulo || '');
const llevaCertificacion = computed(() => ['ambulancia', 'rescate', 'varios'].includes(d.value.tipo_servicio));
const cert = computed(() => {
  const f = d.value.fecha_certificacion;
  if (!f) return { dia: '', mes: '', anio: '' };
  const [a, m, dia] = f.split('-');
  return { dia: String(Number(dia)), mes: MESES[Number(m) - 1], anio: a.slice(2) };
});
</script>

<style scoped>
.boleta-impresa :deep(input),
.boleta-impresa :deep(textarea) { pointer-events: none; }
/* En papel no se muestran los iconos de calendario y reloj de los campos */
.boleta-impresa :deep(input::-webkit-calendar-picker-indicator) { display: none; }
.boleta-impresa :deep(input[type=date]), .boleta-impresa :deep(input[type=time]) { appearance: none; -webkit-appearance: none; }
</style>
