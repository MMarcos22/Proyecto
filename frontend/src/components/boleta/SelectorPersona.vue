<template>
  <!-- Una persona del turno de guardia; la boleta guarda su nombre (así va en papel) -->
  <MenuDesplegable v-model="nombre" :opciones="opciones" buscar :id="id" :etiqueta="etiqueta"
                   :placeholder="turno ? 'Elija del personal de guardia…' : 'Sin turno: no hay personal para elegir'" />
</template>

<script setup>
import { computed } from 'vue';
import { useCatalogosStore } from '../../stores/catalogos';
import { personalDeTurno } from '../../utils/turno';
import MenuDesplegable from '../MenuDesplegable.vue';

const props = defineProps({
  turno: { type: Object, default: null },
  id: { type: String, default: undefined },
  etiqueta: { type: String, default: undefined }
});
const nombre = defineModel({ type: String, default: '' });
const catalogos = useCatalogosStore();

const opciones = computed(() => {
  const lista = personalDeTurno(catalogos.personal, props.turno, [nombre.value])
    .map(p => ({ valor: p.nombre_completo, texto: p.nombre_completo, nota: p.cargo || p.escuadra || '' }));
  // Un nombre escrito antes a mano (o «No aplica») se conserva para no perderlo
  if (nombre.value && !lista.some(o => o.valor === nombre.value)) lista.unshift({ valor: nombre.value, texto: nombre.value, nota: 'anotado antes' });
  return lista;
});
</script>
