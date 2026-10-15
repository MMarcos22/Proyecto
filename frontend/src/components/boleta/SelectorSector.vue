<template>
  <div>
    <div v-if="detectado && sectorId !== detectado.sector.id" class="sugerencia">
      <Icono nombre="mapa" :tam="18" />
      <span class="crecer">¿Es <strong>{{ detectado.sector.nombre }}</strong>? La dirección dice «{{ detectado.coincidencia }}».</span>
      <button type="button" class="btn btn-azul btn-sm" @click="elegir(detectado.sector.id)">Sí</button>
    </div>

    <MenuDesplegable :model-value="sectorId" :opciones="opcionesSector" buscar :filtro="filtroSector"
                     etiqueta="Sector" placeholder="Elija el sector…" @update:model-value="elegir" />
    <p v-if="!catalogos.sectores.length" class="aviso aviso-alerta mt"><Icono nombre="alerta" :tam="18" />No hay sectores registrados. La administración los carga en Configuración.</p>

    <div v-if="lugares.length" class="lugares">
      <span class="rotulo-campo">Lugar crítico</span>
      <select v-model="lugarId" class="control" aria-label="Lugar crítico">
        <option :value="null">Ninguno</option>
        <option v-for="l in lugares" :key="l.id" :value="l.id">{{ l.nombre }}</option>
      </select>
    </div>
  </div>
</template>

<script setup>
import { computed, watch } from 'vue';
import { useCatalogosStore } from '../../stores/catalogos';
import { detectarSector, sectorCoincide, normalizar } from '../../utils/sector';
import Icono from '../Icono.vue';
import MenuDesplegable from '../MenuDesplegable.vue';

// Cuántos sectores se muestran a la vista: los más atendidos del último año
const FRECUENTES = 10;

const props = defineProps({ direccion: { type: String, default: '' } });
const sectorId = defineModel('sector', { default: null });
const lugarId = defineModel('lugar', { default: null });
const catalogos = useCatalogosStore();

// Se propone un sector solo si la dirección menciona su nombre o un lugar de referencia
const detectado = computed(() => detectarSector(props.direccion, catalogos.sectores));

// Primero los más atendidos del último año, luego todos en orden alfabético
const opcionesSector = computed(() => {
  const frecuentes = [...catalogos.sectores]
    .filter(s => s.servicios_anio)
    .sort((a, b) => b.servicios_anio - a.servicios_anio || a.nombre.localeCompare(b.nombre))
    .slice(0, FRECUENTES);
  const resto = catalogos.sectores.filter(s => !frecuentes.includes(s)).sort((a, b) => a.nombre.localeCompare(b.nombre));
  const opcion = (s, grupo) => ({ valor: s.id, texto: s.nombre, sector: s, grupo });
  return frecuentes.length
    ? [...frecuentes.map(s => opcion(s, 'Más atendidos')), ...resto.map(s => opcion(s, 'Todos los sectores'))]
    : resto.map(s => opcion(s, null));
});
const filtroSector = (o, texto) => sectorCoincide(o.sector, texto);

const lugares = computed(() => sectorId.value ? catalogos.lugaresDe(sectorId.value) : []);

const elegir = (id) => {
  if (sectorId.value !== id) lugarId.value = null;
  sectorId.value = id;
};

// Si la dirección menciona un lugar crítico del sector elegido, se marca solo
watch([() => props.direccion, sectorId], () => {
  if (lugarId.value || !sectorId.value) return;
  const t = ` ${normalizar(props.direccion)} `;
  const hallado = lugares.value.find(l => [l.nombre, ...(l.referencias || '').split(',')]
    .map(normalizar).filter(r => r.length > 3).some(r => t.includes(` ${r} `)));
  if (hallado) lugarId.value = hallado.id;
});
</script>

<style scoped>
.sugerencia {
  display: flex; align-items: center; gap: 10px;
  padding: 8px 8px 8px 14px; margin-bottom: 10px;
  border: 1px solid var(--borde-fuerte); border-radius: var(--radio-lg);
  background: var(--superficie-alt); font-size: 14.5px;
}
.sugerencia > svg { color: var(--texto-tenue); flex-shrink: 0; }
.lugares { margin-top: 14px; }
.lugares .rotulo-campo { display: block; margin-bottom: 6px; }
</style>
