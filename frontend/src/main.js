import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import { useAuthStore } from './stores/auth';
import { useTemaStore } from './stores/tema';
// Fuentes dentro del proyecto: el sistema funciona sin internet en la estación
import '@fontsource-variable/inter/wght.css';
import './styles/main.css';
import './styles/boleta.css';

const app = createApp(App);
app.use(createPinia());

useAuthStore().restaurar();
useTemaStore().cargar();

app.use(router);
app.mount('#app');
