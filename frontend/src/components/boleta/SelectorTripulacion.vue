<template>
  <MenuDesplegable v-model="ids" :opciones="opciones" multiple buscar :id="id" :etiqueta="etiqueta" :placeholder="placeholder" />
</template>

<script setup>
import { computed } from 'vue';
import { useCatalogosStore } from '../../stores/catalogos';
import MenuDesplegable from '../MenuDesplegable.vue';

const props = defineProps({
  turno: { type: Object, default: null },
  // personal_id → unidad en la que ya está fuera
  ocupados: { type: Object, default: () => ({}) },
  // personal_id → motivo por el que no se puede elegir aquí (p. ej. ya va en la tripulación)
  excluidos: { type: Object, default: () => ({}) },
  id: { type: String, default: undefined },
  etiqueta: { type: String, default: 'Tripulación' },
  placeholder: { type: String, default: 'Elija al personal…' }
});
const ids = defineModel({ type: Array, default: () => [] });
const catalogos = useCatalogosStore();

// De guardia: quienes anotó el turno (o su escuadra); se listan primero
const enTurno = (p) => props.turno && (props.turno.personal?.includes(p.nombre_completo) || (props.turno.escuadra_id && p.escuadra_id === props.turno.escuadra_id));

const opciones = computed(() => {
  const nota = (p) => props.ocupados[p.id] ? `en ${props.ocupados[p.id]}`
    : props.excluidos[p.id] || (p.es_piloto ? 'piloto' : p.voluntario ? 'voluntario' : p.escuadra || '');
  const opcion = (p, grupo) => ({
    valor: p.id, texto: p.nombre_completo, nota: nota(p), grupo,
    deshabilitado: !ids.value.includes(p.id) && !!(props.ocupados[p.id] || props.excluidos[p.id])
  });
  const guardia = catalogos.personal.filter(enTurno);
  if (!guardia.length) return catalogos.personal.map(p => opcion(p, null));
  return [
    ...guardia.map(p => opcion(p, 'De guardia')),
    ...catalogos.personal.filter(p => !guardia.includes(p)).map(p => opcion(p, 'Resto del personal'))
  ];
});
</script>
