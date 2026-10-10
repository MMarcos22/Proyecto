<template>
  <div class="pantalla-login">
    <button class="alternar-tema-login" @click="tema.alternar()" :title="tema.oscuro ? 'Modo claro' : 'Modo oscuro'">
      <svg v-if="tema.oscuro" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <circle cx="12" cy="12" r="4.5"/>
        <line x1="12" y1="1.5" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22.5"/>
        <line x1="4.2" y1="4.2" x2="6" y2="6"/><line x1="18" y1="18" x2="19.8" y2="19.8"/>
        <line x1="1.5" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22.5" y2="12"/>
        <line x1="4.2" y1="19.8" x2="6" y2="18"/><line x1="18" y1="6" x2="19.8" y2="4.2"/>
      </svg>
      <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
      </svg>
    </button>

    <div class="marca-lateral">
      <div class="marca-contenido">
        <div class="escudo">
          <img src="/LogoBomberos.png" alt="Bomberos Voluntarios 39¬™ Compa√±√≠a" />
        </div>
        <h1>Bomberos Voluntarios</h1>
        <p class="compania">39¬™ Compa√±√≠a de Chiquimula</p>
        <div class="separador"></div>
        <p class="lema">
          Sistema de control operativo y administrativo de emergencias
          atendidas e inventario de insumos
        </p>
      </div>
      <p class="pie-marca">Benem√©rito Cuerpo Voluntario de Bomberos de Guatemala</p>
    </div>

    <div class="panel-acceso">
      <div class="formulario-acceso animar">
        <div class="escudo-movil">
          <img src="/LogoBomberos.png" alt="Bomberos Voluntarios" />
        </div>

        <h2>Iniciar sesi√≥n</h2>
        <p class="subtitulo">Ingrese sus credenciales para acceder al sistema</p>

        <form @submit.prevent="acceder">
          <div class="campo">
            <label for="usuario">Usuario</label>
            <div class="campo-icono">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
              <input
                id="usuario"
                v-model="credenciales.usuario"
                class="control"
                type="text"
                placeholder="Nombre de usuario"
                autocomplete="username"
                :class="{ error: errorMensaje }"
                required
              />
            </div>
          </div>

          <div class="campo">
            <label for="password">Contrase√±a</label>
            <div class="campo-icono">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2"/>
                <path d="M7 11V7a5 5 0 0110 0v4"/>
              </svg>
              <input
                id="password"
                v-model="credenciales.password"
                class="control"
                :type="verClave ? 'text' : 'password'"
                placeholder="Contrase√±a"
                autocomplete="current-password"
                :class="{ error: errorMensaje }"
                required
              />
              <button type="button" class="ver-clave" @click="verClave = !verClave" tabindex="-1">
                <svg v-if="verClave" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
                <svg v-else width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              </button>
            </div>
          </div>

          <transition name="alerta">
            <div v-if="errorMensaje" class="alerta-acceso">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <span>{{ errorMensaje }}</span>
            </div>
          </transition>

          <button type="submit" class="btn btn-primario btn-acceso" :disabled="auth.cargando">
            <span v-if="!auth.cargando">Ingresar al sistema</span>
            <template v-else>
              <span class="cargador"></span>
              <span>Verificando</span>
            </template>
          </button>
        </form>

        <p class="pie-formulario">Chiquimula, Guatemala</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useTemaStore } from '../stores/tema';

const router = useRouter();
const auth   = useAuthStore();
const tema   = useTemaStore();

const credenciales = reactive({ usuario: '', password: '' });
const errorMensaje = ref('');
const verClave     = ref(false);

const acceder = async () => {
  errorMensaje.value = '';
  const resultado = await auth.iniciarSesion(credenciales);

  if (resultado.ok) {
    router.push(auth.esAdministrador ? '/panel' : '/registrar');
  } else {
    errorMensaje.value = resultado.mensaje;
  }
};
</script>

<style scoped>
.pantalla-login {
  display: grid;
  grid-template-columns: 46% 54%;
  min-height: 100vh;
  position: relative;
}

.alternar-tema-login {
  position: absolute; top: 22px; right: 24px; z-index: 10;
  width: 38px; height: 38px;
  display: flex; align-items: center; justify-content: center;
  background: var(--superficie);
  border: 1px solid var(--borde);
  border-radius: var(--radio);
  color: var(--texto-suave);
  cursor: pointer;
  transition: all var(--transicion);
}
.alternar-tema-login:hover {
  color: var(--rojo-bomberos);
  border-color: var(--rojo-bomberos);
  transform: rotate(-12deg);
}

/* ‚"?‚"? LATERAL DE MARCA ‚"?‚"?‚"?‚"?‚"?‚"?‚"?‚"?‚"?‚"?‚"?‚"?‚"?‚"?‚"?‚"?‚"?‚"?‚"?‚"?‚"?‚"?‚"?‚"?‚"?‚"?‚"?‚"? */
.marca-lateral {
  background: linear-gradient(150deg, var(--rojo-oscuro) 0%, var(--rojo-bomberos) 55%, #A32020 100%);
  color: #fff;
  padding: 52px 48px;
  display: flex; flex-direction: column; justify-content: space-between;
  position: relative; overflow: hidden;
}
.marca-lateral::before,
.marca-lateral::after {
  content: ''; position: absolute; border-radius: 50%;
  background: rgba(255,255,255,.06);
}
.marca-lateral::before { width: 420px; height: 420px; top: -150px; right: -160px; }
.marca-lateral::after  { width: 300px; height: 300px; bottom: -110px; left: -110px; }

.marca-contenido {
  position: relative; z-index: 1;
  margin-top: 20px;
  margin-bottom: auto;
}

.escudo {
  width: 245px; height: 245px;
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 30px;
}
.escudo img { width: 100%; height: 100%; object-fit: contain; }

.marca-contenido h1 {
  font-size: 30px; font-weight: 700; letter-spacing: -.025em;
  margin-bottom: 6px;
}
.compania { font-size: 16px; opacity: .92; font-weight: 500; }

.separador {
  width: 52px; height: 3px;
  background: rgba(255,255,255,.4);
  border-radius: 99px;
  margin: 26px 0;
}

.lema {
  font-size: 14.5px; line-height: 1.7; opacity: .85;
  max-width: 330px;
}

.pie-marca {
  position: relative; z-index: 1;
  font-size: 12px; opacity: .6;
}

/* ‚"?‚"? PANEL DE ACCESO ‚"?‚"?‚"?‚"?‚"?‚"?‚"?‚"?‚"?‚"?‚"?‚"?‚"?‚"?‚"?‚"?‚"?‚"?‚"?‚"?‚"?‚"?‚"?‚"?‚"?‚"?‚"?‚"?‚"? */
.panel-acceso {
  display: flex; align-items: center; justify-content: center;
  padding: 40px 28px;
  background: var(--fondo);
}

.formulario-acceso { width: 100%; max-width: 380px; }

.escudo-movil {
  display: none;
  width: 76px; height: 76px;
  margin: 0 auto 22px;
}
.escudo-movil img { width: 100%; height: 100%; object-fit: contain; }

.formulario-acceso h2 { margin-bottom: 6px; }
.subtitulo {
  color: var(--texto-suave); font-size: 13.5px;
  margin-bottom: 30px;
}

.campo-icono { position: relative; display: flex; align-items: center; }
.campo-icono > svg {
  position: absolute; left: 13px;
  color: var(--texto-tenue); pointer-events: none;
}
.campo-icono .control { padding-left: 40px; }

.ver-clave {
  position: absolute; right: 8px;
  display: flex; padding: 6px;
  background: none; border: none; border-radius: 6px;
  color: var(--texto-tenue); cursor: pointer;
  transition: color var(--transicion);
}
.ver-clave:hover { color: var(--texto); }

.alerta-acceso {
  display: flex; align-items: center; gap: 9px;
  padding: 11px 14px;
  background: var(--peligro-fondo); color: var(--peligro);
  border-radius: var(--radio);
  font-size: 13px;
  margin-bottom: 16px;
}

.btn-acceso { width: 100%; padding: 12px; margin-top: 6px; }

.pie-formulario {
  text-align: center; margin-top: 30px;
  font-size: 12px; color: var(--texto-tenue);
}

.alerta-enter-active { animation: aparecer 240ms ease both; }
.alerta-leave-active { transition: all 160ms ease; }
.alerta-leave-to { opacity: 0; transform: translateY(-5px); }

@media (max-width: 900px) {
  .pantalla-login { grid-template-columns: 1fr; }
  .marca-lateral { display: none; }
  .escudo-movil { display: flex; }
  .formulario-acceso h2, .subtitulo { text-align: center; }
}
</style>