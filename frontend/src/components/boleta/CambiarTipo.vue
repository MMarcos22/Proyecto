<template>
  <!-- Al llegar resultó ser otro servicio: la boleta cambia de tipo sin rehacerla -->
  <Modal v-model="abierto" titulo="Cambiar el tipo de servicio" ancho="560px">
    <p class="suave mb">
      Se conservan la fecha, las horas de salida y entrada, la dirección, la unidad, el piloto y la tripulación.
      La causa y los datos propios del tipo se llenan de nuevo.
    </p>
    <div class="opciones-tipo">
      <button v-for="t in opciones" :key="t.valor" type="button" class="opcion opcion-tipo" :class="[`tipo-${t.valor}`, { elegida: nuevo === t.valor }]"
              :aria-pressed="nuevo === t.valor" @click="nuevo = t.valor">
        <span class="icono-tipo"><Icono :nombre="t.valor" :tam="18" :grosor="2.2" /></span>
        <span class="texto"><strong>{{ t.nombre }}</strong><small>{{ AYUDA[t.valor] }}</small></span>
      </button>
    </div>
    <p v-if="nuevo && boleta.numero_control" class="aviso aviso-info mt">
      <Icono nombre="info" :tam="18" />
      <span>Recibirá el siguiente número de {{ nombreTipo(nuevo).toLowerCase() }}. El número {{ boleta.numero_control }} queda anotado en la revisión diaria como cambio de tipo y no se vuelve a usar.</span>
    </p>
    <template #acciones>
      <button class="btn btn-secundario" @click="abierto = false">Cancelar</button>
      <button class="btn btn-primario" :disabled="!nuevo || guardando" @click="cambiar">
        <span v-if="guardando" class="cargador"></span>Cambiar a {{ nuevo ? nombreTipo(nuevo).toLowerCase() : '…' }}
      </button>
    </template>
  </Modal>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { emergencias, mensajeError } from '../../services/api';
import { useNotificacionesStore } from '../../stores/notificaciones';
import { TIPOS, nombreTipo } from '../../stores/catalogos';
import Modal from '../Modal.vue';
import Icono from '../Icono.vue';

const props = defineProps({
  boleta: { type: Object, required: true },   // { id, tipo_servicio, numero_control }
  autor: { type: Object, default: undefined }  // { personal_id, pin } si la boleta se completa con PIN
});
const abierto = defineModel({ type: Boolean, default: false });
const emit = defineEmits(['cambiado']);
const notif = useNotificacionesStore();

// Los casos que contó la compañía, para elegir sin dudar
const AYUDA = {
  ambulancia: 'Se atendió o trasladó a un paciente (salió herido o con problemas para respirar)',
  incendio: 'Hubo fuego que controlar',
  rescate: 'Hubo que liberar o sacar a alguien (atrapado entre hierros, dentro de la casa)',
  varios: 'No se completó el servicio: el herido se fue por su cuenta o se lo llevaron, falsa alarma',
  agua: 'Se distribuyó agua'
};

const nuevo = ref(null);
const guardando = ref(false);
const opciones = computed(() => TIPOS.filter(t => t.valor !== props.boleta.tipo_servicio));
watch(abierto, (v) => { if (v) nuevo.value = null; });

const cambiar = async () => {
  guardando.value = true;
  try {
    const { data } = await emergencias.cambiarTipo(props.boleta.id, nuevo.value, props.autor);
    notif.exito(data.mensaje);
    abierto.value = false;
    emit('cambiado', data);
  } catch (e) {
    notif.error(mensajeError(e, 'No se pudo cambiar el tipo de servicio'));
  } finally {
    guardando.value = false;
  }
};
</script>

<style scoped>
.opciones-tipo { display: flex; flex-direction: column; gap: 8px; }
.opcion-tipo { justify-content: flex-start; gap: 12px; min-height: 58px; padding: 8px 14px; text-align: left; }
.icono-tipo {
  width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent);
}
.texto { display: flex; flex-direction: column; }
.texto strong { font-size: 15px; }
.texto small { font-size: 13px; color: var(--texto-suave); font-weight: 400; }
</style>
