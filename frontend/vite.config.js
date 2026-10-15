import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
    plugins: [vue()],
    server: {
        port: 5173,
        // Accesible desde las otras computadoras de la estación (http://IP:5173)
        host: true,
        open: true
    }
});