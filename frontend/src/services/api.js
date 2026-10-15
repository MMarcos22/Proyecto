import axios from 'axios';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
    baseURL: API_URL,
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
        if (error.response?.status === 401 && !error.config.url.includes('/auth/login')) {
            localStorage.removeItem('token');
            localStorage.removeItem('usuario');
            if (window.location.pathname !== '/login') window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default api;

// Mensaje legible de un error de axios
export const mensajeError = (e, porDefecto = 'No se pudo completar la operación') =>
    e?.response?.data?.mensaje || (e?.request && !e?.response ? 'No hay conexión con el servidor' : porDefecto);

// Descarga un archivo binario respetando el nombre que envía el servidor
export const descargar = async (ruta, params, nombre) => {
    const r = await api.get(ruta, { params, responseType: 'blob' });
    const cabecera = r.headers['content-disposition'] || '';
    const sugerido = cabecera.match(/filename="?([^"]+)"?/)?.[1];
    const url = URL.createObjectURL(r.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = sugerido || nombre;
    a.click();
    URL.revokeObjectURL(url);
};

export const autenticacion = {
    login: (datos) => api.post('/auth/login', datos),
    perfil: () => api.get('/auth/perfil')
};

export const emergencias = {
    registrar: (datos) => api.post('/emergencias', datos),
    guardar: (id, datos) => api.put(`/emergencias/${id}`, datos),
    regreso: (id, hora_entrada) => api.post(`/emergencias/${id}/regreso`, { hora_entrada }),
    verificarPin: (id, autor) => api.post(`/emergencias/${id}/pin`, { autor }),
    firmar: (ids) => api.post('/emergencias/firmar', { ids }),
    certificar: (id, d) => api.post(`/emergencias/${id}/certificaciones`, d),
    anular: (id, motivo) => api.post(`/emergencias/${id}/anular`, { motivo }),
    listar: (params) => api.get('/emergencias', { params }),
    obtener: (id) => api.get(`/emergencias/${id}`),
    enCurso: () => api.get('/emergencias/en-curso'),
    // alcance: 'turno' (las del turno de guardia) o 'todas' (administración)
    porCompletar: (alcance = 'turno') => api.get('/emergencias/por-completar', { params: { alcance } }),
    revision: (fecha) => api.get('/emergencias/revision', { params: { fecha } }),
    contadores: () => api.get('/emergencias/contadores'),
    marcarImpresas: (ids) => api.post('/emergencias/impresas', { ids }),
    llamante: (telefono) => api.get('/emergencias/llamante', { params: { telefono } }),
    paraVinculo: (texto) => api.get('/emergencias/vinculo', { params: { texto } }),
    agregarInsumo: (id, datos) => api.post(`/emergencias/${id}/insumos`, datos),
    quitarInsumo: (id, movId, autor) => api.delete(`/emergencias/${id}/insumos/${movId}`, { data: { autor } })
};

export const inventario = {
    listar: (params) => api.get('/inventario', { params }),
    alertasDetalle: () => api.get('/inventario/alertas/detalle'),
    lotes: (params) => api.get('/inventario/lotes', { params }),
    movimientos: (params) => api.get('/inventario/movimientos', { params }),
    kardex: (id, params) => api.get(`/inventario/kardex/${id}`, { params }),
    entrada: (datos) => api.post('/inventario/entrada', datos),
    salida: (datos) => api.post('/inventario/salida', datos),
    anularMovimiento: (id, motivo) => api.delete(`/inventario/movimientos/${id}`, { data: { motivo } }),
    crearInsumo: (datos) => api.post('/inventario/insumos', datos),
    editarInsumo: (id, d) => api.put(`/inventario/insumos/${id}`, d),
    eliminarInsumo: (id) => api.delete(`/inventario/insumos/${id}`),
    documentos: (params) => api.get('/inventario/documentos', { params }),
    documento: (id) => api.get(`/inventario/documentos/${id}`),
    registrarDocumento: (d) => api.post('/inventario/documentos', d),
    cierres: () => api.get('/inventario/cierres'),
    cerrarMes: (anio, mes) => api.post('/inventario/cierres', { anio, mes })
};

export const reportes = {
    panel: (params) => api.get('/reportes/panel', { params }),
    servicios: (params) => api.get('/reportes/servicios', { params }),
    integrado: (params) => api.get('/reportes/integrado', { params }),
    tendencias: (params) => api.get('/reportes/tendencias', { params }),
    inventarioControlMensual: (params) => api.get('/reportes/inventario/control', { params }),
    inventarioExcel: (mes, anio) => descargar('/reportes/inventario/excel', { mes, anio }, `Inventario_${mes}_${anio}.xlsx`),
    valeSalidasExcel: () => descargar('/reportes/inventario/vale-salidas', null, 'Vale_de_salidas.xlsx')
};

export const informes = {
    anual: (anio) => api.get('/informes/anual', { params: { anio } }),
    proyeccion: () => api.get('/informes/proyeccion'),
    salidasUnidad: (params) => api.get('/informes/salidas-unidad', { params }),
    personas: (params) => api.get('/informes/personas', { params }),
    totales: (params) => api.get('/informes/totales', { params }),
    servicios: (params) => api.get('/informes/servicios', { params })
};

const crudCatalogo = (ruta) => ({
    listar: (todos) => api.get(`/catalogos/${ruta}`, { params: todos ? { todos: 1 } : {} }),
    crear: (d) => api.post(`/catalogos/${ruta}`, d),
    editar: (id, d) => api.put(`/catalogos/${ruta}/${id}`, d),
    retirar: (id) => api.delete(`/catalogos/${ruta}/${id}`)
});

export const catalogos = {
    dominio: () => api.get('/catalogos/dominio'),
    sectores: crudCatalogo('sectores'),
    personal: crudCatalogo('personal'),
    unidades: crudCatalogo('unidades'),
    escuadras: crudCatalogo('escuadras'),
    lugares: crudCatalogo('lugares'),
    zonasSinSector: () => api.get('/catalogos/sectores/pendientes'),
    asignarSector: (d) => api.post('/catalogos/sectores/asignar', d)
};

export const usuarios = {
    listar: () => api.get('/usuarios'),
    crear: (d) => api.post('/usuarios', d),
    editar: (id, d) => api.put(`/usuarios/${id}`, d),
    cambiarClave: (d) => api.put('/usuarios/mi-clave', d),
    bitacora: (params) => api.get('/usuarios/bitacora', { params })
};

export const turnos = {
    actual: () => api.get('/turnos/actual'),
    historial: () => api.get('/turnos'),
    abrir: (d) => api.post('/turnos', d),
    editar: (id, d) => api.put(`/turnos/${id}`, d),
    cerrar: (id) => api.post(`/turnos/${id}/cerrar`)
};
