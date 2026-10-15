<template>
  <div class="animar">
    <div class="titulo-seccion">
      <div>
        <h1>Catálogos</h1>
      </div>
      <div class="acciones">
        <button v-if="pestana === 'sectores'" class="btn btn-secundario" @click="modalImportar = true"><Icono nombre="entrada" :tam="15" />Importar lista</button>
        <button v-if="pestana !== 'pendientes'" class="btn btn-primario" @click="abrir()"><Icono nombre="mas" :tam="15" />{{ CONFIG[pestana].nuevo }}</button>
      </div>
    </div>

    <div class="segmentos mb" role="tablist">
      <button v-for="(c, k) in CONFIG" :key="k" role="tab" :aria-selected="pestana === k" :class="{ activo: pestana === k }" @click="pestana = k">
        {{ c.titulo }} <span class="cuenta">{{ k === 'pendientes' ? pendientesTotal : listas[k]?.filter(x => x.activo).length ?? 0 }}</span>
      </button>
    </div>

    <!-- ══ SECTORES ══════════════════════════ -->
    <template v-if="pestana === 'sectores'">
      <div v-if="!listas.sectores.length && !cargando" class="tarjeta vacio">
        <Icono nombre="mapa" :tam="30" />
        <strong>Todavía no hay sectores</strong>
        <p>Cargue las zonas, barrios, colonias y aldeas que atiende la compañía. Puede pegarlas todas de una vez con «Importar lista».</p>
        <div class="fila" style="justify-content:center">
          <button class="btn btn-secundario btn-sm" @click="modalImportar = true">Importar lista</button>
          <button class="btn btn-primario btn-sm" @click="abrir()">Agregar uno</button>
        </div>
      </div>
      <div v-else class="tabla-contenedor">
        <table>
          <thead><tr><th>Sector</th><th>Tipo</th><th>Referencias para ubicar direcciones</th><th class="num">Boletas</th><th></th></tr></thead>
          <tbody>
            <tr v-for="s in listas.sectores" :key="s.id" :class="{ atenuada: !s.activo }">
              <td class="celda-principal">{{ s.nombre }} <span v-if="!s.activo" class="etiqueta et-neutra">Retirado</span></td>
              <td class="suave">{{ nombreTipoSector(s.tipo) }}</td>
              <td class="referencias">{{ s.referencias || '—' }}</td>
              <td class="num">{{ s.servicios }}</td>
              <td class="der acciones-fila">
                <button class="btn btn-plano btn-sm btn-icono" @click="abrir(s)" :aria-label="`Editar ${s.nombre}`"><Icono nombre="editar" :tam="14" /></button>
                <button v-if="s.activo" class="btn btn-plano btn-sm btn-icono" @click="retirar(s)" :aria-label="`Retirar ${s.nombre}`"><Icono nombre="papelera" :tam="14" /></button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- ══ PERSONAL ══════════════════════════ -->
    <div v-else-if="pestana === 'personal'" class="tabla-contenedor">
      <table>
        <thead><tr><th>Nombre</th><th>Cargo</th><th>Escuadra</th><th>PIN</th><th></th></tr></thead>
        <tbody>
          <tr v-for="p in listas.personal" :key="p.id" :class="{ atenuada: !p.activo }">
            <td class="celda-principal">{{ p.nombre_completo }} <span v-if="!p.activo" class="etiqueta et-neutra">Retirado</span>
              <span class="celda-sec">{{ [p.es_piloto && 'Piloto', p.voluntario && 'Voluntario'].filter(Boolean).join(' · ') }}</span></td>
            <td class="suave">{{ p.cargo || '—' }}</td>
            <td>{{ p.escuadra || '—' }}</td>
            <td><span class="etiqueta" :class="p.tiene_pin ? 'et-exito' : 'et-alerta'">{{ p.tiene_pin ? 'Asignado' : 'Sin PIN' }}</span></td>
            <td class="der acciones-fila">
              <button class="btn btn-plano btn-sm btn-icono" @click="abrir(p)" :aria-label="`Editar ${p.nombre_completo}`"><Icono nombre="editar" :tam="14" /></button>
              <button v-if="p.activo" class="btn btn-plano btn-sm btn-icono" @click="retirar(p)" :aria-label="`Retirar ${p.nombre_completo}`"><Icono nombre="papelera" :tam="14" /></button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="!listas.personal.length && !cargando" class="vacio"><strong>Sin personal registrado</strong><p>Registre a cada bombero con su escuadra y su PIN. El PIN le permite completar las boletas de los servicios en los que participó.</p></div>
    </div>

    <!-- ══ UNIDADES ══════════════════════════ -->
    <div v-else-if="pestana === 'unidades'" class="tabla-contenedor">
      <table>
        <thead><tr><th>Código</th><th>Descripción</th><th>Atiende</th><th>Piloto asignado</th><th>Estado</th><th></th></tr></thead>
        <tbody>
          <tr v-for="u in listas.unidades" :key="u.id" :class="{ atenuada: !u.activo }">
            <td class="mono celda-principal">{{ u.codigo }} <span v-if="!u.activo" class="etiqueta et-neutra">Retirada</span></td>
            <td class="suave">{{ u.descripcion || '—' }}</td>
            <td class="suave">{{ (u.servicios || []).map(corteTipo).join(', ') || '—' }}</td>
            <td>{{ u.piloto || '—' }}</td>
            <td><span class="etiqueta" :class="{ servicio: 'et-exito', reposicion: 'et-neutra', taller: 'et-alerta' }[u.estado]">{{ catalogosStore.dominio?.ESTADOS_UNIDAD?.[u.estado] || u.estado }}</span></td>
            <td class="der acciones-fila">
              <button class="btn btn-plano btn-sm btn-icono" @click="abrir(u)" :aria-label="`Editar ${u.codigo}`"><Icono nombre="editar" :tam="14" /></button>
              <button v-if="u.activo" class="btn btn-plano btn-sm btn-icono" @click="retirar(u)" :aria-label="`Retirar ${u.codigo}`"><Icono nombre="papelera" :tam="14" /></button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="!listas.unidades.length && !cargando" class="vacio"><strong>Sin unidades registradas</strong></div>
    </div>

    <!-- ══ ESCUADRAS ═════════════════════════ -->
    <div v-else-if="pestana === 'escuadras'" class="tabla-contenedor">
      <table>
        <thead><tr><th>Escuadra</th><th class="num">Integrantes</th><th></th></tr></thead>
        <tbody>
          <tr v-for="e in listas.escuadras" :key="e.id" :class="{ atenuada: !e.activo }">
            <td class="celda-principal">{{ e.nombre }} <span v-if="!e.activo" class="etiqueta et-neutra">Retirada</span></td>
            <td class="num">{{ e.integrantes }}</td>
            <td class="der acciones-fila">
              <button class="btn btn-plano btn-sm btn-icono" @click="abrir(e)" :aria-label="`Editar ${e.nombre}`"><Icono nombre="editar" :tam="14" /></button>
              <button v-if="e.activo" class="btn btn-plano btn-sm btn-icono" @click="retirar(e)" :aria-label="`Retirar ${e.nombre}`"><Icono nombre="papelera" :tam="14" /></button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="!listas.escuadras.length && !cargando" class="vacio"><strong>Sin escuadras</strong><p>Las escuadras rotan cada 24 horas. Al abrir el turno se elige la escuadra y su personal queda de guardia.</p></div>
    </div>

    <!-- ══ LUGARES CRÍTICOS ══════════════════ -->
    <div v-else-if="pestana === 'lugares'" class="tabla-contenedor">
      <table>
        <thead><tr><th>Lugar</th><th>Sector</th><th>Otros nombres</th><th class="num">Servicios</th><th></th></tr></thead>
        <tbody>
          <tr v-for="l in listas.lugares" :key="l.id" :class="{ atenuada: !l.activo }">
            <td class="celda-principal">{{ l.nombre }} <span v-if="!l.activo" class="etiqueta et-neutra">Retirado</span></td>
            <td>{{ l.sector }}</td>
            <td class="referencias">{{ l.referencias || '—' }}</td>
            <td class="num">{{ l.servicios }}</td>
            <td class="der acciones-fila">
              <button class="btn btn-plano btn-sm btn-icono" @click="abrir(l)" :aria-label="`Editar ${l.nombre}`"><Icono nombre="editar" :tam="14" /></button>
              <button v-if="l.activo" class="btn btn-plano btn-sm btn-icono" @click="retirar(l)" :aria-label="`Retirar ${l.nombre}`"><Icono nombre="papelera" :tam="14" /></button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="!listas.lugares.length && !cargando" class="vacio"><strong>Sin lugares críticos</strong><p>Registre los puntos donde la compañía sabe que se repiten los accidentes, como la entrada a una colonia o una curva. Aparecen en el informe para la mesa interinstitucional.</p></div>
    </div>

    <!-- ══ BOLETAS SIN SECTOR ═══════════════ -->
    <template v-else>
      <p class="sub-p">Boletas que se registraron sin sector (por ejemplo, las anteriores a este catálogo). Asigne cada zona escrita a un sector y todas las boletas con ese texto quedarán corregidas.</p>
      <div class="tabla-contenedor">
        <table>
          <thead><tr><th>Zona escrita en la boleta</th><th class="num">Boletas</th><th style="width:320px">Asignar a</th></tr></thead>
          <tbody>
            <tr v-for="p in pendientes" :key="p.zona">
              <td class="celda-principal">{{ p.zona }}</td>
              <td class="num">{{ p.boletas }}</td>
              <td>
                <div class="fila">
                  <select v-model="asignacion[p.zona]" class="control control-sm" :disabled="p.zona === '(vacío)'">
                    <option value="">Elija un sector…</option>
                    <option v-for="s in catalogosStore.sectores" :key="s.id" :value="s.id">{{ s.nombre }}</option>
                  </select>
                  <button class="btn btn-primario btn-sm" :disabled="!asignacion[p.zona]" @click="asignar(p)">Asignar</button>
                </div>
                <span v-if="p.zona === '(vacío)'" class="celda-sec">Sin texto de zona: asígnelas una por una desde la boleta.</span>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="!pendientes.length" class="vacio"><Icono nombre="check" :tam="26" /><strong>Todas las boletas tienen sector</strong></div>
      </div>
    </template>

    <!-- ══ MODAL EDICIÓN ═════════════════════ -->
    <AsistenteModal v-model="modal" :titulo="(form.id ? 'Editar ' : 'Nuevo ') + CONFIG[pestana].singular" :pasos="pasosCatalogo"
                    :guardando="procesando" texto-final="Guardar" @finalizar="guardar">
      <template #paso-0>
        <template v-if="pestana === 'sectores'">
          <input v-model="form.nombre" class="control mb" placeholder="Zona 1, Barrio El Centro, Aldea…" aria-label="Nombre del sector" />
          <span class="rotulo-c">¿Qué es?</span>
          <select v-model="form.tipo" class="control" aria-label="Tipo de sector">
            <option v-for="t in catalogosStore.tiposSector" :key="t.valor" :value="t.valor">{{ t.nombre }}</option>
          </select>
        </template>
        <input v-else-if="pestana === 'personal'" v-model="form.nombre_completo" class="control" placeholder="Nombre y apellidos" aria-label="Nombre completo" />
        <input v-else-if="pestana === 'escuadras'" v-model="form.nombre" class="control" placeholder="Escuadra A" aria-label="Nombre de la escuadra" />
        <template v-else-if="pestana === 'lugares'">
          <input v-model="form.nombre" class="control mb" placeholder="Entrada a la colonia Pradera" aria-label="Nombre del lugar" />
          <span class="rotulo-c">¿En qué sector está?</span>
          <select v-model="form.sector_id" class="control">
            <option :value="null">Elija el sector…</option>
            <option v-for="sct in listas.sectores.filter(x => x.activo)" :key="sct.id" :value="sct.id">{{ sct.nombre }}</option>
          </select>
        </template>
        <template v-else-if="pestana === 'unidades'">
          <input v-model="form.codigo" class="control mono mb" placeholder="U-391" aria-label="Código de la unidad" />
          <span class="rotulo-c">¿Qué tipo de vehículo es?</span>
          <input v-model="form.descripcion" class="control mb" placeholder="Elija o escriba…" aria-label="Descripción" list="dl-vehiculos" />
          <datalist id="dl-vehiculos"><option v-for="t in ['Ambulancia', 'Cisterna', 'Unidad de rescate', 'Pick-up', 'Motobomba']" :key="t" :value="t" /></datalist>
          <span class="rotulo-c">¿Qué servicios atiende?</span>
          <MenuDesplegable v-model="form.servicios" :opciones="TIPOS.map(t => ({ valor: t.valor, texto: t.nombre }))" multiple
                           etiqueta="Servicios que atiende" placeholder="Elija los servicios…" />
        </template>
      </template>
      <template #paso-1>
        <template v-if="pestana === 'sectores'">
          <textarea v-model="form.referencias" class="control" rows="4" placeholder="Mercado municipal, parque central, calle del Calvario" aria-label="Referencias"></textarea>
          <p class="tenue mt">Separados por coma. Si una dirección los menciona, se propone este sector.</p>
        </template>
        <template v-else-if="pestana === 'personal'">
          <span class="rotulo-c">Cargo</span>
          <input v-model="form.cargo" class="control mb" placeholder="Elija o escriba…" aria-label="Cargo" list="dl-cargos" />
          <datalist id="dl-cargos"><option v-for="c in ['Piloto', 'Cabinista', 'Bombero', 'Jefe de servicio', 'Paramédico', 'Administración']" :key="c" :value="c" /></datalist>
          <span class="rotulo-c">Escuadra</span>
          <select v-model="form.escuadra_id" class="control mb" aria-label="Escuadra">
            <option :value="null">Sin escuadra</option>
            <option v-for="e in listas.escuadras.filter(x => x.activo)" :key="e.id" :value="e.id">{{ e.nombre }}</option>
          </select>
          <label class="casilla"><input v-model="form.es_piloto" type="checkbox" /> Es piloto</label>
          <label class="casilla"><input v-model="form.voluntario" type="checkbox" /> Es voluntario</label>
        </template>
        <template v-else-if="pestana === 'unidades'">
          <select v-model="form.piloto_id" class="control mb" aria-label="Piloto fijo">
            <option :value="null">Sin piloto fijo</option>
            <option v-for="p in listas.personal.filter(x => x.activo && x.es_piloto)" :key="p.id" :value="p.id">{{ p.nombre_completo }}</option>
          </select>
          <span class="rotulo-c">¿En qué estado está?</span>
          <select v-model="form.estado" class="control" aria-label="Estado de la unidad">
            <option v-for="(n, v) in catalogosStore.dominio?.ESTADOS_UNIDAD" :key="v" :value="v">{{ n }}</option>
          </select>
        </template>
        <template v-else-if="pestana === 'lugares'">
          <textarea v-model="form.referencias" class="control" rows="3" placeholder="ingreso a pradera, entrada pradera" aria-label="Otros nombres"></textarea>
          <p class="tenue mt">Separados por coma. Si una dirección los menciona, se marca este lugar.</p>
        </template>
      </template>
      <template #paso-2>
        <template v-if="pestana === 'personal'">
          <input v-model="form.pin" class="control mono pin" inputmode="numeric" maxlength="4" placeholder="0000" aria-label="PIN de 4 dígitos" />
          <p class="tenue mt">{{ form.tiene_pin ? 'Ya tiene un PIN. Escriba uno nuevo solo si quiere cambiarlo.' : 'Cuatro dígitos que solo esta persona conozca. Con él completa las boletas de sus servicios.' }}</p>
        </template>
      </template>
    </AsistenteModal>

    <Modal v-model="modalImportar" titulo="Importar sectores" ancho="600px">
      <p class="suave mb" style="font-size:13px">Pegue un sector por línea. Opcionalmente agregue el tipo y las referencias separados por punto y coma.</p>
      <pre class="ejemplo mono">Zona 1; zona; parque central, mercado municipal
Barrio El Calvario; barrio; iglesia El Calvario
Petapilla; aldea</pre>
      <textarea v-model="textoImportar" class="control mono" rows="9" style="font-size:12.5px" placeholder="Un sector por línea"></textarea>
      <p class="ayuda" style="margin-top:6px;font-size:12px;color:var(--texto-tenue)">{{ lineasImportar.length }} sector(es) listos. Tipos válidos: {{ catalogosStore.tiposSector.map(t => t.valor).join(', ') }}. Si no indica tipo se usa «zona».</p>
      <template #acciones>
        <button class="btn btn-secundario" @click="modalImportar = false">Cancelar</button>
        <button class="btn btn-primario" :disabled="!lineasImportar.length || procesando" @click="importar">
          <span v-if="procesando" class="cargador"></span>Importar {{ lineasImportar.length }}
        </button>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { catalogos, mensajeError } from '../services/api';
import { useCatalogosStore, TIPOS, corteTipo } from '../stores/catalogos';
import { useNotificacionesStore } from '../stores/notificaciones';
import Modal from '../components/Modal.vue';
import AsistenteModal from '../components/AsistenteModal.vue';
import Icono from '../components/Icono.vue';
import MenuDesplegable from '../components/MenuDesplegable.vue';

const CONFIG = {
  sectores: { titulo: 'Sectores', singular: 'sector', nuevo: 'Sector', vacio: () => ({ id: null, nombre: '', tipo: 'zona', referencias: '' }) },
  escuadras: { titulo: 'Escuadras', singular: 'escuadra', nuevo: 'Escuadra', vacio: () => ({ id: null, nombre: '' }) },
  personal: { titulo: 'Personal', singular: 'integrante', nuevo: 'Integrante', vacio: () => ({ id: null, nombre_completo: '', cargo: '', escuadra_id: null, es_piloto: false, voluntario: false, pin: '' }) },
  unidades: { titulo: 'Unidades', singular: 'unidad', nuevo: 'Unidad', vacio: () => ({ id: null, codigo: '', descripcion: '', piloto_id: null, estado: 'servicio', servicios: [] }) },
  lugares: { titulo: 'Lugares críticos', singular: 'lugar crítico', nuevo: 'Lugar', vacio: () => ({ id: null, nombre: '', sector_id: null, referencias: '' }) },
  pendientes: { titulo: 'Boletas sin sector', singular: '', nuevo: '' }
};

const ruta = useRoute();
const router = useRouter();
const catalogosStore = useCatalogosStore();
const notif = useNotificacionesStore();

const pestana = ref(CONFIG[ruta.query.pestana] ? ruta.query.pestana : 'sectores');
const listas = reactive({ sectores: [], personal: [], unidades: [], escuadras: [], lugares: [] });
const pendientes = ref([]);
const asignacion = reactive({});
const cargando = ref(true);
const procesando = ref(false);
const modal = ref(false);
const modalImportar = ref(false);
const textoImportar = ref('');
const form = reactive({});

const pasosCatalogo = computed(() => ({
  sectores: [
    { pregunta: '¿Cómo se llama el sector?', obligatorio: true, valido: !!form.nombre?.trim(), falta: 'Escriba el nombre' },
    { pregunta: '¿Cómo lo describe la gente?', ayuda: 'Opcional. Permite reconocer el sector cuando la dirección menciona uno de estos lugares.' }
  ],
  personal: [
    { pregunta: '¿Cómo se llama?', obligatorio: true, valido: !!form.nombre_completo?.trim(), falta: 'Escriba el nombre' },
    { pregunta: '¿Qué cargo tiene y en qué escuadra está?' },
    { pregunta: 'PIN personal', valido: !form.pin || /^\d{4}$/.test(form.pin), falta: 'El PIN debe tener 4 dígitos' }
  ],
  unidades: [
    { pregunta: '¿Cuál es el código de la unidad?', obligatorio: true, valido: !!form.codigo?.trim(), falta: 'Escriba el código' },
    { pregunta: '¿Quién la maneja y en qué estado está?' }
  ],
  escuadras: [
    { pregunta: '¿Cómo se llama la escuadra?', obligatorio: true, valido: !!form.nombre?.trim(), falta: 'Escriba el nombre' }
  ],
  lugares: [
    { pregunta: '¿Cómo se llama el lugar y dónde está?', obligatorio: true, valido: !!form.nombre?.trim() && !!form.sector_id, falta: 'Escriba el nombre y elija el sector' },
    { pregunta: '¿Cómo lo menciona la gente?', ayuda: 'Opcional.' }
  ]
}[pestana.value] || [{ pregunta: '' }]));

const pendientesTotal = computed(() => pendientes.value.reduce((a, p) => a + p.boletas, 0));
const nombreTipoSector = (t) => catalogosStore.tiposSector.find(x => x.valor === t)?.nombre || t;

const lineasImportar = computed(() => textoImportar.value.split('\n').map(l => l.trim()).filter(Boolean).map(l => {
  const [nombre, tipo, ...refs] = l.split(';').map(x => x.trim());
  const valido = catalogosStore.tiposSector.some(t => t.valor === (tipo || '').toLowerCase());
  return { nombre, tipo: valido ? tipo.toLowerCase() : 'zona', referencias: refs.join('; ') || (!valido && tipo ? tipo : '') };
}).filter(x => x.nombre));

const cargar = async () => {
  cargando.value = true;
  try {
    const [s, p, u, z, e, l] = await Promise.all([
      catalogos.sectores.listar(true), catalogos.personal.listar(true),
      catalogos.unidades.listar(true), catalogos.zonasSinSector(),
      catalogos.escuadras.listar(true), catalogos.lugares.listar(true)
    ]);
    listas.sectores = s.data;
    listas.personal = p.data;
    listas.unidades = u.data;
    listas.escuadras = e.data;
    listas.lugares = l.data;
    pendientes.value = z.data;
  } catch (e) {
    notif.error(mensajeError(e, 'No se pudieron cargar los catálogos'));
  } finally {
    cargando.value = false;
  }
};

const refrescar = async () => {
  await cargar();
  catalogosStore.cargar(true).catch(() => {});
};

const abrir = (item = null) => {
  Object.keys(form).forEach(k => delete form[k]);
  Object.assign(form, CONFIG[pestana.value].vacio(), item || {}, { pin: '' });
  modal.value = true;
};

const guardar = async () => {
  procesando.value = true;
  try {
    const api = catalogos[pestana.value];
    form.id ? await api.editar(form.id, form) : await api.crear(form);
    notif.exito('Guardado');
    modal.value = false;
    refrescar();
  } catch (e) {
    notif.error(mensajeError(e));
  } finally {
    procesando.value = false;
  }
};

const retirar = async (item) => {
  const nombre = item.nombre || item.nombre_completo || item.codigo;
  if (!confirm(`¿Retirar «${nombre}» del catálogo? Las boletas que ya lo usan no cambian.`)) return;
  try {
    const { data } = await catalogos[pestana.value].retirar(item.id);
    notif.exito(data.mensaje);
    refrescar();
  } catch (e) {
    notif.error(mensajeError(e));
  }
};

const importar = async () => {
  procesando.value = true;
  let ok = 0;
  const errores = [];
  for (const l of lineasImportar.value) {
    try {
      await catalogos.sectores.crear(l);
      ok++;
    } catch (e) {
      errores.push(`${l.nombre}: ${mensajeError(e)}`);
    }
  }
  procesando.value = false;
  if (ok) notif.exito(`${ok} sector(es) importados`);
  if (errores.length) notif.alerta(`No se importaron ${errores.length}: ${errores.slice(0, 3).join(' · ')}`);
  textoImportar.value = '';
  modalImportar.value = false;
  refrescar();
};

const asignar = async (p) => {
  try {
    const { data } = await catalogos.asignarSector({ zona_texto: p.zona, sector_id: asignacion[p.zona] });
    notif.exito(data.mensaje);
    refrescar();
  } catch (e) {
    notif.error(mensajeError(e));
  }
};

watch(pestana, (p) => router.replace({ query: { pestana: p } }));
onMounted(() => {
  catalogosStore.cargar().catch(() => {});
  cargar();
});
</script>

<style scoped>
.referencias { color: var(--texto-suave); font-size: 12.5px; max-width: 420px; }
.acciones-fila { white-space: nowrap; width: 80px; }
.sub-p { font-size: 13px; color: var(--texto-suave); margin-bottom: 14px; max-width: 80ch; }
.ejemplo { font-size: 11.5px; padding: 10px 12px; margin-bottom: 10px; background: var(--superficie-hundida); border-radius: var(--radio); color: var(--texto-suave); white-space: pre-wrap; }
.rotulo-c { display: block; margin: 4px 0 10px; font-size: 15px; font-weight: 700; }
.casilla { display: flex; align-items: center; gap: 10px; min-height: 36px; font-size: 15px; cursor: pointer; }
.casilla input { width: 18px; height: 18px; accent-color: var(--sel); }
.pin { max-width: 160px; font-size: 24px; letter-spacing: .4em; text-align: center; }
</style>
