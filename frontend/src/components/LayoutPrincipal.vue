<template>
  <div class="disposicion" :class="{ 'lateral-oculto': !lateralAbierto }">
    <!-- ══ BARRA LATERAL ══════════════════════════ -->
    <aside class="barra-lateral">
      <div class="marca">
        <img src="/LogoBomberos.png" alt="Bomberos 39ª Compañía" class="marca-logo" />
        <div class="marca-texto">
          <strong>39ª Compañía</strong>
          <span>Bomberos Voluntarios</span>
        </div>
      </div>

      <nav class="navegacion">
        <p class="grupo-titulo">Operación</p>

        <router-link v-if="auth.esAdministrador" to="/panel" class="enlace">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/>
            <rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/>
          </svg>
          <span>Panel general</span>
        </router-link>

        <router-link v-if="auth.esOperativo" to="/registrar" class="enlace">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
            <polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>
          </svg>
          <span>Registrar servicio</span>
        </router-link>

        <router-link to="/historial" class="enlace">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
          <span>Historial de servicios</span>
        </router-link>

        <p class="grupo-titulo">Inventario</p>

        <router-link to="/inventario" class="enlace">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
          </svg>
          <span>Existencias</span>
          <span v-if="alertas.datos.resumen.total > 0" class="insignia">
            {{ alertas.datos.resumen.total }}
          </span>
        </router-link>

        <router-link to="/control-mensual" class="enlace">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2"/>
            <line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/>
            <line x1="9" y1="9" x2="9" y2="21"/><line x1="15" y1="9" x2="15" y2="21"/>
          </svg>
          <span>Control mensual</span>
        </router-link>

        <router-link to="/movimientos" class="enlace">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 014-4h14"/>
            <polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 01-4 4H3"/>
          </svg>
          <span>Movimientos</span>
        </router-link>

        <p class="grupo-titulo">Información</p>

        <router-link to="/reportes" class="enlace">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
          <span>Informes</span>
        </router-link>

        <router-link v-if="auth.esAdministrador" to="/zonas" class="enlace">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
          </svg>
          <span>Zonas de incidencia</span>
        </router-link>
      </nav>

      <div class="pie-lateral">
        <div class="tarjeta-usuario">
          <div class="avatar">{{ auth.iniciales }}</div>
          <div class="usuario-datos">
            <strong>{{ auth.usuario?.nombre }}</strong>
            <span>{{ auth.esAdministrador ? 'Administrador' : 'Personal operativo' }}</span>
          </div>
        </div>
        <button class="btn-salir" @click="confirmarSalida = true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
            <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>

    <div v-if="lateralAbierto" class="velo-lateral" @click="lateralAbierto = false"></div>

    <!-- ══ CONTENIDO ══════════════════════════════ -->
    <div class="zona-principal">
      <header class="encabezado no-imprimir">
        <button class="btn-menu" @click="lateralAbierto = !lateralAbierto">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>

        <div class="crecer"></div>

        <div class="fecha-actual">{{ fechaHoy }}</div>

        <CampanaAlertas />

        <button class="btn-tema" @click="tema.alternar()" :title="tema.oscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'">
          <transition name="girar-icono" mode="out-in">
            <svg v-if="tema.oscuro" key="sol" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <circle cx="12" cy="12" r="4.5"/>
              <line x1="12" y1="1.5" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22.5"/>
              <line x1="4.2" y1="4.2" x2="6" y2="6"/><line x1="18" y1="18" x2="19.8" y2="19.8"/>
              <line x1="1.5" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22.5" y2="12"/>
              <line x1="4.2" y1="19.8" x2="6" y2="18"/><line x1="18" y1="6" x2="19.8" y2="4.2"/>
            </svg>
            <svg v-else key="luna" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
            </svg>
          </transition>
        </button>
      </header>

      <main class="contenido">
        <router-view v-slot="{ Component }">
          <transition name="vista" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>

    <!-- ══ CONFIRMAR SALIDA ═══════════════════════ -->
    <Modal v-model="confirmarSalida" titulo="Cerrar sesión" ancho="380px">
      <p class="texto-confirmar">¿Está seguro que desea cerrar la sesión actual?</p>
      <template #acciones>
        <button class="btn btn-secundario" @click="confirmarSalida = false">Cancelar</button>
        <button class="btn btn-primario" @click="salir">Cerrar sesión</button>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useTemaStore } from '../stores/tema';
import { useAlertasStore } from '../stores/alertas';
import Modal from './Modal.vue';
import CampanaAlertas from './CampanaAlertas.vue';

const router  = useRouter();
const auth    = useAuthStore();
const tema    = useTemaStore();
const alertas = useAlertasStore();

const lateralAbierto  = ref(false);
const confirmarSalida = ref(false);

const fechaHoy = computed(() => {
  const d = new Date();
  const dias  = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
  const meses = ['enero','febrero','marzo','abril','mayo','junio',
                 'julio','agosto','septiembre','octubre','noviembre','diciembre'];
  return `${dias[d.getDay()]}, ${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
});

const salir = () => {
  auth.cerrarSesion();
  router.push('/login');
};

onMounted(() => {
  alertas.cargar();
});
</script>

<style scoped>
.disposicion { display: flex; min-height: 100vh; }

/* ── BARRA LATERAL ─────────────────────────────── */
.barra-lateral {
  width: 258px; flex-shrink: 0;
  background: var(--lateral);
  display: flex; flex-direction: column;
  position: sticky; top: 0; height: 100vh;
  z-index: 60;
}

.marca {
  display: flex; align-items: center; gap: 11px;
  padding: 20px 18px;
  border-bottom: 1px solid rgba(255,255,255,.08);
}
.marca-logo { width: 38px; height: 38px; object-fit: contain; flex-shrink: 0; }
.marca-texto { display: flex; flex-direction: column; line-height: 1.3; min-width: 0; }
.marca-texto strong { color: #fff; font-size: 14px; font-weight: 600; }
.marca-texto span  { color: var(--lateral-texto); font-size: 11.5px; }

.navegacion { flex: 1; overflow-y: auto; padding: 14px 12px; }
.grupo-titulo {
  padding: 14px 10px 7px;
  font-size: 10.5px; font-weight: 600;
  text-transform: uppercase; letter-spacing: .08em;
  color: rgba(255,255,255,.35);
}
.grupo-titulo:first-child { padding-top: 4px; }

.enlace {
  display: flex; align-items: center; gap: 11px;
  padding: 10px 12px; margin-bottom: 2px;
  color: var(--lateral-texto);
  text-decoration: none;
  font-size: 13.5px; font-weight: 450;
  border-radius: var(--radio);
  transition: all var(--transicion);
}
.enlace:hover { background: rgba(255,255,255,.06); color: #fff; }
.enlace svg { flex-shrink: 0; opacity: .85; }
.enlace span:first-of-type { flex: 1; }

.enlace.router-link-active {
  background: var(--lateral-activo);
  color: #fff; font-weight: 500;
  box-shadow: inset 3px 0 0 var(--rojo-claro);
}
.enlace.router-link-active svg { opacity: 1; color: var(--rojo-claro); }

.insignia {
  min-width: 19px; height: 19px;
  display: flex; align-items: center; justify-content: center;
  padding: 0 6px;
  background: var(--rojo-bomberos); color: #fff;
  font-size: 10.5px; font-weight: 700;
  border-radius: 99px;
}

.pie-lateral {
  padding: 14px 12px;
  border-top: 1px solid rgba(255,255,255,.08);
}

.tarjeta-usuario {
  display: flex; align-items: center; gap: 10px;
  padding: 10px;
  background: rgba(255,255,255,.05);
  border-radius: var(--radio);
  margin-bottom: 8px;
}
.avatar {
  width: 34px; height: 34px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: var(--rojo-bomberos); color: #fff;
  font-size: 12px; font-weight: 700;
  border-radius: 50%;
}
.usuario-datos { display: flex; flex-direction: column; line-height: 1.35; min-width: 0; }
.usuario-datos strong {
  color: #fff; font-size: 12.5px; font-weight: 500;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.usuario-datos span { color: var(--lateral-texto); font-size: 11px; }

.btn-salir {
  width: 100%;
  display: flex; align-items: center; gap: 9px;
  padding: 9px 12px;
  background: transparent; border: none;
  color: var(--lateral-texto);
  font: inherit; font-size: 13px;
  border-radius: var(--radio);
  cursor: pointer;
  transition: all var(--transicion);
}
.btn-salir:hover { background: rgba(198,40,40,.18); color: var(--rojo-claro); }

.velo-lateral { display: none; }

/* ── ZONA PRINCIPAL ────────────────────────────── */
.zona-principal { flex: 1; display: flex; flex-direction: column; min-width: 0; }

.encabezado {
  height: 60px; flex-shrink: 0;
  display: flex; align-items: center; gap: 12px;
  padding: 0 24px;
  background: var(--superficie);
  border-bottom: 1px solid var(--borde);
  position: sticky; top: 0; z-index: 40;
}

.btn-menu {
  display: none;
  padding: 8px; background: none; border: none;
  color: var(--texto-suave); border-radius: var(--radio); cursor: pointer;
}
.btn-menu:hover { background: var(--superficie-alt); }

.fecha-actual { font-size: 12.5px; color: var(--texto-suave); }
.fecha-actual::first-letter { text-transform: uppercase; }

.btn-tema {
  width: 36px; height: 36px;
  display: flex; align-items: center; justify-content: center;
  background: var(--superficie-alt);
  border: 1px solid var(--borde);
  border-radius: var(--radio);
  color: var(--texto-suave);
  cursor: pointer;
  transition: all var(--transicion);
}
.btn-tema:hover {
  color: var(--rojo-bomberos);
  border-color: var(--rojo-bomberos);
  background: var(--peligro-fondo);
}

.contenido { flex: 1; padding: 26px; }

.texto-confirmar { color: var(--texto-suave); font-size: 14px; }

/* ── TRANSICIONES ──────────────────────────────── */
.vista-enter-active { transition: all 200ms ease; }
.vista-leave-active { transition: all 140ms ease; }
.vista-enter-from { opacity: 0; transform: translateY(8px); }
.vista-leave-to   { opacity: 0; }

.girar-icono-enter-active,
.girar-icono-leave-active { transition: all 220ms cubic-bezier(.4,0,.2,1); }
.girar-icono-enter-from { opacity: 0; transform: rotate(-90deg) scale(.6); }
.girar-icono-leave-to   { opacity: 0; transform: rotate(90deg) scale(.6); }

/* ── RESPONSIVO ────────────────────────────────── */
@media (max-width: 1000px) {
  .barra-lateral {
    position: fixed; left: 0; top: 0;
    transform: translateX(-100%);
    transition: transform 240ms cubic-bezier(.4,0,.2,1);
    box-shadow: var(--sombra-lg);
  }
  .disposicion:not(.lateral-oculto) .barra-lateral { transform: translateX(0); }
  .disposicion:not(.lateral-oculto) .velo-lateral {
    display: block; position: fixed; inset: 0;
    background: rgba(0,0,0,.5); z-index: 50;
    animation: aparecer 200ms ease;
  }
  .btn-menu { display: flex; }
  .contenido { padding: 18px 16px; }
  .fecha-actual { display: none; }
}
</style>