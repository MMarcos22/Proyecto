<template>
  <router-view v-slot="{ Component }">
    <transition name="pagina" mode="out-in">
      <component :is="Component" />
    </transition>
  </router-view>

  <Notificaciones />
</template>

<script setup>
import Notificaciones from './components/Notificaciones.vue';
</script>

<style>
.pagina-enter-active,
.pagina-leave-active { transition: opacity 180ms ease, transform 180ms ease; }
.pagina-enter-from { opacity: 0; transform: translateY(6px); }
.pagina-leave-to   { opacity: 0; transform: translateY(-4px); }
</style>