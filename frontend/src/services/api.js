import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:3000/api',
    headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

api.interceptors.response.use(
    (respuesta) => respuesta,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('usuario');
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;

export const autenticacion = {
    login: (datos) => api.post('/auth/login', datos),
    perfil: () => api.get('/auth/perfil')
};

export const emergencias = {
    registrar: (datos) => api.post('/emergencias', datos),
    listar: (params) => api.get('/emergencias', { params }),
    obtener: (id) => api.get(`/emergencias/${id}`),
    paraVinculo: () => api.get('/emergencias/vinculo')
};

export const inventario = {
    listar: (params) => api.get('/inventario', { params }),
    alertas: () => api.get('/inventario/alertas'),
    alertasDetalle: () => api.get('/inventario/alertas/detalle'),
    movimientos: (params) => api.get('/inventario/movimientos', { params }),
    movimientosInsumo: (id, params) =>
        api.get(`/inventario/movimientos/insumo/${id}`, { params }),
    entrada: (datos) => api.post('/inventario/entrada', datos),
    salida: (datos) => api.post('/inventario/salida', datos),
    editarMovimiento: (id, d) => api.put(`/inventario/movimientos/${id}`, d),
    eliminarMovimiento: (id) => api.delete(`/inventario/movimientos/${id}`),
    crearInsumo: (datos) => api.post('/inventario/insumos', datos),
    editarInsumo: (id, d) => api.put(`/inventario/insumos/${id}`, d),
    eliminarInsumo: (id) => api.delete(`/inventario/insumos/${id}`)
};

export const reportes = {
    estadisticas: (params) => api.get('/reportes/estadisticas', { params }),
    integrado: (params) => api.get('/reportes/integrado', { params }),
    inventarioControlMensual: (params) => api.get('/reportes/inventario/control', { params }),
    inventarioExcel: (mes, anio) => {
        const token = localStorage.getItem('token');
        const url = `http://localhost:3000/api/reportes/inventario/excel?mes=${mes}&anio=${anio}`;
        return fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.blob());
    },
    valeSalidasExcel: () => {
        const token = localStorage.getItem('token');
        return fetch('http://localhost:3000/api/reportes/inventario/vale-salidas',
            { headers: { Authorization: `Bearer ${token}` } }).then(r => r.blob());
    }
};

export const analisis = {
    zonas: (params) => api.get('/analisis/zonas', { params }),
    zonasTabla: (params) => api.get('/analisis/zonas/tabla', { params })
};