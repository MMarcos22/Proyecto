<template>
  <div class="personas">
    <div v-for="(p, i) in modelValue" :key="i" class="persona tarjeta">
      <div class="persona-cabeza">
        <span class="numero">{{ i + 1 }}</span>
        <strong>{{ etiqueta }} {{ i + 1 }}</strong>
        <button v-if="modelValue.length > 1" type="button" class="btn btn-plano btn-sm" @click="quitar(i)">Quitar</button>
      </div>
      <div class="rejilla campos-persona">
        <div class="campo">
          <label :for="`p-nom-${i}`">Nombre completo</label>
          <input :id="`p-nom-${i}`" v-model="p.nombre" class="control" placeholder="Si no se conoce, déjelo vacío" />
        </div>
        <div class="campo">
          <label :for="`p-edad-${i}`">Edad</label>
          <input :id="`p-edad-${i}`" v-model="p.edad" class="control num" inputmode="numeric" placeholder="años" />
        </div>
        <div class="campo domicilio">
          <label :for="`p-dom-${i}`">Domicilio</label>
          <input :id="`p-dom-${i}`" v-model="p.domicilio" class="control" />
        </div>
      </div>
    </div>
    <button type="button" class="btn btn-secundario" @click="agregar"><Icono nombre="mas" :tam="18" :grosor="2.6" />Agregar otra persona</button>
  </div>
</template>

<script setup>
import Icono from '../Icono.vue';

const props = defineProps({ modelValue: { type: Array, required: true }, etiqueta: { type: String, default: 'Persona' } });
const emit = defineEmits(['update:modelValue']);

const agregar = () => emit('update:modelValue', [...props.modelValue, { nombre: '', edad: '', domicilio: '' }]);
const quitar = (i) => emit('update:modelValue', props.modelValue.filter((_, j) => j !== i));
</script>

<style scoped>
.personas { display: flex; flex-direction: column; gap: 14px; align-items: flex-start; }
.persona { width: 100%; padding: 16px 18px 2px; }
.persona-cabeza { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.persona-cabeza strong { flex: 1; font-size: 16px; }
.numero { width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: var(--azul-tenue); color: var(--azul-texto); font-weight: 700; }
.campos-persona { grid-template-columns: 1fr 120px; gap: 0 14px; }
.domicilio { grid-column: 1 / -1; }
@media (max-width: 560px) { .campos-persona { grid-template-columns: 1fr; } }
</style>
