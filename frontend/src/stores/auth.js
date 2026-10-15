import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { autenticacion, mensajeError } from '../services/api';

export const useAuthStore = defineStore('auth', () => {
    const usuario = ref(null);
    const token = ref(localStorage.getItem('token') || null);
    const cargando = ref(false);

    const autenticado = computed(() => !!token.value);
    const esAdministrador = computed(() => usuario.value?.rol === 'administrador');
    const esOperativo = computed(() => usuario.value?.rol === 'operativo');
    const esCabina = computed(() => usuario.value?.rol === 'cabina');
    const esDireccion = computed(() => usuario.value?.rol === 'direccion');
    // Cabina y operativo atienden servicios: registran llamadas, regresos y completan
    // boletas con el PIN de la tripulación. La administración ve, revisa y firma.
    const atiendeServicios = computed(() => esCabina.value || esOperativo.value);
    const puedeEditar = computed(() => !esDireccion.value);
    const nombreRol = computed(() => ({ administrador: 'Administración', operativo: 'Operativo', cabina: 'Cabina', direccion: 'Dirección' })[usuario.value?.rol] || '');
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
            return { ok: false, mensaje: mensajeError(error, 'No se pudo iniciar sesión') };
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
        autenticado, esAdministrador, esOperativo, esCabina, esDireccion, atiendeServicios, puedeEditar, nombreRol, iniciales,
        restaurar, iniciarSesion, cerrarSesion
    };
});