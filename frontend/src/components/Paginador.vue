<template>
  <div v-if="total > tamano" class="paginador">
    <span class="tenue">
      <span class="mono">{{ desde }}–{{ hasta }}</span> de <span class="mono">{{ total }}</span>
    </span>
    <div class="fila">
      <button class="btn btn-secundario btn-sm btn-icono" :disabled="pagina <= 1"
              @click="$emit('update:pagina', pagina - 1)" aria-label="Página anterior">
        <Icono nombre="flecha_izq" :tam="14" />
      </button>
      <span class="mono actual">{{ pagina }} / {{ paginas }}</span>
      <button class="btn btn-secundario btn-sm btn-icono" :disabled="pagina >= paginas"
              @click="$emit('update:pagina', pagina + 1)" aria-label="Página siguiente">
        <Icono nombre="flecha_der" :tam="14" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import Icono from './Icono.vue';

const props = defineProps({ total: Number, pagina: Number, tamano: Number });
defineEmits(['update:pagina']);

const paginas = computed(() => Math.max(1, Math.ceil(props.total / props.tamano)));
const desde = computed(() => (props.pagina - 1) * props.tamano + 1);
const hasta = computed(() => Math.min(props.total, props.pagina * props.tamano));
</script>

<style scoped>
.paginador {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 14px; border-top: 1px solid var(--borde);
  font-size: 12.5px;
}
.actual { font-size: 12px; color: var(--texto-suave); min-width: 54px; text-align: center; }
</style>
