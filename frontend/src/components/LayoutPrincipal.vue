<template>
  <div class="marco" :class="{ 'lateral-abierto': lateralAbierto, imprimiendo: impresion.lote.length }">
    <a href="#contenido" class="saltar">Saltar al contenido</a>

    <!-- ══ BARRA LATERAL ══════════════════════════ -->
    <aside class="lateral no-imprimir" aria-label="Navegación principal">
      <router-link to="/" class="marca">
        <img src="/LogoBomberos.png" alt="" />
        <div>
          <strong>Bomberos Voluntarios</strong>
          <span>39ª Compañía · Chiquimula</span>
        </div>
      </router-link>

      <div class="saludo">
        <span class="avatar avatar-grande">{{ auth.iniciales }}</span>
        <div><span>Hola,</span><strong>{{ primerNombre }}</strong></div>
      </div>

      <router-link v-if="puedeRegistrar" to="/boleta/nueva" class="accion-registrar">
        <Icono nombre="mas" :tam="18" :grosor="2.4" />Registrar llamada
      </router-link>

      <nav class="navegacion">
        <section v-for="g in grupos" :key="g.clave">
          <p v-if="g.nombre" class="grupo">{{ g.nombre }}</p>
          <router-link v-for="e in g.enlaces" :key="e.clave" :to="e.to" class="enlace"
                       :class="{ activo: ruta.meta.seccion === e.clave }">
            <Icono :nombre="e.icono" :tam="18" />
            <span>{{ e.nombre }}</span>
            <span v-if="e.insignia" class="insignia" :title="e.ayudaInsignia">{{ e.insignia }}</span>
          </router-link>
        </section>
      </nav>

    </aside>

    <div class="velo" @click="lateralAbierto = false"></div>

    <!-- ══ ÁREA PRINCIPAL ═════════════════════════ -->
    <div class="principal">
      <header class="encabezado no-imprimir">
        <button class="btn btn-plano btn-icono solo-movil" @click="lateralAbierto = true" aria-label="Abrir menú">
          <Icono nombre="menu" :tam="18" />
        </button>

        <nav class="migas" aria-label="Ubicación">
          <template v-if="seccion.nombre && seccion.nombre !== ruta.meta.titulo">
            <span>{{ seccion.nombre }}</span>
            <Icono nombre="chevron_der" :tam="12" />
          </template>
          <strong>{{ ruta.meta.titulo }}</strong>
        </nav>

        <div class="crecer"></div>

        <div class="usuario" ref="menuRef">
          <button class="usuario-boton" @click="menuAbierto = !menuAbierto" :aria-expanded="menuAbierto">
            <span class="avatar">{{ auth.iniciales }}</span>
            <span class="usuario-texto">
              <strong>{{ auth.usuario?.nombre }}</strong>
              <span>{{ auth.nombreRol }}</span>
            </span>
            <Icono nombre="chevron_abajo" :tam="14" />
          </button>
          <transition name="menu">
            <div v-if="menuAbierto" class="menu">
              <div class="menu-cabecera">
                <strong>{{ auth.usuario?.nombre }}</strong>
                <span>{{ auth.nombreRol }} · {{ auth.usuario?.usuario }}</span>
              </div>
              <button @click="tema.alternar(); menuAbierto = false"><Icono :nombre="tema.oscuro ? 'sol' : 'luna'" :tam="15" />{{ tema.oscuro ? 'Pantalla clara' : 'Pantalla oscura' }}</button>
              <button @click="abrirClave"><Icono nombre="llave" :tam="15" />Cambiar contraseña</button>
              <button @click="confirmarSalida = true; menuAbierto = false"><Icono nombre="salir" :tam="15" />Cerrar sesión</button>
            </div>
          </transition>
        </div>
      </header>

      <main id="contenido" class="contenido">
        <nav v-if="pestanas.length > 1" class="pestanas no-imprimir" :aria-label="seccion.nombre">
          <router-link v-for="p in pestanas" :key="p.name" :to="{ name: p.name }" class="pestana"
                       :class="{ activa: ruta.name === p.name }" :aria-current="ruta.name === p.name ? 'page' : null">
            {{ p.meta.pestana }}
            <span v-if="cuentaPestana(p.name)" class="cuenta-pestana">{{ cuentaPestana(p.name) }}</span>
          </router-link>
        </nav>
        <router-view v-slot="{ Component, route: r }">
          <transition name="vista" mode="out-in">
            <component :is="Component" :key="r.path" />
          </transition>
        </router-view>
      </main>
    </div>

    <!-- Hojas oficiales que se están imprimiendo (solo visibles en papel) -->
    <div v-if="impresion.lote.length" class="area-impresion">
      <BoletaImpresa v-for="b in impresion.lote" :key="b.id" :datos="b" />
    </div>

    <Modal v-model="confirmarSalida" titulo="Cerrar sesión" ancho="380px">
      <p class="suave">Se cerrará la sesión en este equipo. Los datos guardados no se pierden.</p>
      <template #acciones>
        <button class="btn btn-secundario" @click="confirmarSalida = false">Cancelar</button>
        <button class="btn btn-primario" @click="salir">Cerrar sesión</button>
      </template>
    </Modal>

    <Modal v-model="modalClave" titulo="Cambiar contraseña" ancho="420px">
      <form @submit.prevent="cambiarClave" id="form-clave">
        <div class="campo">
          <label for="c-actual">Contraseña actual</label>
          <input id="c-actual" v-model="clave.actual" type="password" class="control" autocomplete="current-password" />
        </div>
        <div class="campo">
          <label for="c-nueva">Nueva contraseña</label>
          <input id="c-nueva" v-model="clave.nueva" type="password" class="control" autocomplete="new-password" />
          <span class="ayuda">Mínimo 8 caracteres.</span>
        </div>
        <div class="campo">
          <label for="c-rep">Repita la nueva contraseña</label>
          <input id="c-rep" v-model="clave.repetir" type="password" class="control" autocomplete="new-password" />
        </div>
      </form>
      <template #acciones>
        <button class="btn btn-secundario" @click="modalClave = false">Cancelar</button>
        <button class="btn btn-primario" type="submit" form="form-clave" :disabled="guardandoClave">Guardar</button>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useTemaStore } from '../stores/tema';
import { useAlertasStore } from '../stores/alertas';
import { useCatalogosStore } from '../stores/catalogos';
import { useNotificacionesStore } from '../stores/notificaciones';
import { usuarios, mensajeError } from '../services/api';
import { SECCIONES, paginasVisibles } from '../router';
import Modal from './Modal.vue';
import BoletaImpresa from './BoletaImpresa.vue';
import { useImpresionStore } from '../stores/impresion';
import Icono from './Icono.vue';

const router = useRouter();
const ruta = useRoute();
const auth = useAuthStore();
const tema = useTemaStore();
const alertas = useAlertasStore();
const catalogos = useCatalogosStore();
const notif = useNotificacionesStore();
const impresion = useImpresionStore();

const lateralAbierto = ref(false);
const menuAbierto = ref(false);
const menuRef = ref(null);
const confirmarSalida = ref(false);
const modalClave = ref(false);
const guardandoClave = ref(false);
const clave = reactive({ actual: '', nueva: '', repetir: '' });

const primerNombre = computed(() => (auth.usuario?.nombre || '').split(' ')[0]);
// Registrar llamada: el botón rojo del lateral, solo para quien llena boletas (cabina y operativo)
const puedeRegistrar = computed(() => !!auth.usuario && auth.atiendeServicios);
const seccion = computed(() => SECCIONES[ruta.meta.seccion] || {});

// Menú: una entrada por sección, agrupadas; lleva a la primera página que el rol puede abrir
const grupos = computed(() => {
  const rol = auth.usuario?.rol;
  const insignias = {
    boletas: impresion.cuentas.por_completar ? { n: impresion.cuentas.por_completar, ayuda: 'boletas por completar' } : null,
    existencias: auth.esAdministrador && alertas.datos.resumen.total ? { n: alertas.datos.resumen.total, ayuda: 'alertas de inventario' } : null
  };
  const lista = [];
  for (const [clave, s] of Object.entries(SECCIONES)) {
    const destino = clave === 'inicio' ? '/inicio' : paginasVisibles(clave, rol)[0];
    if (!destino) continue;
    const grupo = s.grupo || clave;
    let g = lista.find(x => x.clave === grupo);
    if (!g) lista.push(g = { clave: grupo, nombre: s.grupo || '', enlaces: [] });
    g.enlaces.push({
      clave, nombre: s.nombre, icono: s.icono,
      to: typeof destino === 'string' ? destino : { name: destino.name },
      insignia: insignias[clave]?.n, ayudaInsignia: insignias[clave] && `${insignias[clave].n} ${insignias[clave].ayuda}`
    });
  }
  return lista;
});

const cuentaPestana = (nombre) => ({ revision: impresion.cuentas.por_firmar, imprimir: impresion.cuentas.por_imprimir })[nombre] || 0;

// Pestañas: solo en las páginas que forman la sección, no en formularios ni detalles
const pestanas = computed(() => {
  const paginas = paginasVisibles(ruta.meta.seccion, auth.usuario?.rol);
  return paginas.some(p => p.name === ruta.name) ? paginas : [];
});

const salir = () => {
  auth.cerrarSesion();
  router.push('/login');
};

const abrirClave = () => {
  Object.assign(clave, { actual: '', nueva: '', repetir: '' });
  menuAbierto.value = false;
  modalClave.value = true;
};

const cambiarClave = async () => {
  if (clave.nueva !== clave.repetir) return notif.alerta('Las contraseñas nuevas no coinciden');
  guardandoClave.value = true;
  try {
    const { data } = await usuarios.cambiarClave({ actual: clave.actual, nueva: clave.nueva });
    notif.exito(data.mensaje);
    modalClave.value = false;
  } catch (e) {
    notif.error(mensajeError(e));
  } finally {
    guardandoClave.value = false;
  }
};

// Atajo N: nueva boleta (fuera de campos de texto)
const teclado = (e) => {
  if (!puedeRegistrar.value || e.key.toLowerCase() !== 'n' || e.ctrlKey || e.metaKey || e.altKey) return;
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
  if (document.querySelector('.modal-velo')) return;
  router.push('/boleta/nueva');
};

const clicFuera = (e) => {
  if (menuRef.value && !menuRef.value.contains(e.target)) menuAbierto.value = false;
};

onMounted(() => {
  alertas.cargar();
  impresion.contarPendientes();
  catalogos.cargar().catch(() => notif.error('No se pudieron cargar los catálogos'));
  document.addEventListener('keydown', teclado);
  document.addEventListener('click', clicFuera);
});
onUnmounted(() => {
  document.removeEventListener('keydown', teclado);
  document.removeEventListener('click', clicFuera);
});

watch(() => ruta.fullPath, () => { lateralAbierto.value = false; impresion.contarPendientes(); });
</script>

<style scoped>
.marco {
  --ancho-lateral: 272px;
  display: grid;
  grid-template-columns: var(--ancho-lateral) 1fr;
  min-height: 100vh;
}

.saltar {
  position: absolute; left: -9999px; top: 8px; z-index: 9999;
  padding: 8px 12px; background: var(--texto); color: var(--superficie); border-radius: var(--radio);
}
.saltar:focus { left: 8px; }

/* ── Lateral ─────────────────────────────── */
.lateral {
  position: sticky; top: 0;
  height: 100vh;
  display: flex; flex-direction: column; gap: 6px;
  padding: 20px 16px;
  background: var(--superficie);
  border-right: 1px solid var(--borde);
  overflow-y: auto;
}

.marca { flex-shrink: 0; display: flex; align-items: center; gap: 10px; padding: 0 6px 14px; text-decoration: none; color: inherit; }
.marca img { width: 34px; height: 34px; object-fit: contain; }
.marca strong { display: block; font-size: 13.5px; font-weight: 700; color: var(--texto); line-height: 1.2; }
.marca span { display: block; font-size: 12px; color: var(--texto-tenue); line-height: 1.3; }

.saludo { display: flex; align-items: center; gap: 12px; padding: 4px 6px 16px; flex-shrink: 0; }
.avatar-grande { width: 48px !important; height: 48px !important; font-size: 16px !important; background: var(--acento-tenue) !important; color: var(--acento-texto) !important; }
.saludo div span { display: block; font-size: 14px; color: var(--texto-suave); line-height: 1.3; }
.saludo strong { display: block; font-size: 17px; font-weight: 600; color: var(--texto); }

.navegacion { flex: 1; }
.navegacion section + section { margin-top: 10px; }
.grupo { padding: 4px 14px; font-size: 12px; color: var(--texto-tenue); }

.enlace {
  display: flex; align-items: center; gap: 12px;
  height: 44px; padding: 0 14px; margin-bottom: 2px;
  border-radius: 12px;
  color: var(--texto); font-size: 14.5px;
  text-decoration: none;
  transition: background var(--transicion), color var(--transicion);
}
.enlace svg { color: var(--texto-suave); }
.enlace:hover { background: var(--superficie-alt); }
.enlace.activo { background: var(--acento-tenue); color: var(--acento-texto); font-weight: 600; }
.enlace.activo svg { color: var(--acento-texto); }

.insignia {
  margin-left: auto; min-width: 20px; height: 20px; padding: 0 6px;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 11.5px; font-weight: 600; color: #fff; background: var(--acento); border-radius: 999px;
}

/* La boleta nace al registrar la llamada: es la acción principal del sistema */
.accion-registrar {
  flex-shrink: 0; margin: 0 0 14px; height: 46px;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  background: var(--acento); color: #fff; border-radius: 12px;
  font-size: 15px; font-weight: 600; text-decoration: none;
  box-shadow: 0 8px 18px -8px color-mix(in srgb, var(--acento) 80%, transparent);
}
.accion-registrar:hover { background: var(--acento-oscuro); }

/* ── Encabezado ──────────────────────────── */
.principal { min-width: 0; display: flex; flex-direction: column; }

.encabezado {
  position: sticky; top: 0; z-index: 50;
  display: flex; align-items: center; gap: 6px;
  height: 60px; padding: 0 24px 0 32px;
  background: color-mix(in srgb, var(--fondo) 92%, transparent);
  backdrop-filter: blur(8px);
}

.migas { display: flex; align-items: center; gap: 8px; font-size: 14.5px; font-weight: 500; color: var(--texto-tenue); min-width: 0; }
.migas strong { color: var(--texto); font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }


.usuario { position: relative; margin-left: 4px; }
.usuario-boton {
  display: flex; align-items: center; gap: 9px;
  height: 38px; padding: 0 8px 0 4px;
  background: none; border: 1px solid transparent; border-radius: var(--radio);
  font: inherit; color: var(--texto-suave); cursor: pointer;
}
.usuario-boton:hover { background: var(--superficie); border-color: var(--borde); }
.avatar {
  width: 30px; height: 30px;
  display: flex; align-items: center; justify-content: center;
  background: var(--texto); color: var(--superficie);
  font-size: 11.5px; font-weight: 600;
  border-radius: 50%;
}
.usuario-texto { display: flex; flex-direction: column; align-items: flex-start; line-height: 1.2; }
.usuario-texto strong { font-size: 13.5px; color: var(--texto); font-weight: 650; max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.usuario-texto span { font-size: 12px; color: var(--texto-tenue); }

.menu {
  position: absolute; right: 0; top: calc(100% + 6px);
  width: 250px; padding: 4px;
  background: var(--superficie);
  border: 1px solid var(--borde);
  border-radius: var(--radio-lg);
  box-shadow: var(--sombra-md);
}
.menu-cabecera { padding: 9px 10px 10px; border-bottom: 1px solid var(--borde); margin-bottom: 4px; }
.menu-cabecera strong { display: block; font-size: 13px; }
.menu-cabecera span { font-size: 12px; color: var(--texto-tenue); }
.menu button {
  display: flex; align-items: center; gap: 9px; width: 100%;
  height: 38px; padding: 0 10px;
  background: none; border: none; border-radius: var(--radio-sm);
  font: inherit; font-size: 14px; color: var(--texto-suave); cursor: pointer; text-align: left;
}
.menu button:hover { background: var(--superficie-alt); color: var(--texto); }
.menu-enter-active, .menu-leave-active { transition: opacity 120ms ease, transform 120ms ease; }
.menu-enter-from, .menu-leave-to { opacity: 0; transform: translateY(-4px); }

.contenido { flex: 1; padding: 28px 32px 64px; max-width: 1440px; width: 100%; margin: 0 auto; }

/* ── Pestañas de la sección ──────────────── */
.pestanas {
  display: flex; gap: 4px; flex-wrap: wrap;
  margin: -8px 0 22px;
  border-bottom: 1px solid var(--borde);
}
.pestana {
  position: relative;
  display: inline-flex; align-items: center; gap: 8px;
  height: 44px; padding: 0 14px;
  font-size: 14.5px; font-weight: 500;
  color: var(--texto-suave); text-decoration: none;
  border-radius: var(--radio) var(--radio) 0 0;
  transition: color var(--transicion), background var(--transicion);
}
.pestana:hover { color: var(--texto); background: var(--superficie-alt); }
.pestana.activa { color: var(--texto); font-weight: 600; }
.pestana.activa::after {
  content: ''; position: absolute; left: 12px; right: 12px; bottom: -1px;
  height: 3px; border-radius: 3px 3px 0 0; background: var(--acento);
}
.cuenta-pestana {
  min-width: 24px; height: 22px; padding: 0 7px;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 12.5px; font-weight: 700;
  color: var(--texto-suave); background: var(--superficie-hundida);
  border-radius: 999px;
}

.vista-enter-active, .vista-leave-active { transition: opacity 120ms ease; }
.vista-enter-from, .vista-leave-to { opacity: 0; }

.velo, .solo-movil { display: none; }

@media (max-width: 1100px) {
  .usuario-texto { display: none; }
}

@media (max-width: 960px) {
  .marco { grid-template-columns: 1fr; }
  .lateral {
    position: fixed; left: 0; top: 0; z-index: 200;
    width: 272px;
    transform: translateX(-100%);
    transition: transform 200ms cubic-bezier(.3,0,.2,1);
    box-shadow: var(--sombra-lg);
  }
  .lateral-abierto .lateral { transform: none; }
  .lateral-abierto .velo { display: block; position: fixed; inset: 0; z-index: 150; background: rgba(0,0,0,.4); }
  .solo-movil { display: inline-flex; }
  .encabezado { padding: 0 12px; }
  .contenido { padding: 20px 16px 48px; }
  .migas > span, .migas > svg { display: none; }
}

.area-impresion { display: none; }

@media print {
  .imprimiendo .lateral, .imprimiendo .principal, .imprimiendo .velo { display: none !important; }
  .area-impresion { display: block; }
  .area-impresion :deep(.hoja-oficio) { break-after: page; page-break-after: always; }
  .area-impresion :deep(.hoja-oficio:last-child) { break-after: auto; page-break-after: auto; }
  .marco { display: block; }
  .contenido { padding: 0; max-width: none; }
}
</style>
