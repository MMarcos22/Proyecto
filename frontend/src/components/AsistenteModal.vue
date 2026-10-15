<template>
  <teleport to="body">
    <transition name="asistente">
      <div v-if="modelValue" class="velo-asistente" @click.self="cerrar" @keydown.esc="cerrar">
        <div class="asistente" role="dialog" :aria-label="titulo" :style="{ maxWidth: ancho }">
          <header class="cabeza">
            <div class="crecer">
              <span class="titulo-asis">{{ titulo }}</span>
              <span v-if="pasos.length > 1" class="contador-paso">Paso {{ paso + 1 }} de {{ pasos.length }}</span>
            </div>
            <button class="btn btn-plano btn-icono" @click="cerrar" aria-label="Cerrar"><Icono nombre="cerrar" :tam="20" /></button>
          </header>
          <div v-if="pasos.length > 1" class="segmentos-paso" aria-hidden="true">
            <span v-for="(p, i) in pasos" :key="i" :class="{ hecho: i <= paso }"></span>
          </div>

          <form class="cuerpo" @submit.prevent="continuar" :id="idForm">
            <h2 class="pregunta">{{ pasos[paso]?.pregunta }}<span v-if="pasos[paso]?.obligatorio" class="req">*</span></h2>
            <p v-if="pasos[paso]?.ayuda" class="ayuda-paso">{{ pasos[paso].ayuda }}</p>
            <transition :name="direccion" mode="out-in">
              <div :key="paso" class="contenido-paso">
                <slot :name="`paso-${paso}`" />
              </div>
            </transition>
          </form>

          <footer class="pie" :class="{ 'con-error': mensajeFalta }">
            <span v-if="mensajeFalta" class="falta"><Icono nombre="info" :tam="16" />{{ mensajeFalta }}</span>
            <div class="crecer"></div>
            <button v-if="paso > 0" type="button" class="btn btn-secundario btn-lg" @click="atras">Atrás</button>
            <button type="submit" :form="idForm" class="btn btn-lg" :class="esUltimo ? claseFinal : 'btn-primario'" :disabled="!pasoValido || guardando">
              <span v-if="guardando" class="cargador"></span>
              {{ esUltimo ? textoFinal : 'Continuar' }}
            </button>
          </footer>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue';
import Icono from './Icono.vue';

// pasos: [{ pregunta, ayuda?, valido?: boolean, falta?: string, obligatorio?: boolean }]
const props = defineProps({
  modelValue: Boolean,
  titulo: { type: String, default: '' },
  pasos: { type: Array, required: true },
  textoFinal: { type: String, default: 'Guardar' },
  claseFinal: { type: String, default: 'btn-primario' },
  guardando: Boolean,
  ancho: { type: String, default: '640px' }
});
const emit = defineEmits(['update:modelValue', 'finalizar']);

const paso = ref(0);
const direccion = ref('adelante');
const idForm = `asis-${Math.random().toString(36).slice(2, 8)}`;

const esUltimo = computed(() => paso.value === props.pasos.length - 1);
const pasoValido = computed(() => props.pasos[paso.value]?.valido !== false);
const mensajeFalta = computed(() => (pasoValido.value ? '' : props.pasos[paso.value]?.falta || ''));

watch(() => props.modelValue, (v) => {
  if (v) { paso.value = 0; direccion.value = 'adelante'; }
  document.body.style.overflow = v ? 'hidden' : '';
});
onUnmounted(() => {
  if (props.modelValue) document.body.style.overflow = '';
});

const continuar = () => {
  if (!pasoValido.value || props.guardando) return;
  if (esUltimo.value) return emit('finalizar');
  direccion.value = 'adelante';
  paso.value++;
};
const atras = () => { direccion.value = 'atras'; paso.value--; };
const cerrar = () => emit('update:modelValue', false);

defineExpose({ irA: (n) => { paso.value = n; } });
</script>

<style scoped>
.velo-asistente {
  position: fixed; inset: 0; z-index: 8000;
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
  background: rgba(16, 24, 40, .45);
}
.asistente {
  width: 100%; max-height: 92vh;
  display: flex; flex-direction: column;
  background: var(--superficie);
  border-radius: var(--radio-xl);
  box-shadow: var(--sombra-lg);
  overflow: hidden;
}
.cabeza { display: flex; align-items: center; gap: 12px; padding: 18px 20px 12px 28px; }
.titulo-asis { display: block; font-size: 14px; font-weight: 600; color: var(--rojo-bomberos); }
.contador-paso { display: block; font-size: 13px; color: var(--texto-tenue); }
.segmentos-paso { display: flex; gap: 6px; padding: 0 28px; }
.segmentos-paso span { flex: 1; height: 4px; border-radius: 999px; background: var(--superficie-hundida); transition: background 200ms ease; }
.segmentos-paso span.hecho { background: var(--acento); }

.cuerpo { flex: 1; overflow-y: auto; padding: 22px 28px 12px; }
.pregunta { font-size: 22px; font-weight: 700; line-height: 1.25; margin-bottom: 6px; }
.ayuda-paso { color: var(--texto-suave); margin-bottom: 14px; }
.contenido-paso { padding-top: 10px; }

.pie {
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
  padding: 16px 28px;
  border-top: 1px solid var(--borde);
  background: var(--superficie-alt);
}
.falta { display: flex; align-items: center; gap: 8px; font-size: 14.5px; font-weight: 500; color: var(--texto-suave); }
.pie .btn { min-width: 140px; }

.asistente-enter-active, .asistente-leave-active { transition: opacity 160ms ease; }
.asistente-enter-active .asistente { animation: escalar 200ms ease both; }
.asistente-enter-from, .asistente-leave-to { opacity: 0; }

.adelante-enter-active, .adelante-leave-active, .atras-enter-active, .atras-leave-active { transition: opacity 130ms ease, transform 130ms ease; }
.adelante-enter-from { opacity: 0; transform: translateX(14px); }
.adelante-leave-to { opacity: 0; transform: translateX(-14px); }
.atras-enter-from { opacity: 0; transform: translateX(-14px); }
.atras-leave-to { opacity: 0; transform: translateX(14px); }

@media (max-width: 640px) {
  .velo-asistente { padding: 0; align-items: stretch; }
  .asistente { max-height: none; border-radius: 0; }
  .cabeza { padding: 14px 14px 10px 18px; }
  .segmentos-paso { padding: 0 18px; }
  .cuerpo { padding: 18px 18px 10px; }
  .pie { padding: 12px 18px; }
  .pie .btn { flex: 1; min-width: 0; }
}
</style>
