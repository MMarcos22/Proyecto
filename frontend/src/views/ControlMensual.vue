<template>
  <div class="animar">
    <div class="titulo-seccion no-imprimir">
      <div>
        <h1>Control mensual</h1>
      </div>
      <div class="acciones">
        <span v-if="cierre" class="etiqueta et-exito cerrado">Cerrado el {{ fechaHora(cierre.cerrado_en) }} · {{ cierre.cerrado_por }}</span>
        <button v-else-if="auth.esAdministrador && mesTerminado" class="btn btn-secundario" :disabled="cerrando" @click="cerrarMes">
          <Icono nombre="check" :tam="17" />Cerrar {{ meses[periodo.mes - 1].toLowerCase() }}
        </button>
        <button class="btn btn-secundario" @click="descargarExcel" :disabled="descargando">
          <span v-if="descargando" class="cargador cargador-oscuro"></span><Icono v-else nombre="descargar" :tam="17" />Excel del mes
        </button>
        <button class="btn btn-primario" @click="imprimir(false)" :disabled="cargando || !categoria"><Icono nombre="imprimir" :tam="17" />Imprimir hoja</button>
      </div>
    </div>

    <!-- Mes -->
    <div class="selector-mes tarjeta no-imprimir">
      <button class="btn btn-plano btn-icono" @click="cambiarMes(-1)" aria-label="Mes anterior"><Icono nombre="flecha_izq" :tam="20" /></button>
      <div class="mes-actual">
        <strong>{{ meses[periodo.mes - 1] }} {{ periodo.anio }}</strong>
        <span class="tenue">viene de {{ datos.mes_anterior || '—' }}</span>
      </div>
      <button class="btn btn-plano btn-icono" @click="cambiarMes(1)" :disabled="esMesActual" aria-label="Mes siguiente"><Icono nombre="flecha_der" :tam="20" /></button>
      <button v-if="!esMesActual" class="btn btn-secundario btn-sm" @click="irMesActual">Ir al mes actual</button>
    </div>

    <div class="barra-filtros no-imprimir">
      <div class="segmentos">
        <button v-for="(c, i) in datos.categorias" :key="c.clave" :class="{ activo: hojaActiva === i }" @click="hojaActiva = i">
          {{ nombreCategoria(c.clave) }} <span class="cuenta">{{ c.insumos.length }}</span>
        </button>
      </div>
      <div class="busqueda">
        <Icono nombre="buscar" :tam="17" />
        <input v-model="busqueda" class="control" type="search" placeholder="Buscar insumo" aria-label="Buscar insumo" />
      </div>
      <label class="solo-mov"><input type="checkbox" v-model="soloConMovimiento" /> Solo con movimiento este mes</label>
    </div>

    <div v-if="cargando" class="esqueleto no-imprimir" style="height:320px"></div>

    <template v-else-if="categoria">
      <!-- Resumen de la categoría -->
      <div class="resumen-cat no-imprimir">
        <div class="tarjeta"><span class="rotulo">Insumos con entradas</span><strong>{{ resumen.conEntrada }}</strong></div>
        <div class="tarjeta"><span class="rotulo">Insumos con salidas</span><strong>{{ resumen.conSalida }}</strong></div>
        <div class="tarjeta"><span class="rotulo">Sin existencia al cierre</span><strong :class="{ rojo: resumen.agotados }">{{ resumen.agotados }}</strong></div>
      </div>

      <!-- Lista para trabajar -->
      <ul class="lista-control no-imprimir">
        <li class="cabeza-lista" aria-hidden="true">
          <span>Insumo</span><span>Venía</span><span>Entró</span><span>Salió</span><span>Quedó</span>
        </li>
        <li v-for="r in filas" :key="r.id" class="tarjeta">
          <div class="nombre">
            <strong>{{ r.nombre }}</strong>
            <span class="tenue">{{ existencias[r.id]?.unidad_medida || 'unidad' }}{{ r.fecha_ingreso ? ` · ingresó el ${r.fecha_ingreso}` : '' }}</span>
          </div>
          <span class="cifra" data-et="Venía">{{ r.vienen }}</span>
          <span class="cifra entra" data-et="Entró">{{ r.ingreso ? `+${r.ingreso}` : '—' }}</span>
          <span class="cifra sale" data-et="Salió">{{ r.salida ? `−${r.salida}` : '—' }}</span>
          <span class="cifra total" :class="{ rojo: r.vienen + r.ingreso - r.salida <= 0 }" data-et="Quedó">{{ r.vienen + r.ingreso - r.salida }}</span>
        </li>
        <li v-if="!filas.length" class="tarjeta vacio">
          <strong>{{ busqueda || soloConMovimiento ? 'Ningún insumo coincide' : 'Sin insumos en esta categoría' }}</strong>
        </li>
      </ul>
      <p class="pista no-imprimir">¿Necesita las cuatro hojas? <button class="btn-enlace" @click="imprimir(true)">Imprimir todas las categorías</button></p>

      <!-- Hoja oficial: solo se ve al imprimir -->
      <div class="solo-impresion">
        <div v-for="cat in hojasAImprimir" :key="cat.clave" class="hoja-control">
          <div class="hc-encabezado">
            <img src="/LogoBomberos.png" alt="Logo" />
            <div>
              <p>BENEMÉRITO CUERPO VOLUNTARIO DE BOMBEROS</p>
              <p>TRIGÉSIMA NOVENA COMPAÑÍA CHIQUIMULA, GUATEMALA</p>
              <p>{{ cat.titulo }}</p>
              <p>DURANTE EL MES DE {{ datos.periodo.mes.toUpperCase() }} DE {{ datos.periodo.anio }}</p>
            </div>
          </div>
          <table class="hc-tabla">
            <thead>
              <tr>
                <th rowspan="2" class="w-no">No.</th>
                <th rowspan="2" class="w-ins">INSUMO</th>
                <th>MES: {{ datos.mes_anterior.toUpperCase() }}</th>
                <th colspan="2">INGRESO</th>
                <th>EXISTENCIA</th>
                <th>SALIDA</th>
                <th rowspan="2">TOTAL</th>
              </tr>
              <tr><th>VIENEN</th><th>FECHA</th><th>CANTIDAD</th><th>CANTIDAD</th><th>CANTIDAD</th></tr>
            </thead>
            <tbody>
              <tr v-for="(r, i) in cat.insumos" :key="r.id">
                <td class="c">{{ i + 1 }}</td>
                <td class="l">{{ r.nombre.toUpperCase() }}</td>
                <td class="c">{{ r.vienen }}</td>
                <td class="c">{{ r.fecha_ingreso || '' }}</td>
                <td class="c">{{ r.ingreso || '' }}</td>
                <td class="c">{{ r.vienen + r.ingreso }}</td>
                <td class="c">{{ r.salida || '' }}</td>
                <td class="c fuerte">{{ r.vienen + r.ingreso - r.salida }}</td>
              </tr>
              <tr class="fila-vacia"><td colspan="8">&nbsp;</td></tr>
              <tr class="fila-vacia"><td colspan="8">&nbsp;</td></tr>
            </tbody>
          </table>
          <div class="hc-firma">
            <div class="raya"></div>
            <p>Of. I As. Kevin Gabriel Cerín Marroquín</p>
            <p>Director 39 Compañía</p>
          </div>
        </div>
      </div>
    </template>

  </div>
</template>

<script setup>
import { ref, reactive, computed, nextTick, onMounted } from 'vue';
import { useCatalogosStore } from '../stores/catalogos';
import { estadisticas, inventario, mensajeError } from '../services/api';
import { useNotificacionesStore } from '../stores/notificaciones';
import { useAuthStore } from '../stores/auth';
import { fechaHora, hoy } from '../utils/formato';
import Icono from '../components/Icono.vue';

const notif = useNotificacionesStore();
const auth = useAuthStore();
const catalogos = useCatalogosStore();
const nombreCategoria = (c) => catalogos.nombreCategoria(c);

const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const anioActual = new Date().getFullYear();
const anios = [anioActual, anioActual - 1, anioActual - 2];

const periodo = reactive({ mes: new Date().getMonth() + 1, anio: anioActual });
const datos = ref({ categorias: [], periodo: {}, mes_anterior: '' });
const hojaActiva = ref(0);
const cargando = ref(true);
const descargando = ref(false);
const existencias = ref({});

const cierres = ref([]);
const cerrando = ref(false);
const cierre = computed(() => cierres.value.find(c => c.anio === periodo.anio && c.mes === periodo.mes));
// Solo se cierra un mes que ya terminó
const mesTerminado = computed(() => `${periodo.anio}-${String(periodo.mes).padStart(2, '0')}` < hoy().slice(0, 7));

const categoria = computed(() => datos.value.categorias[hojaActiva.value]);
const busqueda = ref('');
const soloConMovimiento = ref(false);
const imprimirTodas = ref(false);

const filas = computed(() => {
  const t = busqueda.value.trim().toLowerCase();
  return (categoria.value?.insumos || []).filter(r =>
    (!t || r.nombre.toLowerCase().includes(t)) && (!soloConMovimiento.value || r.ingreso || r.salida));
});
const resumen = computed(() => {
  const l = categoria.value?.insumos || [];
  return {
    conEntrada: l.filter(r => r.ingreso).length,
    conSalida: l.filter(r => r.salida).length,
    agotados: l.filter(r => r.vienen + r.ingreso - r.salida <= 0).length
  };
});
const hojasAImprimir = computed(() => (imprimirTodas.value ? datos.value.categorias : categoria.value ? [categoria.value] : []));

const hoyMes = { mes: new Date().getMonth() + 1, anio: new Date().getFullYear() };
const esMesActual = computed(() => periodo.mes === hoyMes.mes && periodo.anio === hoyMes.anio);
const cambiarMes = (d) => {
  let m = periodo.mes + d, a = periodo.anio;
  if (m < 1) { m = 12; a--; }
  if (m > 12) { m = 1; a++; }
  Object.assign(periodo, { mes: m, anio: a });
  cargar();
};
const irMesActual = () => { Object.assign(periodo, hoyMes); cargar(); };

const cargar = async () => {
  cargando.value = true;
  try {
    const [c, i, k] = await Promise.all([
      estadisticas.inventarioControlMensual({ mes: periodo.mes, anio: periodo.anio }),
      inventario.listar(),
      inventario.cierres().catch(() => ({ data: [] }))
    ]);
    datos.value = c.data;
    existencias.value = Object.fromEntries(i.data.insumos.map(x => [x.id, x]));
    cierres.value = k.data;
  } catch (e) {
    notif.error(mensajeError(e, 'No se pudo cargar el control mensual'));
  } finally {
    cargando.value = false;
  }
};

const cerrarMes = async () => {
  if (!confirm(`¿Cerrar ${meses[periodo.mes - 1]} ${periodo.anio}? Sus saldos quedarán como lo que «viene» al mes siguiente; registrar algo con fecha de ese mes pedirá una justificación.`)) return;
  cerrando.value = true;
  try {
    const { data } = await inventario.cerrarMes(periodo.anio, periodo.mes);
    notif.exito(data.mensaje);
    await cargar();
  } catch (e) {
    notif.error(mensajeError(e));
  } finally {
    cerrando.value = false;
  }
};

const descargarExcel = async () => {
  descargando.value = true;
  try {
    await estadisticas.inventarioExcel(periodo.mes, periodo.anio);
  } catch (e) {
    notif.error(mensajeError(e, 'No se pudo generar el archivo'));
  } finally {
    descargando.value = false;
  }
};


const imprimir = async (todas) => {
  imprimirTodas.value = todas;
  await nextTick();
  window.print();
  imprimirTodas.value = false;
};

onMounted(() => {
  catalogos.cargar().catch(() => {});
  cargar();
});
</script>

<style scoped>
.barra-control {
  display: flex; align-items: center; justify-content: space-between;
  gap: 14px; margin-bottom: 16px; flex-wrap: wrap;
}
.control-sm { width: auto; min-width: 128px; }

.estado-carga {
  display: flex; flex-direction: column; align-items: center; gap: 13px; padding: 56px;
}
.estado-carga p { color: var(--texto-suave); font-size: 13.5px; }

/* ── HOJA ─────────────────────────────────── */
.hoja-control {
  width: 21.6cm; margin: 0 auto; padding: 1.2cm;
  box-sizing: border-box;
  background: var(--superficie);
  border: 1px solid var(--borde);
  border-radius: var(--radio-lg);
  box-shadow: var(--sombra);
  overflow-x: auto;
}

.hc-encabezado {
  display: flex; align-items: center; gap: 14px; margin-bottom: 14px;
}
.hc-encabezado img { width: 62px; height: 62px; object-fit: contain; }
.hc-encabezado > div { flex: 1; text-align: center; }
.hc-encabezado p {
  font-size: 11.5px; font-weight: 700; line-height: 1.45;
  color: var(--texto);
}

.hc-tabla { width: 100%; border-collapse: collapse; }
.hc-tabla th, .hc-tabla td {
  border: 1px solid var(--texto);
  padding: 3px 5px; font-size: 10px;
  color: var(--texto);
}
.hc-tabla th {
  font-weight: 700; text-align: center; vertical-align: middle;
  background: var(--superficie-alt);
}
.hc-tabla td.c { text-align: center; }
.hc-tabla td.l { text-align: left; }
.hc-tabla .w-no  { width: 30px; }
.hc-tabla .w-ins { width: 40%; }
.hc-tabla .calc  { color: var(--texto-suave); }
.hc-tabla .fuerte { font-weight: 700; color: var(--texto); }

.celda-edit {
  cursor: pointer; position: relative;
  transition: background var(--transicion);
}
.celda-edit:hover {
  background: var(--peligro-fondo);
  box-shadow: inset 0 0 0 1.5px var(--rojo-bomberos);
}
.celda-edit.vacia::after {
  content: '+'; color: var(--texto-tenue);
  font-size: 12px; opacity: 0;
  transition: opacity var(--transicion);
}
.celda-edit.vacia:hover::after { opacity: 1; color: var(--rojo-bomberos); }

.fila-vacia td { height: 18px; }

.hc-firma { width: 300px; margin: 48px auto 0; text-align: center; }
.hc-firma .raya { border-top: 1px solid var(--texto); margin-bottom: 4px; }
.hc-firma p { font-size: 10px; line-height: 1.4; color: var(--texto); }

.pista {
  width: 21.6cm; margin: 12px auto 0;
  font-size: 12px; color: var(--texto-tenue); text-align: center;
}
.pista strong { color: var(--texto-suave); }

.insumo-sel {
  padding: 9px 13px; margin-bottom: 16px;
  background: var(--superficie-alt);
  border-left: 3px solid var(--rojo-bomberos);
  border-radius: var(--radio-sm);
  font-size: 13.5px; font-weight: 600; color: var(--texto);
}

.nota-info {
  display: flex; align-items: flex-start; gap: 9px;
  padding: 11px 14px; margin-bottom: 16px;
  background: var(--info-fondo); color: var(--info);
  border-radius: var(--radio);
  font-size: 12.5px; line-height: 1.5;
}
.nota-info svg { flex-shrink: 0; margin-top: 1px; }

/* ── IMPRESIÓN ────────────────────────────── */
/* ── Vista de trabajo ───────────────────────── */
.selector-mes { display: flex; align-items: center; gap: 12px; padding: 10px 14px; margin-bottom: 18px; width: fit-content; max-width: 100%; }
.mes-actual { min-width: 200px; text-align: center; }
.mes-actual strong { display: block; font-size: 20px; text-transform: capitalize; }
.mes-actual span { font-size: 13.5px; }
.solo-mov { display: inline-flex; align-items: center; gap: 8px; font-size: 14.5px; color: var(--texto-suave); cursor: pointer; }
.solo-mov input { width: 18px; height: 18px; accent-color: var(--acento); }

.resumen-cat { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-bottom: 16px; }
.resumen-cat .tarjeta { padding: 14px 18px; }
.resumen-cat strong { display: block; font-size: 26px; margin-top: 2px; }
.rojo { color: var(--peligro); }

.lista-control { list-style: none; display: flex; flex-direction: column; gap: 8px; }
.cerrado { height: 40px; padding: 0 14px; font-size: 13.5px; }
.lista-control li { display: grid; grid-template-columns: minmax(200px, 1fr) repeat(4, 96px); align-items: center; gap: 12px; padding: 12px 16px 12px 20px; }
.cabeza-lista { padding-top: 0 !important; padding-bottom: 2px !important; font-size: 13px; font-weight: 600; color: var(--texto-tenue); }
.cabeza-lista span:not(:first-child) { text-align: center; }
.nombre strong { display: block; font-size: 15.5px; }
.nombre span { font-size: 13.5px; }
.cifra { text-align: center; font-family: var(--fuente-mono); font-size: 17px; }
.cifra.entra { color: var(--exito); }
.cifra.sale { color: var(--peligro); }
.cifra.total { font-weight: 700; font-size: 19px; }
.botones { display: flex; gap: 8px; }
.lista-control .vacio { display: block; }

@media (max-width: 1100px) {
  .lista-control li { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .cabeza-lista { display: none !important; }
  .nombre, .botones { grid-column: 1 / -1; }
  .cifra::before { content: attr(data-et); display: block; font-family: var(--fuente); font-size: 12px; color: var(--texto-tenue); }
  .botones .btn { flex: 1; }
}

.hoja-control + .hoja-control { break-before: page; page-break-before: always; }
/* La hoja oficial no hereda la altura de fila de las tablas de pantalla */
.hc-tabla tbody td { height: auto; padding: 4px 6px; color: #000; }
.hc-tabla tbody tr:hover td { background: none; }

@media print {
  .no-imprimir, .barra-lateral, .encabezado,
  .titulo-seccion, .barra-control, .pista { display: none !important; }

  html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
  .disposicion { display: block !important; }
  .zona-principal { display: block !important; }
  .contenido { padding: 0 !important; }

  .hoja-control {
    width: 100%; margin: 0; padding: 0;
    border: none; border-radius: 0; box-shadow: none;
    background: #fff;
  }
  .hc-encabezado p, .hc-tabla th, .hc-tabla td,
  .hc-firma p { color: #000 !important; }
  .hc-tabla th { background: none !important; }
  .hc-tabla th, .hc-tabla td { border-color: #000 !important; }
  .celda-edit:hover { background: none !important; box-shadow: none !important; }
  .hc-firma .raya { border-top-color: #000 !important; }
}

@media (max-width: 1000px) {
  .hoja-control { width: 100%; padding: 16px; }
  .pista { width: 100%; }
}
</style>