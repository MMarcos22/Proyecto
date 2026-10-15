<template>
  <div class="pila-paso">
    <section>
      <h3 class="subtitulo">¿Qué se quemó?</h3>
      <p class="ayuda-sub">Puede elegir ambos.</p>
      <div class="opciones dos">
        <button type="button" class="opcion" :class="{ elegida: d.hay_inmueble }" @click="d.hay_inmueble = !d.hay_inmueble">
          <span class="marca-check" aria-hidden="true">{{ d.hay_inmueble ? '✓' : '' }}</span>
          <span>Inmueble<small>casa, local, terreno</small></span>
        </button>
        <button type="button" class="opcion" :class="{ elegida: d.hay_vehiculo }" @click="d.hay_vehiculo = !d.hay_vehiculo">
          <span class="marca-check" aria-hidden="true">{{ d.hay_vehiculo ? '✓' : '' }}</span>
          <span>Vehículo<small>carro, moto, camión</small></span>
        </button>
      </div>
    </section>

    <section>
      <h3 class="subtitulo">Causa probable</h3>
      <input id="causas" v-model="d.causas" class="control" list="dl-causas" placeholder="Elija o descríbala…" aria-label="Causa probable" />
      <datalist id="dl-causas"><option v-for="c in CAUSAS_INCENDIO" :key="c" :value="c" /></datalist>
    </section>

    <section v-if="d.hay_inmueble" class="tarjeta bloque-detalle">
      <h3 class="subtitulo">Inmueble</h3>
      <div class="rejilla rejilla-2">
        <div class="campo"><label for="i-prop">Propietario</label><input id="i-prop" v-model="d.prop_propietario" class="control" /></div>
        <div class="campo"><label for="i-sitio">Dónde empezó el fuego</label><input id="i-sitio" v-model="d.sitio_inicio" class="control" placeholder="cocina, bodega…" /></div>
        <div class="campo"><label for="i-valor">Valor aproximado</label><CampoQuetzales id="i-valor" v-model="d.valor_inmueble" /></div>
        <div class="campo"><label for="i-perd">Pérdidas aproximadas</label><CampoQuetzales id="i-perd" v-model="d.perdidas_inmueble" /></div>
        <div class="campo ancho">
          <label for="i-aseg">Compañía aseguradora</label>
          <div class="con-no-aplica">
            <input id="i-aseg" v-model="d.aseguradora_inmueble" class="control" :disabled="d.aseguradora_inmueble === NO_APLICA" />
            <button type="button" class="opcion opcion-sm" :class="{ elegida: d.aseguradora_inmueble === NO_APLICA }" @click="alternarNoAplica('aseguradora_inmueble')">No aplica</button>
          </div>
          <span class="ayuda">Si no tiene seguro, marque «No aplica»: así sale en la boleta y nadie lo llena a mano después.</span>
        </div>
      </div>
    </section>

    <section v-if="d.hay_vehiculo" class="tarjeta bloque-detalle">
      <h3 class="subtitulo">Vehículo</h3>
      <div class="rejilla rejilla-2">
        <div class="campo"><label for="v-prop">Propietario</label><input id="v-prop" v-model="d.veh_propietario" class="control" /></div>
        <div class="campo"><label for="v-cond">Conductor</label><input id="v-cond" v-model="d.conductor" class="control" /></div>
        <div class="campo"><label for="v-tipo">Tipo</label><input id="v-tipo" v-model="d.descripcion_tipo" class="control" list="dl-tipos-veh" placeholder="automóvil, pick-up…" /></div>
        <div class="campo"><label for="v-placas">Placas</label><input id="v-placas" v-model="d.placas" class="control mono" style="text-transform:uppercase" /></div>
        <div class="campo"><label for="v-marca">Marca</label><input id="v-marca" v-model="d.marca" class="control" /></div>
        <div class="campo"><label for="v-modelo">Modelo</label><input id="v-modelo" v-model="d.modelo" class="control" /></div>
        <div class="campo"><label for="v-valor">Valor aproximado</label><CampoQuetzales id="v-valor" v-model="d.valor_vehiculo" /></div>
        <div class="campo"><label for="v-perd">Pérdidas aproximadas</label><CampoQuetzales id="v-perd" v-model="d.perdidas_vehiculo" /></div>
        <div class="campo ancho">
          <label for="v-aseg">Compañía aseguradora</label>
          <div class="con-no-aplica">
            <input id="v-aseg" v-model="d.aseguradora_vehiculo" class="control" :disabled="d.aseguradora_vehiculo === NO_APLICA" />
            <button type="button" class="opcion opcion-sm" :class="{ elegida: d.aseguradora_vehiculo === NO_APLICA }" @click="alternarNoAplica('aseguradora_vehiculo')">No aplica</button>
          </div>
        </div>
      </div>
      <datalist id="dl-tipos-veh"><option v-for="t in ['Automóvil', 'Pick-up', 'Motocicleta', 'Camión', 'Bus', 'Microbús']" :key="t" :value="t" /></datalist>
    </section>
  </div>
</template>

<script setup>
import { CAUSAS_INCENDIO, NO_APLICA } from '../../utils/boleta';
import CampoQuetzales from '../CampoQuetzales.vue';
const d = defineModel({ required: true });

// «No aplica» se escribe en el campo mismo: así se guarda y se imprime en la boleta
const alternarNoAplica = (campo) => {
  d.value[campo] = d.value[campo] === NO_APLICA ? '' : NO_APLICA;
};
</script>

<style scoped>
.bloque-detalle { padding: 18px 20px 2px; }
.ancho { grid-column: 1 / -1; }
.con-no-aplica { display: flex; gap: 8px; align-items: stretch; }
.con-no-aplica .control { flex: 1; }
.opcion-sm { min-height: 0; padding: 0 14px; font-size: 14px; white-space: nowrap; flex: 0 0 auto; }
.marca-check {
  width: 26px; height: 26px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  border: 1px solid var(--borde); border-radius: 8px; font-size: 15px;
}
.elegida .marca-check { background: var(--azul); border-color: var(--azul); color: #fff; }
</style>
