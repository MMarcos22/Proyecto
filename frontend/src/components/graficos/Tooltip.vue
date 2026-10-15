<template>
  <div v-if="visible" class="tooltip" :style="{ left: x + 'px', top: y + 'px' }" role="status">
    <slot />
  </div>
</template>

<script setup>
defineProps({ visible: Boolean, x: Number, y: Number });
</script>

<style scoped>
.tooltip {
  position: absolute; z-index: 20;
  transform: translate(-50%, calc(-100% - 10px));
  min-width: 120px; max-width: 240px;
  padding: 8px 10px;
  background: var(--texto); color: var(--superficie);
  border-radius: var(--radio);
  font-size: 12px; line-height: 1.45;
  pointer-events: none;
  box-shadow: var(--sombra-md);
  white-space: nowrap;
}
.tooltip :deep(strong) { display: block; font-weight: 650; margin-bottom: 3px; }
.tooltip :deep(.fila-t) { display: flex; align-items: center; gap: 7px; justify-content: space-between; }
.tooltip :deep(.fila-t i) { width: 8px; height: 8px; border-radius: 2px; flex-shrink: 0; }
.tooltip :deep(.fila-t span:first-of-type) { flex: 1; opacity: .8; }
.tooltip :deep(.mono) { font-family: var(--fuente-mono); }
</style>
