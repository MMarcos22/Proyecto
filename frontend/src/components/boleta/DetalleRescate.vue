<template>
  <div class="pila-paso">
    <section>
      <h3 class="subtitulo">Personas rescatadas</h3>
      <PersonasLista v-model="d.pacientes" etiqueta="Persona" />
    </section>

    <section>
      <h3 class="subtitulo">¿Cómo se recibió el aviso?</h3>
      <select v-model="d.forma_aviso" class="control" aria-label="Forma de aviso">
        <option :value="null" disabled>Elija…</option>
        <option v-for="f in FORMAS_AVISO" :key="f" :value="f">{{ f }}</option>
      </select>
    </section>

    <section>
      <div class="campo">
        <label for="traslado">¿A dónde se trasladó?</label>
        <input id="traslado" v-model="d.traslado_a" class="control" placeholder="Hospital Modular, a su domicilio…" />
      </div>
    </section>
  </div>
</template>

<script setup>
import { FORMAS_AVISO } from '../../utils/boleta';
import PersonasLista from './PersonasLista.vue';
const d = defineModel({ required: true });
</script>
