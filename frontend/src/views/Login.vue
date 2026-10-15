<template>
  <div class="acceso">
    <section class="institucion" aria-hidden="true">
      <div class="sello">
        <img src="/LogoBomberos.png" alt="" />
        <div>
          <span class="mono">B.C.V.B. · GUATEMALA</span>
          <strong>Trigésima Novena Compañía</strong>
          <span>Chiquimula</span>
        </div>
      </div>

      <h1>Control de servicios<br />de emergencia e inventario</h1>

      <dl class="modulos">
        <div><dt class="mono">01</dt><dd>Registro, consulta y análisis de emergencias</dd></div>
        <div><dt class="mono">02</dt><dd>Inventario por lote y vencimiento</dd></div>
        <div><dt class="mono">03</dt><dd>Análisis de datos institucionales</dd></div>
      </dl>

      <p class="pie mono">{{ fechaHoy }}</p>
    </section>

    <section class="formulario">
      <button class="btn btn-plano btn-icono tema" @click="tema.alternar()"
              :aria-label="tema.oscuro ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'">
        <Icono :nombre="tema.oscuro ? 'sol' : 'luna'" :tam="17" />
      </button>

      <form @submit.prevent="acceder" class="caja" novalidate>
        <img src="/LogoBomberos.png" alt="Bomberos Voluntarios 39ª Compañía" class="logo-movil" />
        <h2>Iniciar sesión</h2>
        <p class="suave">Use la cuenta que le asignó el administrador.</p>

        <div class="campo">
          <label for="usuario">Usuario</label>
          <input id="usuario" v-model.trim="credenciales.usuario" class="control" autocomplete="username"
                 autocapitalize="none" spellcheck="false" autofocus :class="{ error: errorMensaje }" />
        </div>

        <div class="campo">
          <label for="clave">Contraseña</label>
          <div class="con-ojo">
            <input id="clave" v-model="credenciales.password" :type="verClave ? 'text' : 'password'" class="control"
                   autocomplete="current-password" :class="{ error: errorMensaje }" @keyup="mayus = $event.getModifierState?.('CapsLock')" />
            <button type="button" class="ojo" @click="verClave = !verClave" :aria-label="verClave ? 'Ocultar contraseña' : 'Mostrar contraseña'">
              <Icono :nombre="verClave ? 'cerrar' : 'ojo'" :tam="15" />
            </button>
          </div>
          <span v-if="mayus" class="ayuda">Bloq Mayús está activado.</span>
        </div>

        <p v-if="errorMensaje" class="aviso aviso-peligro" role="alert"><Icono nombre="alerta" :tam="15" />{{ errorMensaje }}</p>

        <button type="submit" class="btn btn-primario entrar" :disabled="auth.cargando || !credenciales.usuario || !credenciales.password">
          <span v-if="auth.cargando" class="cargador"></span>
          {{ auth.cargando ? 'Verificando…' : 'Ingresar' }}
        </button>
      </form>
    </section>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useTemaStore } from '../stores/tema';
import { fechaLarga, hoy, DIAS } from '../utils/formato';
import Icono from '../components/Icono.vue';

const router = useRouter();
const ruta = useRoute();
const auth = useAuthStore();
const tema = useTemaStore();

const credenciales = reactive({ usuario: '', password: '' });
const errorMensaje = ref('');
const verClave = ref(false);
const mayus = ref(false);
const fechaHoy = `${DIAS[new Date().getDay()]}, ${fechaLarga(hoy())}`;

const acceder = async () => {
  errorMensaje.value = '';
  const resultado = await auth.iniciarSesion(credenciales);
  if (resultado.ok) {
    const volver = typeof ruta.query.volver === 'string' && ruta.query.volver.startsWith('/') ? ruta.query.volver : null;
    router.push(volver || '/inicio');
  } else {
    errorMensaje.value = resultado.mensaje;
  }
};
</script>

<style scoped>
.acceso { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); min-height: 100vh; }

.institucion {
  position: relative;
  display: flex; flex-direction: column;
  padding: 44px 56px;
  background: #16171A; color: #ECEAE5;
  overflow: hidden;
}
/* Franja roja vertical: la única señal de color */
.institucion::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 6px; background: #B42318; }
/* Retícula de fondo, como papel milimetrado del libro de guardia */
.institucion::after {
  content: ''; position: absolute; inset: 0; pointer-events: none;
  background-image: linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px);
  background-size: 28px 28px;
  mask-image: linear-gradient(120deg, transparent 30%, #000 100%);
}

.sello { display: flex; align-items: center; gap: 14px; position: relative; z-index: 1; }
.sello img { width: 58px; height: 58px; }
.sello span { display: block; font-size: 11px; color: #8C8F96; }
.sello .mono { font-size: 10px; letter-spacing: .12em; }
.sello strong { display: block; font-size: 16px; font-weight: 700; letter-spacing: -.01em; }

.institucion h1 {
  position: relative; z-index: 1;
  margin-top: auto;
  font-size: clamp(30px, 3.4vw, 46px); font-weight: 800; letter-spacing: -.035em; line-height: 1.05;
}

.modulos { position: relative; z-index: 1; margin: 34px 0 auto; max-width: 440px; }
.modulos div { display: grid; grid-template-columns: 36px 1fr; padding: 11px 0; border-top: 1px solid rgba(255,255,255,.1); font-size: 14px; }
.modulos dt { color: #E2543F; font-size: 12px; padding-top: 2px; }
.modulos dd { color: #C9C7C2; }

.pie { position: relative; z-index: 1; font-size: 11px; color: #6D7077; text-transform: uppercase; letter-spacing: .08em; }

.formulario { position: relative; display: flex; align-items: center; justify-content: center; padding: 40px 24px; background: var(--fondo); }
.tema { position: absolute; top: 18px; right: 18px; }

.caja { width: 100%; max-width: 360px; }
.caja h2 { font-size: 24px; font-weight: 750; letter-spacing: -.025em; }
.caja > .suave { margin: 6px 0 26px; font-size: 13.5px; }
.logo-movil { display: none; }

.con-ojo { position: relative; }
.con-ojo .control { padding-right: 40px; }
.ojo { position: absolute; right: 4px; top: 50%; transform: translateY(-50%); display: flex; padding: 7px; background: none; border: none; color: var(--texto-tenue); cursor: pointer; border-radius: var(--radio-sm); }
.ojo:hover { color: var(--texto); }

.caja .control { height: 42px; font-size: 14px; }
.caja .aviso { margin-bottom: 14px; }
.entrar { width: 100%; height: 44px; font-size: 14px; margin-top: 6px; }

@media (max-width: 860px) {
  .acceso { grid-template-columns: 1fr; }
  .institucion { display: none; }
  .logo-movil { display: block; width: 64px; margin-bottom: 18px; }
}
</style>
