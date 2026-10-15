<template>
  <div ref="raiz" class="menu-desplegable" @keydown.esc.stop="cerrar">
    <button :id="id" type="button" class="control desplegable" :class="{ 'sin-valor': !resumen }" :disabled="disabled"
            :aria-expanded="abierto" aria-haspopup="listbox" :aria-label="etiqueta" @click="alternar" @keydown.down.prevent="abrir">
      <span class="resumen">{{ resumen || placeholder }}</span>
    </button>

    <div v-if="abierto" class="panel" :class="{ arriba }" :style="{ '--alto-lista': altoLista + 'px' }">
      <input v-if="conBusqueda" ref="campoBusca" v-model="busca" class="control control-sm busca" placeholder="Buscar…"
             aria-label="Buscar" @keydown.down.prevent="mover(1)" @keydown.up.prevent="mover(-1)" @keydown.enter.prevent="elegirResaltada" />
      <ul class="lista" role="listbox" :aria-multiselectable="multiple" @keydown.down.prevent="mover(1)" @keydown.up.prevent="mover(-1)">
        <template v-for="(g, gi) in grupos" :key="gi">
          <li v-if="g.nombre" class="grupo" role="presentation">{{ g.nombre }}</li>
          <li v-for="o in g.opciones" :key="String(o.valor)" role="option" :aria-selected="esElegida(o)" :aria-disabled="!!o.deshabilitado">
            <button type="button" :ref="(el) => el && (botones[visibles.indexOf(o)] = el)" :disabled="o.deshabilitado"
                    :class="{ elegida: esElegida(o), resaltada: visibles.indexOf(o) === resaltada }" @click="elegir(o)">
              <span class="marca" aria-hidden="true">{{ esElegida(o) ? '✓' : '' }}</span>
              <span class="crecer">{{ o.texto }}</span>
              <small v-if="o.nota" class="tenue">{{ o.nota }}</small>
            </button>
          </li>
        </template>
        <li v-if="!visibles.length" class="tenue nadie">{{ busca ? 'Nada coincide' : 'No hay opciones' }}</li>
      </ul>
      <div v-if="multiple" class="pie">
        <button v-if="elegidos.length" type="button" class="btn btn-sm" @click="modelo = []">Quitar todos</button>
        <button type="button" class="btn btn-primario btn-sm" @click="cerrar">Listo</button>
      </div>
    </div>
  </div>
</template>

<script setup>
// Menú desplegable para elegir una o varias opciones, con búsqueda cuando la lista es larga.
// Cada opción: { valor, texto, nota?, deshabilitado?, grupo? }
import { ref, computed, nextTick, onMounted, onBeforeUnmount } from 'vue';
import { normalizar } from '../utils/sector';

const props = defineProps({
  opciones: { type: Array, default: () => [] },
  multiple: { type: Boolean, default: false },
  placeholder: { type: String, default: 'Elija…' },
  // Texto de la opción «nada elegido» en selección única (null si no se permite)
  vacio: { type: String, default: null },
  // Búsqueda: true/false, o automática si hay más de 8 opciones
  buscar: { type: Boolean, default: undefined },
  // Coincidencia propia para la búsqueda: (opcion, texto) => boolean
  filtro: { type: Function, default: null },
  id: { type: String, default: undefined },
  etiqueta: { type: String, default: undefined },
  disabled: { type: Boolean, default: false }
});
const modelo = defineModel({ default: null });

const raiz = ref(null);
const campoBusca = ref(null);
const abierto = ref(false);
const busca = ref('');
const resaltada = ref(-1);
const botones = ref([]);
// Hacia dónde abre: arriba si abajo no cabe (la barra fija inferior de las boletas ocupa ~100 px)
const arriba = ref(false);
const altoLista = ref(280);

const conBusqueda = computed(() => props.buscar ?? props.opciones.length > 8);
const elegidos = computed(() => props.multiple ? (modelo.value || []) : []);
const esElegida = (o) => props.multiple ? elegidos.value.includes(o.valor) : modelo.value === o.valor;

const coincide = (o) => !busca.value || (props.filtro ? props.filtro(o, busca.value) : normalizar(o.texto).includes(normalizar(busca.value)));
const todas = computed(() => props.vacio != null && !props.multiple
  ? [{ valor: null, texto: props.vacio }, ...props.opciones] : props.opciones);
const grupos = computed(() => {
  const lista = [];
  for (const o of todas.value.filter(coincide)) {
    let g = lista.find(x => x.nombre === (o.grupo || null));
    if (!g) lista.push(g = { nombre: o.grupo || null, opciones: [] });
    g.opciones.push(o);
  }
  return lista;
});
const visibles = computed(() => grupos.value.flatMap(g => g.opciones));

const resumen = computed(() => {
  if (!props.multiple) return props.opciones.find(o => o.valor === modelo.value)?.texto || (modelo.value == null ? '' : String(modelo.value));
  const nombres = elegidos.value.map(v => props.opciones.find(o => o.valor === v)?.texto).filter(Boolean);
  if (nombres.length <= 2) return nombres.join(' y ');
  return `${nombres.slice(0, 2).join(', ')} y ${nombres.length - 2} más`;
});

const abrir = async () => {
  if (props.disabled || abierto.value) return;
  const caja = raiz.value.getBoundingClientRect();
  const abajo = window.innerHeight - caja.bottom - 110;
  const encima = caja.top - 80;
  arriba.value = abajo < 260 && encima > abajo;
  altoLista.value = Math.max(140, Math.min(280, (arriba.value ? encima : abajo) - (conBusqueda.value ? 60 : 12) - (props.multiple ? 50 : 0)));
  abierto.value = true;
  busca.value = '';
  botones.value = [];
  resaltada.value = visibles.value.findIndex(esElegida);
  await nextTick();
  if (campoBusca.value) campoBusca.value.focus();
  else botones.value[Math.max(resaltada.value, 0)]?.focus();
};
const cerrar = () => { abierto.value = false; };
const alternar = () => (abierto.value ? cerrar() : abrir());

const elegir = (o) => {
  if (o.deshabilitado) return;
  if (props.multiple) {
    modelo.value = esElegida(o) ? elegidos.value.filter(v => v !== o.valor) : [...elegidos.value, o.valor];
    return;
  }
  modelo.value = o.valor;
  cerrar();
  raiz.value?.querySelector('.desplegable')?.focus();
};
const mover = (paso) => {
  const n = visibles.value.length;
  if (!n) return;
  let i = resaltada.value;
  for (let k = 0; k < n; k++) {
    i = (i + paso + n) % n;
    if (!visibles.value[i].deshabilitado) break;
  }
  resaltada.value = i;
  if (!campoBusca.value) botones.value[i]?.focus();
};
const elegirResaltada = () => {
  const o = visibles.value[resaltada.value] || visibles.value.find(x => !x.deshabilitado);
  if (o) elegir(o);
  if (props.multiple) busca.value = '';
};

const fuera = (e) => { if (abierto.value && raiz.value && !raiz.value.contains(e.target)) cerrar(); };
onMounted(() => document.addEventListener('pointerdown', fuera));
onBeforeUnmount(() => document.removeEventListener('pointerdown', fuera));
</script>

<style scoped>
.menu-desplegable { position: relative; width: 100%; }
.desplegable { display: flex; align-items: center; text-align: left; }
.resumen { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.desplegable.sin-valor .resumen { color: var(--texto-tenue); }
.panel {
  position: absolute; z-index: 60; top: calc(100% + 4px); left: 0; right: 0; min-width: 260px;
  padding: 6px; background: var(--superficie);
  border: 1px solid var(--borde); border-radius: var(--radio-lg); box-shadow: var(--sombra-md);
}
.panel.arriba { top: auto; bottom: calc(100% + 4px); }
.busca { margin-bottom: 6px; }
.lista { list-style: none; margin: 0; padding: 0; max-height: var(--alto-lista, 280px); overflow-y: auto; }
.grupo { padding: 8px 10px 4px; font-size: 12px; font-weight: 600; color: var(--texto-tenue); text-transform: uppercase; letter-spacing: .04em; }
.lista button {
  display: flex; align-items: center; gap: 8px; width: 100%; text-align: left; padding: 9px 10px;
  border: none; background: none; font: inherit; font-size: 14.5px; color: var(--texto);
  border-radius: var(--radio-sm); cursor: pointer;
}
.lista button:hover:not(:disabled), .lista button.resaltada, .lista button:focus-visible { background: var(--superficie-alt); outline: none; }
.lista button.elegida { font-weight: 600; }
.lista button:disabled { opacity: .45; cursor: not-allowed; }
.marca { width: 14px; flex-shrink: 0; font-size: 12px; font-weight: 700; color: var(--sel); }
.lista small { font-size: 12px; }
.nadie { padding: 9px 10px; font-size: 14px; }
.pie { display: flex; justify-content: flex-end; gap: 8px; padding-top: 6px; margin-top: 6px; border-top: 1px solid var(--borde); }
</style>
