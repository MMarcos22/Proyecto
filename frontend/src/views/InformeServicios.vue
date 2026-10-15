<template>
  <div class="animar">
    <div class="titulo-seccion">
      <div>
        <router-link to="/informes" class="volver no-imprimir"><Icono nombre="flecha_izq" :tam="13" />Informes</router-link>
        <h1>Servicios atendidos</h1>
        <p class="sub no-imprimir">Elija la fecha y vea cada incidente: dirección, unidades, piloto, tripulación, a dónde se llevó a cada paciente e insumos usados.</p>
      </div>
      <div class="acciones no-imprimir">
        <button class="btn btn-secundario" :disabled="!datos?.incidentes.length" @click="exportar"><Icono nombre="descargar" :tam="16" />Excel</button>
        <button class="btn btn-primario" :disabled="!datos?.incidentes.length" @click="imprimir"><Icono nombre="imprimir" :tam="16" />Imprimir</button>
      </div>
    </div>

    <div class="barra-filtros no-imprimir">
      <div class="dias-rapidos segmentos" role="group" aria-label="Día">
        <button type="button" :class="{ activo: esDia(hoy()) }" @click="dia(hoy())">Hoy</button>
        <button type="button" :class="{ activo: esDia(sumarDias(hoy(), -1)) }" @click="dia(sumarDias(hoy(), -1))">Ayer</button>
      </div>
      <SelectorPeriodo :key="clavePeriodo" v-model="periodo" />
    </div>

    <div class="tarjeta filtros no-imprimir">
      <div class="campo">
        <label for="f-personal">Personal</label>
        <MenuDesplegable id="f-personal" v-model="f.personal_id" :opciones="opcionesPersonal" vacio="Todo el personal" buscar etiqueta="Personal" placeholder="Todo el personal" />
      </div>
      <div class="campo">
        <label for="f-unidad">Unidad</label>
        <select id="f-unidad" v-model="f.unidad_id" class="control control-sm">
          <option value="">Todas</option>
          <option v-for="u in catalogos.unidades" :key="u.id" :value="String(u.id)">{{ u.codigo }}</option>
        </select>
      </div>
      <div class="campo">
        <label for="f-insumo">Insumo usado</label>
        <MenuDesplegable id="f-insumo" v-model="f.insumo_id" :opciones="opcionesInsumo" vacio="Cualquier insumo" buscar etiqueta="Insumo" placeholder="Cualquier insumo" />
      </div>
      <div class="campo">
        <label for="f-tipo">Tipo</label>
        <select id="f-tipo" v-model="f.tipo_servicio" class="control control-sm">
          <option value="">Todos</option>
          <option v-for="t in TIPOS" :key="t.valor" :value="t.valor">{{ t.nombre }}</option>
        </select>
      </div>
      <div class="campo crecer">
        <label for="f-texto">Buscar</label>
        <input id="f-texto" v-model="texto" type="search" class="control control-sm" placeholder="Paciente, dirección, solicitante o número" />
      </div>
      <button class="btn btn-plano btn-sm" :disabled="!hayFiltros" @click="limpiar">Quitar filtros</button>
    </div>

    <EncabezadoInforme titulo="Servicios atendidos" :periodo="textoPeriodo" :destinatario="resumenFiltros" />

    <div v-if="cargando && !datos" class="esqueleto" style="height:240px"></div>

    <template v-else-if="datos">
      <p class="resumen">
        <strong>{{ plural(datos.incidentes.length, 'incidente', 'incidentes') }}</strong> · {{ plural(datos.boletas, 'boleta', 'boletas') }} · {{ textoPeriodo }}
        <span v-if="datos.limitado" class="tenue"> · se muestran las primeras 500 boletas; acorte el periodo</span>
      </p>

      <div v-if="!datos.incidentes.length" class="vacio tarjeta">
        <Icono nombre="historial" :tam="28" />
        <strong>Ningún servicio coincide</strong>
        <p>Pruebe con otra fecha u otros filtros.</p>
      </div>

      <article v-for="inc in datos.incidentes" :key="inc.incidente_id" class="tarjeta incidente">
        <header class="inc-cabecera">
          <span class="icono-tipo" :class="`tipo-${inc.tipo_servicio}`"><Icono :nombre="inc.tipo_servicio" :tam="18" :grosor="2.2" /></span>
          <div class="crecer">
            <h3>{{ nombreTipo(inc.tipo_servicio) }}<template v-if="inc.causa"> · {{ inc.causa }}</template></h3>
            <p class="suave">{{ fechaLarga(inc.fecha) }}<template v-if="inc.hora_aviso">, llamada {{ hora(inc.hora_aviso) }}</template><template v-if="inc.hora_salida"> · salida {{ hora(inc.hora_salida) }}</template></p>
          </div>
          <span v-if="inc.boletas.length > 1" class="etiqueta et-info">{{ inc.boletas.length }} unidades</span>
        </header>

        <dl class="inc-datos">
          <div class="ancho"><dt>Dirección</dt><dd>{{ inc.direccion }}<template v-if="inc.sector"> · {{ inc.sector }}</template><template v-if="inc.lugar_critico"> ({{ inc.lugar_critico }})</template></dd></div>
          <div><dt>Solicitante</dt><dd>{{ inc.solicitante || '—' }}<template v-if="inc.telefono"> · {{ inc.telefono }}</template></dd></div>
          <div><dt>Radiotelefonista</dt><dd>{{ inc.radiotelefonista || '—' }}</dd></div>
        </dl>

        <section v-for="b in inc.boletas" :key="b.id" class="boleta-unidad">
          <div class="bu-cabecera">
            <strong class="mono">{{ b.numero_control || 'Sin número' }}</strong>
            <span>Unidad <strong>{{ b.unidad || '—' }}</strong></span>
            <span class="tenue">{{ hora(b.hora_salida) }}–{{ hora(b.hora_entrada) }}<template v-if="b.minutos_trabajados != null"> · {{ minutos(b.minutos_trabajados) }}</template></span>
            <span class="etiqueta" :class="CLASE_ESTADO[b.estado]">{{ catalogos.nombreEstado(b.estado) }}</span>
            <router-link :to="`/historial/${b.id}`" class="btn-enlace no-imprimir">Ver boleta</router-link>
          </div>
          <dl class="bu-datos">
            <div><dt>Piloto</dt><dd>{{ b.piloto || '—' }}</dd></div>
            <div><dt>Tripulación</dt><dd>{{ b.tripulacion.join(', ') || '—' }}</dd></div>
            <div v-if="b.personal_destacado"><dt>Personal destacado</dt><dd>{{ b.personal_destacado }}</dd></div>
          </dl>

          <table v-if="b.personas.length" class="tabla-personas">
            <thead><tr><th>Persona atendida</th><th class="num">Edad</th><th>A dónde se trasladó</th></tr></thead>
            <tbody>
              <tr v-for="(p, i) in b.personas" :key="i"><td>{{ p.nombre }}</td><td class="num">{{ p.edad || '—' }}</td><td>{{ p.traslado || '—' }}</td></tr>
            </tbody>
          </table>
          <p v-if="b.fallecidos" class="fallecidos">Fallecidos: {{ b.fallecidos }}</p>

          <p class="insumos-linea">
            <span class="rotulo">Insumos usados</span>
            <template v-if="b.insumos.length">{{ b.insumos.map(i => `${i.nombre} × ${i.cantidad}${i.unidad_medida ? ' ' + i.unidad_medida : ''}`).join(' · ') }}</template>
            <span v-else class="tenue">ninguno registrado</span>
          </p>
          <p v-if="b.observaciones" class="observaciones"><span class="rotulo">Observaciones</span>{{ b.observaciones }}</p>
        </section>
      </article>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue';
import { informes, inventario, mensajeError } from '../services/api';
import { useNotificacionesStore } from '../stores/notificaciones';
import { useCatalogosStore, TIPOS, nombreTipo } from '../stores/catalogos';
import { hoy, sumarDias, fechaLarga, hora, minutos, plural, describirPeriodo } from '../utils/formato';
import { exportarExcel } from '../utils/exportar';
import SelectorPeriodo from '../components/SelectorPeriodo.vue';
import MenuDesplegable from '../components/MenuDesplegable.vue';
import Icono from '../components/Icono.vue';
import EncabezadoInforme from '../components/informes/EncabezadoInforme.vue';

const notif = useNotificacionesStore();
const catalogos = useCatalogosStore();

const CLASE_ESTADO = { en_curso: 'et-info', pendiente: 'et-alerta', completa: 'et-neutra', firmada: 'et-exito', anulada: 'et-peligro' };

// Por defecto, lo de hoy: «el accidente de hoy en Vado Hondo»
const periodo = ref({ desde: hoy(), hasta: hoy() });
const clavePeriodo = ref(0);
const f = reactive({ personal_id: null, unidad_id: '', insumo_id: null, tipo_servicio: '' });
const texto = ref('');
const datos = ref(null);
const cargando = ref(false);
const insumos = ref([]);

const esDia = (iso) => periodo.value.desde === iso && periodo.value.hasta === iso;
const dia = (iso) => { periodo.value = { desde: iso, hasta: iso }; clavePeriodo.value++; };

const textoPeriodo = computed(() => periodo.value.desde === periodo.value.hasta
  ? fechaLarga(periodo.value.desde) : describirPeriodo(periodo.value.desde, periodo.value.hasta));
const hayFiltros = computed(() => !!(f.personal_id || f.unidad_id || f.insumo_id || f.tipo_servicio || texto.value));
const resumenFiltros = computed(() => [
  f.personal_id && `Personal: ${catalogos.persona(f.personal_id)?.nombre_completo}`,
  f.unidad_id && `Unidad: ${catalogos.unidades.find(u => String(u.id) === f.unidad_id)?.codigo}`,
  f.insumo_id && `Insumo: ${insumos.value.find(i => i.id === f.insumo_id)?.nombre}`,
  f.tipo_servicio && nombreTipo(f.tipo_servicio),
  texto.value && `«${texto.value}»`
].filter(Boolean).join(' · '));

const opcionesPersonal = computed(() => [...catalogos.personal]
  .sort((a, b) => a.nombre_completo.localeCompare(b.nombre_completo))
  .map(p => ({ valor: p.id, texto: p.nombre_completo, nota: p.es_piloto ? 'piloto' : p.escuadra || '' })));
const opcionesInsumo = computed(() => insumos.value
  .filter(i => i.clase !== 'equipo')
  .map(i => ({ valor: i.id, texto: i.nombre, nota: catalogos.nombreCategoria(i.categoria) })));

const cargar = async () => {
  cargando.value = true;
  try {
    const params = { ...periodo.value, texto: texto.value || undefined };
    for (const [k, v] of Object.entries(f)) if (v) params[k] = v;
    const { data } = await informes.servicios(params);
    datos.value = data;
  } catch (e) {
    notif.error(mensajeError(e, 'No se pudo preparar el informe'));
  } finally {
    cargando.value = false;
  }
};

const limpiar = () => {
  Object.assign(f, { personal_id: null, unidad_id: '', insumo_id: null, tipo_servicio: '' });
  texto.value = '';
};

const exportar = () => {
  const filas = [];
  for (const inc of datos.value.incidentes) {
    for (const b of inc.boletas) {
      const personas = b.personas.length ? b.personas : [null];
      for (const p of personas) {
        filas.push([
          inc.fecha?.slice(0, 10), hora(inc.hora_salida), nombreTipo(inc.tipo_servicio), inc.causa || '',
          inc.direccion, inc.sector || '', b.numero_control || '', b.unidad || '', b.piloto || '', b.tripulacion.join(', '),
          p?.nombre || '', p?.edad || '', p?.traslado || '',
          b.insumos.map(i => `${i.nombre} × ${i.cantidad}`).join('; ')
        ]);
      }
    }
  }
  exportarExcel('Servicios_atendidos', `Servicios atendidos · ${textoPeriodo.value}${resumenFiltros.value ? ' · ' + resumenFiltros.value : ''}`,
    ['Fecha', 'Salida', 'Tipo', 'Causa', 'Dirección', 'Sector', 'Boleta', 'Unidad', 'Piloto', 'Tripulación', 'Persona atendida', 'Edad', 'Traslado', 'Insumos usados'],
    filas);
};
const imprimir = () => window.print();

watch([periodo, f], cargar, { deep: true });
let espera = null;
watch(texto, () => { clearTimeout(espera); espera = setTimeout(cargar, 300); });

onMounted(async () => {
  catalogos.cargar().catch(() => {});
  inventario.listar().then(({ data }) => { insumos.value = data.insumos; }).catch(() => {});
  cargar();
});
</script>

<style scoped>
.volver { display: inline-flex; align-items: center; gap: 4px; margin-bottom: 6px; font-size: 13.5px; color: var(--texto-tenue); text-decoration: none; }
.sub { margin-top: 6px; color: var(--texto-suave); font-size: 14.5px; max-width: 720px; }
.barra-filtros { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
.filtros { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 12px; padding: 14px 16px; margin-bottom: 16px; }
.filtros .campo { margin: 0; min-width: 170px; }
.filtros .campo.crecer { flex: 1; min-width: 220px; }
.filtros label { font-size: 12px; }
.resumen { margin-bottom: 12px; font-size: 14.5px; }

.incidente { padding: 18px 20px; margin-bottom: 16px; break-inside: avoid; }
.inc-cabecera { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.inc-cabecera h3 { font-size: 16.5px; }
.inc-cabecera p { font-size: 13.5px; }
.icono-tipo {
  width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent);
}
.inc-datos, .bu-datos { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 6px 20px; margin-bottom: 12px; }
.inc-datos .ancho { grid-column: 1 / -1; }
.inc-datos dt, .bu-datos dt { font-size: 12px; color: var(--texto-tenue); }
.inc-datos dd, .bu-datos dd { font-size: 14.5px; font-weight: 500; }

.boleta-unidad { padding: 14px 16px; margin-top: 10px; border: 1px solid var(--borde); border-radius: var(--radio-lg); background: var(--superficie-alt); }
.bu-cabecera { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 14px; margin-bottom: 10px; font-size: 14px; }
.bu-cabecera .btn-enlace { margin-left: auto; }
.tabla-personas { width: 100%; margin-bottom: 10px; font-size: 14px; background: var(--superficie); border: 1px solid var(--borde); border-radius: var(--radio); }
.tabla-personas td { height: auto; padding: 7px 12px; }
.tabla-personas th { padding: 7px 12px; }
.fallecidos { margin-bottom: 8px; font-weight: 600; color: var(--peligro); font-size: 14px; }
.insumos-linea, .observaciones { font-size: 14px; margin-top: 4px; }
.insumos-linea .rotulo, .observaciones .rotulo { display: block; margin-bottom: 2px; }

@media print {
  .incidente { border: 1px solid #999; padding: 10px 12px; margin-bottom: 10px; }
  .boleta-unidad { background: none; border-color: #bbb; }
  .inc-datos dd, .bu-datos dd, .tabla-personas { font-size: 11px; }
}
</style>
