<template>
  <div class="pila-paso">
    <section>
      <h3 class="subtitulo">Pacientes</h3>
      <PersonasLista v-model="d.pacientes" etiqueta="Paciente" />
    </section>

    <section>
      <h3 class="subtitulo">¿Hubo fallecidos?</h3>
      <div class="opciones dos">
        <button type="button" class="opcion" :class="{ elegida: !d.hubo_fallecidos }" @click="d.hubo_fallecidos = false">No</button>
        <button type="button" class="opcion" :class="{ elegida: d.hubo_fallecidos }" @click="d.hubo_fallecidos = true">Sí</button>
      </div>
      <div v-if="d.hubo_fallecidos" class="campo mt">
        <label for="fallecidos">Nombre de los fallecidos</label>
        <input id="fallecidos" v-model="d.fallecidos" class="control" />
      </div>
    </section>

    <section>
      <h3 class="subtitulo">¿A dónde se trasladó?</h3>
      <div class="opciones" style="--min-opcion: 170px">
        <button v-for="x in DESTINOS_AMBULANCIA" :key="x.valor" type="button" class="opcion"
                :class="{ elegida: d.destino.tipo === x.valor }" @click="d.destino = { tipo: x.valor, detalle: d.destino.tipo === x.valor ? d.destino.detalle : '' }">
          {{ x.nombre }}
        </button>
      </div>
      <div v-if="destinoActual?.pideNombre" class="campo mt">
        <label for="destino-detalle">{{ destinoActual.pideNombre }}</label>
        <input id="destino-detalle" v-model="d.destino.detalle" class="control" />
      </div>
    </section>

    <section>
      <div class="campo">
        <label for="acomp">Acompañantes</label>
        <input id="acomp" v-model="d.acompanantes" class="control" />
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { DESTINOS_AMBULANCIA } from '../../utils/boleta';
import PersonasLista from './PersonasLista.vue';

const d = defineModel({ required: true });
const destinoActual = computed(() => DESTINOS_AMBULANCIA.find(x => x.valor === d.value.destino?.tipo));
</script>
