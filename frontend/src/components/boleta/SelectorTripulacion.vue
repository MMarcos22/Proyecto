<template>
  <MenuDesplegable v-model="ids" :opciones="opciones" multiple buscar :id="id" :etiqueta="etiqueta"
                   :placeholder="turno ? placeholder : 'Abra el turno de guardia para elegir al personal'" />
</template>

<script setup>
import { computed } from 'vue';
import { useCatalogosStore } from '../../stores/catalogos';
import { personalDeTurno } from '../../utils/turno';
import MenuDesplegable from '../MenuDesplegable.vue';

// Solo se ofrece el personal del turno de guardia: así nadie anota por error a
// alguien que no estaba. Quien ya estaba anotado en la boleta se conserva.
const props = defineProps({
  turno: { type: Object, default: null },
  // personal_id → unidad en la que ya está fuera
  ocupados: { type: Object, default: () => ({}) },
  // personal_id → motivo por el que no se puede elegir aquí (p. ej. ya va en la tripulación)
  excluidos: { type: Object, default: () => ({}) },
  id: { type: String, default: undefined },
  etiqueta: { type: String, default: 'Tripulación' },
  placeholder: { type: String, default: 'Elija al personal de guardia…' }
});
const ids = defineModel({ type: Array, default: () => [] });
const catalogos = useCatalogosStore();

const opciones = computed(() => {
  const nota = (p) => props.ocupados[p.id] ? `en ${props.ocupados[p.id]}`
    : props.excluidos[p.id] || (p.es_piloto ? 'piloto' : p.voluntario ? 'voluntario' : p.escuadra || '');
  return personalDeTurno(catalogos.personal, props.turno, ids.value).map(p => ({
    valor: p.id, texto: p.nombre_completo, nota: nota(p),
    deshabilitado: !ids.value.includes(p.id) && !!(props.ocupados[p.id] || props.excluidos[p.id])
  }));
});
</script>
