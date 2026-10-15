<template>
  <div class="pila-paso">
    <section>
      <h3 class="subtitulo">¿Cuántos galones se distribuyeron?</h3>
      <div class="con-unidad">
        <input v-model.number="d.galones_distribuidos" type="number" min="0" step="100" class="control num" aria-label="Galones" style="max-width:200px" list="dl-galones" />
        <datalist id="dl-galones"><option v-for="g in [500, 1000, 2000, 3000, 5000]" :key="g" :value="g" /></datalist>
        <span>galones</span>
      </div>
    </section>

    <section>
      <h3 class="subtitulo">¿Cómo se distribuyó?</h3>
      <select v-model="d.forma_distribucion" class="control" aria-label="Forma de distribución">
        <option :value="null" disabled>Elija…</option>
        <option v-for="f in FORMAS_DISTRIBUCION" :key="f" :value="f">{{ f }}</option>
      </select>
    </section>

    <div class="rejilla rejilla-2">
      <div class="campo">
        <label for="autorizo">Servicio autorizado por</label>
        <input id="autorizo" v-model="d.servicio_autorizado_por" class="control" list="dl-personal-b" />
      </div>
      <div class="campo">
        <label for="colonia">Colonia</label>
        <input id="colonia" v-model="d.colonia" class="control" />
      </div>
    </div>

    <section class="tarjeta donativo">
      <div class="campo">
        <label for="donativo">Donativo recibido</label>
        <CampoQuetzales id="donativo" v-model="d.donativo" style="max-width:220px" />
        <p v-if="d.donativo" class="letras"><Icono nombre="check" :tam="15" :grosor="3" />{{ letras }}</p>
        <span class="ayuda">La cantidad en letras se escribe sola en la boleta.</span>
      </div>
    </section>

    <div class="campo">
      <label for="nota">Nota</label>
      <input id="nota" v-model="d.nota" class="control" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { FORMAS_DISTRIBUCION, quetzalesEnLetras } from '../../utils/boleta';
import Icono from '../Icono.vue';
import CampoQuetzales from '../CampoQuetzales.vue';

const d = defineModel({ required: true });
const letras = computed(() => quetzalesEnLetras(Number(d.value.donativo)));
</script>

<style scoped>
.con-unidad { display: flex; align-items: center; gap: 10px; font-weight: 600; color: var(--texto-suave); }
.moneda { font-size: 20px; font-weight: 700; color: var(--texto); }
.donativo { padding: 18px 20px 2px; }
.letras { display: flex; align-items: center; gap: 8px; margin-top: 10px; font-weight: 600; color: var(--exito); }
</style>
