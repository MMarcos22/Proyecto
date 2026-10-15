import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { autenticacion } from '../services/api';

export const useAuthStore = defineStore('auth', () => {
    const usuario = ref(null);
    const token = ref(localStorage.getItem('token') || null);
    const cargando = ref(false);

    const autenticado = computed(() => !!token.value);
    const esAdministrador = computed(() => usuario.value?.rol === 'administrador');
    const esOperativo = computed(() => usuario.value?.rol === 'operativo');
    // Cabina: inicia boletas y registra regresos. Dirección: solo consulta.
    const esCabina = esOperativo;
    const esDireccion = computed(() => usuario.value?.rol === 'direccion');
    const puedeEditar = computed(() => !esDireccion.value);
    const nombreRol = computed(() => ({ administrador: 'Administración', operativo: 'Cabina', direccion: 'Dirección' })[usuario.value?.rol] || '');
    const iniciales = computed(() => {
        if (!usuario.value?.nombre) return '';
        return usuario.value.nombre
            .split(' ').slice(0, 2)
            .map(p => p[0]).join('').toUpperCase();
    });

    const restaurar = () => {
        const guardado = localStorage.getItem('usuario');
        if (guardado) {
            try { usuario.value = JSON.parse(guardado); } catch { usuario.value = null; }
        }
    };

    const iniciarSesion = async (credenciales) => {
        cargando.value = true;
        try {
            const { data } = await autenticacion.login(credenciales);
            token.value = data.token;
            usuario.value = data.usuario;
            localStorage.setItem('token', data.token);
            localStorage.setItem('usuario', JSON.stringify(data.usuario));
            return { ok: true };
        } catch (error) {
            return {
                ok: false,
                mensaje: error.response?.data?.mensaje || 'No se pudo conectar con el servidor'
            };
        } finally {
            cargando.value = false;
        }
    };

    const cerrarSesion = () => {
        token.value = null;
        usuario.value = null;
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
    };

    return {
        usuario, token, cargando,
        autenticado, esAdministrador, esOperativo, esCabina, esDireccion, puedeEditar, nombreRol, iniciales,
        restaurar, iniciarSesion, cerrarSesion
    };
});