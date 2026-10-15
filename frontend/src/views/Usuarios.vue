<template>
  <div class="animar">
    <div class="titulo-seccion">
      <div>
        <h1>Usuarios</h1>
      </div>
      <div class="acciones">
        <button class="btn btn-primario" @click="abrir()"><Icono nombre="mas" :tam="15" />Usuario</button>
      </div>
    </div>

    <div class="tabla-contenedor">
      <table>
        <thead><tr><th>Nombre</th><th>Usuario</th><th>Rol</th><th>Estado</th><th>Última actividad</th><th></th></tr></thead>
        <tbody>
          <tr v-for="u in lista" :key="u.id" :class="{ atenuada: !u.activo }">
            <td>
              <div class="fila">
                <span class="avatar mono">{{ iniciales(u.nombre_completo) }}</span>
                <span class="celda-principal">{{ u.nombre_completo }}</span>
                <span v-if="u.id === auth.usuario?.id" class="etiqueta et-neutra">Usted</span>
              </div>
            </td>
            <td class="mono">{{ u.usuario }}</td>
            <td>{{ { administrador: 'Administración', operativo: 'Operativo', cabina: 'Cabina', direccion: 'Dirección' }[u.rol] }}</td>
            <td><span class="etiqueta" :class="u.activo ? 'et-exito' : 'et-neutra'">{{ u.activo ? 'Activo' : 'Inactivo' }}</span></td>
            <td class="mono suave">{{ u.ultima_actividad ? fechaHora(u.ultima_actividad) : '—' }}</td>
            <td class="der"><button class="btn btn-plano btn-sm btn-icono" @click="abrir(u)" :aria-label="`Editar ${u.nombre_completo}`"><Icono nombre="editar" :tam="14" /></button></td>
          </tr>
        </tbody>
      </table>
    </div>

    <AsistenteModal v-model="modal" :titulo="form.id ? 'Editar usuario' : 'Nuevo usuario'" :pasos="pasos"
                    :guardando="procesando" texto-final="Guardar usuario" @finalizar="guardar">
      <template #paso-0>
        <div class="campo">
          <label for="u-nombre">Nombre completo</label>
          <input id="u-nombre" v-model="form.nombre_completo" class="control" @input="sugerirUsuario" />
        </div>
        <div class="campo">
          <label for="u-usuario">Usuario para iniciar sesión</label>
          <input id="u-usuario" v-model="form.usuario" class="control mono" :disabled="!!form.id" autocomplete="off" @input="usuarioManual = true" />
          <span class="ayuda">{{ form.id ? 'No se puede cambiar.' : '' }}</span>
        </div>
      </template>
      <template #paso-1>
        <div class="opciones" style="--min-opcion: 260px">
          <button type="button" class="opcion" :class="{ elegida: form.rol === 'cabina' }" @click="form.rol = 'cabina'">
            <span>Cabina<small>Solo registra llamadas y regresos; cada bombero completa sus boletas con su PIN</small></span>
          </button>
          <button type="button" class="opcion" :class="{ elegida: form.rol === 'operativo' }" @click="form.rol = 'operativo'">
            <span>Operativo<small>Lo de cabina, más existencias y movimientos de inventario, historial de boletas e informes</small></span>
          </button>
          <button type="button" class="opcion" :class="{ elegida: form.rol === 'administrador' }" @click="form.rol = 'administrador'">
            <span>Administración<small>Todo el sistema: inventario, revisión y firma, análisis, informes y configuración. Ve las boletas por completar, pero no las completa</small></span>
          </button>
          <button type="button" class="opcion" :class="{ elegida: form.rol === 'direccion' }" @click="form.rol = 'direccion'">
            <span>Dirección<small>Consulta boletas, análisis e informes; no puede modificar registros</small></span>
          </button>
        </div>
      </template>
      <template #paso-2>
        <div class="campo">
          <label for="u-clave">{{ form.id ? 'Nueva contraseña' : 'Contraseña' }}</label>
          <input id="u-clave" v-model="form.password" type="password" class="control" autocomplete="new-password"
                 :placeholder="form.id ? 'Déjela vacía para conservar la actual' : ''" />
          <span class="ayuda">Mínimo 8 caracteres.</span>
        </div>
        <button v-if="form.id" type="button" class="opcion" :class="{ elegida: form.activo }" @click="form.activo = !form.activo" style="width:100%">
          <span>{{ form.activo ? 'Cuenta activa' : 'Cuenta desactivada' }}<small>Toque para {{ form.activo ? 'desactivarla' : 'activarla' }}</small></span>
        </button>
      </template>
    </AsistenteModal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { usuarios, mensajeError } from '../services/api';
import { useAuthStore } from '../stores/auth';
import { useNotificacionesStore } from '../stores/notificaciones';
import { fechaHora, iniciales } from '../utils/formato';
import AsistenteModal from '../components/AsistenteModal.vue';
import Icono from '../components/Icono.vue';

const auth = useAuthStore();
const notif = useNotificacionesStore();
const lista = ref([]);
const modal = ref(false);
const procesando = ref(false);
const form = reactive({ nombre_completo: '', usuario: '', rol: 'cabina', password: '', activo: true });
const usuarioManual = ref(false);

const pasos = computed(() => [
  { pregunta: '¿Quién es?', obligatorio: true, valido: !!form.nombre_completo?.trim() && /^[a-z0-9._-]{3,50}$/i.test(form.usuario || ''), falta: !form.nombre_completo?.trim() ? 'Escriba el nombre' : 'El usuario debe tener de 3 a 50 letras o números' },
  { pregunta: '¿Qué podrá hacer?' },
  { pregunta: 'Contraseña', obligatorio: !form.id, valido: form.id ? !form.password || form.password.length >= 8 : (form.password || '').length >= 8, falta: 'Mínimo 8 caracteres' }
]);

// Sugiere el usuario: inicial del nombre + primer apellido (juan.perez → jperez)
const sugerirUsuario = () => {
  if (form.id || usuarioManual.value) return;
  const p = (form.nombre_completo || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z\s]/g, '').split(/\s+/).filter(Boolean);
  form.usuario = p.length > 1 ? p[0][0] + p[1] : (p[0] || '');
};

const cargar = async () => {
  try {
    const { data } = await usuarios.listar();
    lista.value = data;
  } catch (e) {
    notif.error(mensajeError(e));
  }
};

const abrir = (u = null) => {
  Object.assign(form, u
    ? { id: u.id, nombre_completo: u.nombre_completo, usuario: u.usuario, rol: u.rol, activo: u.activo, password: '' }
    : { id: null, nombre_completo: '', usuario: '', rol: 'cabina', activo: true, password: '' });
  usuarioManual.value = false;
  modal.value = true;
};

const guardar = async () => {
  procesando.value = true;
  try {
    const carga = { ...form };
    if (!carga.password) delete carga.password;
    form.id ? await usuarios.editar(form.id, carga) : await usuarios.crear(carga);
    notif.exito('Usuario guardado');
    modal.value = false;
    cargar();
  } catch (e) {
    notif.error(mensajeError(e));
  } finally {
    procesando.value = false;
  }
};

onMounted(cargar);
</script>

<style scoped>
.avatar { width: 28px; height: 28px; display: inline-flex; align-items: center; justify-content: center; font-size: 10.5px; background: var(--superficie-hundida); border-radius: var(--radio); color: var(--texto-suave); }
.casilla { display: flex; align-items: center; gap: 8px; font-size: 13px; cursor: pointer; }
</style>
