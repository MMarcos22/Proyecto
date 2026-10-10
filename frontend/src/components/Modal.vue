<template>
  <teleport to="body">
    <transition name="modal">
      <div v-if="modelValue" class="modal-velo" @click.self="cerrar">
        <div class="modal-caja" :style="{ maxWidth: ancho }">
          <div class="modal-cabecera">
            <h3>{{ titulo }}</h3>
            <button class="modal-cerrar" @click="cerrar">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div class="modal-cuerpo">
            <slot />
          </div>

          <div v-if="$slots.acciones" class="modal-acciones">
            <slot name="acciones" />
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup>
import { watch } from 'vue';

const props = defineProps({
  modelValue: Boolean,
  titulo: { type: String, default: '' },
  ancho:  { type: String, default: '540px' }
});

const emit = defineEmits(['update:modelValue']);
const cerrar = () => emit('update:modelValue', false);

watch(() => props.modelValue, (abierto) => {
  document.body.style.overflow = abierto ? 'hidden' : '';
});
</script>

<style scoped>
.modal-velo {
  position: fixed; inset: 0; z-index: 8000;
  display: flex; align-items: center; justify-content: center;
  padding: 24px;
  background: rgba(15,20,28,.55);
  backdrop-filter: blur(3px);
}

.modal-caja {
  width: 100%;
  max-height: 88vh;
  display: flex; flex-direction: column;
  background: var(--superficie);
  border: 1px solid var(--borde);
  border-radius: var(--radio-lg);
  box-shadow: var(--sombra-lg);
  overflow: hidden;
}

.modal-cabecera {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 22px;
  border-bottom: 1px solid var(--borde);
  flex-shrink: 0;
}
.modal-cabecera h3 { color: var(--texto); }

.modal-cerrar {
  display: flex; padding: 6px;
  background: none; border: none; border-radius: var(--radio-sm);
  color: var(--texto-tenue); cursor: pointer;
  transition: all var(--transicion);
}
.modal-cerrar:hover { background: var(--superficie-alt); color: var(--texto); }

.modal-cuerpo { padding: 22px; overflow-y: auto; flex: 1; }

.modal-acciones {
  display: flex; justify-content: flex-end; gap: 10px;
  padding: 16px 22px;
  background: var(--superficie-alt);
  border-top: 1px solid var(--borde);
  flex-shrink: 0;
}

.modal-enter-active .modal-caja { animation: escalar 260ms cubic-bezier(.2,.9,.3,1.1) both; }
.modal-enter-active { transition: opacity 200ms ease; }
.modal-leave-active { transition: opacity 160ms ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-leave-active .modal-caja { transition: transform 160ms ease; transform: scale(.97); }

@media (max-width: 640px) {
  .modal-velo { padding: 14px; align-items: flex-end; }
  .modal-caja { max-height: 92vh; }
}
</style>