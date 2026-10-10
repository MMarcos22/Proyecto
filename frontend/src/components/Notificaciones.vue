<template>
  <div class="pila-notificaciones">
    <transition-group name="notif">
      <div
        v-for="n in notif.lista"
        :key="n.id"
        class="notificacion"
        :class="`notif-${n.tipo}`"
        @click="notif.cerrar(n.id)"
      >
        <div class="notif-icono">
          <svg v-if="n.tipo === 'exito'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <svg v-else-if="n.tipo === 'peligro'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          <svg v-else-if="n.tipo === 'alerta'" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
        </div>
        <span class="notif-texto">{{ n.mensaje }}</span>
      </div>
    </transition-group>
  </div>
</template>

<script setup>
import { useNotificacionesStore } from '../stores/notificaciones';
const notif = useNotificacionesStore();
</script>

<style scoped>
.pila-notificaciones {
  position: fixed;
  top: 20px; right: 20px;
  z-index: 9000;
  display: flex; flex-direction: column; gap: 10px;
  max-width: 400px;
}

.notificacion {
  display: flex; align-items: flex-start; gap: 12px;
  padding: 14px 18px;
  background: var(--superficie);
  border: 1px solid var(--borde);
  border-left: 3px solid;
  border-radius: var(--radio);
  box-shadow: var(--sombra-md);
  cursor: pointer;
  transition: transform var(--transicion), box-shadow var(--transicion);
}
.notificacion:hover {
  transform: translateX(-3px);
  box-shadow: var(--sombra-lg);
}

.notif-icono { flex-shrink: 0; display: flex; margin-top: 1px; }
.notif-texto { font-size: 13.5px; color: var(--texto); line-height: 1.5; }

.notif-exito   { border-left-color: var(--exito); }
.notif-exito   .notif-icono { color: var(--exito); }
.notif-peligro { border-left-color: var(--peligro); }
.notif-peligro .notif-icono { color: var(--peligro); }
.notif-alerta  { border-left-color: var(--alerta); }
.notif-alerta  .notif-icono { color: var(--alerta); }
.notif-info    { border-left-color: var(--info); }
.notif-info    .notif-icono { color: var(--info); }

.notif-enter-active { animation: deslizar 300ms cubic-bezier(.2,.9,.3,1.2) both; }
.notif-leave-active { transition: all 220ms ease; position: absolute; }
.notif-leave-to { opacity: 0; transform: translateX(28px) scale(.95); }
.notif-move { transition: transform 240ms ease; }

@media (max-width: 640px) {
  .pila-notificaciones { left: 14px; right: 14px; max-width: none; }
}
</style>