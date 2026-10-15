<template>
  <div class="animar">
    <div class="titulo-seccion">
      <div>
        <h1>Bitácora</h1>
      </div>
    </div>

    <div class="barra-filtros">
      <div class="segmentos" role="group" aria-label="Entidad">
        <button v-for="e in ENTIDADES" :key="e.valor" :class="{ activo: f.entidad === e.valor }" @click="f.entidad = e.valor">{{ e.nombre }}</button>
      </div>
      <select v-model="f.usuario_id" class="control control-sm" style="width:auto" aria-label="Usuario">
        <option value="">Todos los usuarios</option>
        <option v-for="u in usuariosLista" :key="u.id" :value="u.id">{{ u.nombre_completo }}</option>
      </select>
      <div class="fila">
        <input v-model="f.desde" type="date" class="control control-sm mono" aria-label="Desde" />
        <span class="tenue">a</span>
        <input v-model="f.hasta" type="date" class="control control-sm mono" aria-label="Hasta" />
      </div>
    </div>

    <div class="tabla-contenedor">
      <table>
        <thead><tr><th>Fecha y hora</th><th>Usuario</th><th>Acción</th><th>Registro</th><th>Detalle</th></tr></thead>
        <tbody>
          <tr v-for="r in registros" :key="r.id">
            <td class="mono nowrap">{{ fechaHora(r.creado_en) }}</td>
            <td>{{ r.usuario || '—' }}</td>
            <td><span class="accion" :class="r.accion">{{ ACCIONES[r.accion] || r.accion }}</span></td>
            <td>
              <span class="suave">{{ ENTIDAD_NOMBRE[r.entidad] || r.entidad }}</span>
              <router-link v-if="r.entidad === 'emergencia'" :to="`/historial/${r.entidad_id}`" class="mono ref">{{ r.referencia || `#${r.entidad_id}` }}</router-link>
              <router-link v-else-if="r.entidad === 'insumo'" :to="`/inventario/${r.entidad_id}`" class="ref">{{ r.referencia || `#${r.entidad_id}` }}</router-link>
              <span v-else class="mono tenue"> #{{ r.entidad_id }}</span>
            </td>
            <td class="detalle">{{ resumir(r) }}</td>
          </tr>
        </tbody>
      </table>
      <div v-if="!registros.length" class="vacio"><p>Sin registros con estos filtros.</p></div>
      <Paginador :total="total" :pagina="pagina" :tamano="50" @update:pagina="(p) => { pagina = p; cargar(); }" />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch, onMounted } from 'vue';
import { usuarios, mensajeError } from '../services/api';
import { useNotificacionesStore } from '../stores/notificaciones';
import { fechaHora } from '../utils/formato';
import Paginador from '../components/Paginador.vue';

const ENTIDADES = [
  { valor: '', nombre: 'Todo' }, { valor: 'emergencia', nombre: 'Boletas' }, { valor: 'movimiento', nombre: 'Movimientos' },
  { valor: 'insumo', nombre: 'Insumos' }, { valor: 'sector', nombre: 'Sectores' }, { valor: 'usuario', nombre: 'Usuarios' }
];
const ENTIDAD_NOMBRE = { turno: 'Turno', emergencia: 'Boleta', movimiento: 'Movimiento', insumo: 'Insumo', sector: 'Sector', personal: 'Personal', unidad: 'Unidad', usuario: 'Usuario' };
const ACCIONES = {
  crear: 'Creó', editar: 'Editó', anular: 'Anuló', retirar: 'Retiró', cerrar: 'Cerró', agregar_insumo: 'Agregó insumo',
  quitar_insumo: 'Quitó insumo', asignar_sector: 'Asignó sector', cambiar_clave: 'Cambió contraseña'
};

const notif = useNotificacionesStore();
const f = reactive({ entidad: '', usuario_id: '', desde: '', hasta: '' });
const registros = ref([]);
const total = ref(0);
const pagina = ref(1);
const usuariosLista = ref([]);

const resumir = (r) => {
  const d = r.detalle;
  if (!d) return '';
  if (r.accion === 'editar' && r.entidad === 'emergencia') {
    const campos = Object.keys(d);
    return campos.length ? `Cambió ${campos.join(', ')}` : 'Sin cambios';
  }
  if (r.entidad === 'movimiento') return `${d.tipo} de ${d.cantidad}${d.motivo_anulacion ? ` · ${d.motivo_anulacion}` : ''}`;
  if (d.motivo) return d.motivo;
  if (d.numero_control) return `${d.numero_control}${d.insumos ? ` · ${d.insumos} insumo(s)` : ''}`;
  if (d.insumo) return `${d.insumo} × ${d.cantidad}`;
  if (d.zona_texto) return `«${d.zona_texto}» → ${d.boletas} boleta(s)`;
  if (d.nombre) return d.nombre;
  if (d.usuario) return `${d.usuario} (${d.rol})`;
  return '';
};

const cargar = async () => {
  try {
    const params = { pagina: pagina.value };
    for (const [k, v] of Object.entries(f)) if (v) params[k] = v;
    const { data } = await usuarios.bitacora(params);
    registros.value = data.registros;
    total.value = data.total;
  } catch (e) {
    notif.error(mensajeError(e));
  }
};

watch(f, () => { pagina.value = 1; cargar(); });
onMounted(async () => {
  cargar();
  try { usuariosLista.value = (await usuarios.listar()).data; } catch { /* opcional */ }
});
</script>

<style scoped>
.nowrap { white-space: nowrap; }
.accion { font-size: 12.5px; font-weight: 600; }
.accion.anular, .accion.retirar, .accion.quitar_insumo { color: var(--peligro); }
.accion.crear, .accion.agregar_insumo { color: var(--exito); }
.ref { margin-left: 6px; font-size: 12.5px; font-weight: 600; }
.detalle { font-size: 12.5px; color: var(--texto-suave); max-width: 420px; }
</style>
