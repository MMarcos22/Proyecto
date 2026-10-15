import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';

// Quién puede abrir cada página (sin meta.roles: cualquiera con sesión).
//   Cabina: Inicio, registrar llamada y completar boleta.
//   Operativo: lo de cabina, más existencias, movimientos, boletas e informes.
//   Administración: todo; ve las boletas por completar, pero no las completa.
//   Dirección: consulta.
const ADMIN = ['administrador'];
const GESTION = ['administrador', 'direccion'];
const ATIENDEN = ['cabina', 'operativo'];
const REGISTRAN = ['administrador', 'cabina', 'operativo'];
const CONSULTAN = ['administrador', 'operativo', 'direccion'];
const IMPRIMEN = ['administrador', 'operativo', 'cabina'];

// Cada sección es una entrada del menú lateral. Si tiene varias páginas,
// se muestran como pestañas arriba de la vista; el menú queda corto y cada
// pantalla relacionada sigue a un clic.
export const SECCIONES = {
    inicio: { nombre: 'Inicio', icono: 'panel' },
    boletas: { grupo: 'Servicios', nombre: 'Boletas', icono: 'historial', paginas: ['revision', 'historial', 'imprimir'] },
    servicios: { grupo: 'Servicios', nombre: 'Análisis de servicios', icono: 'mapa', paginas: ['servicios'] },
    existencias: { grupo: 'Inventario', nombre: 'Existencias', icono: 'caja', paginas: ['inventario', 'lotes'] },
    movimientos: { grupo: 'Inventario', nombre: 'Movimientos', icono: 'movimientos', paginas: ['movimientos', 'movimientos-lineas'] },
    analisis: { nombre: 'Análisis institucional', icono: 'informe', paginas: ['panel', 'informe-integrado', 'proyeccion', 'demanda'] },
    informes: { nombre: 'Informes', icono: 'imprimir', paginas: ['informes'] },
    configuracion: { nombre: 'Configuración', icono: 'catalogo', paginas: ['catalogos', 'usuarios', 'bitacora'] }
};

const vista = (path, name, archivo, meta) => ({
    path, name, component: () => import(`../views/${archivo}.vue`), meta
});

const rutas = [
    { path: '/login', name: 'login', component: () => import('../views/Login.vue'), meta: { publica: true } },

    { path: '/registrar', redirect: (to) => ({ path: '/boleta/nueva', query: to.query }) },
    { path: '/historial/:id/editar', redirect: (to) => `/boleta/${to.params.id}` },
    { path: '/boleta/:id/cerrar', redirect: (to) => `/boleta/${to.params.id}` },
    { path: '/boleta/:id/editar', redirect: (to) => `/boleta/${to.params.id}` },
    { path: '/zonas', redirect: '/servicios' },
    { path: '/reabastecimiento', redirect: '/proyeccion' },

    {
        path: '/',
        component: () => import('../components/LayoutPrincipal.vue'),
        children: [
            { path: '', redirect: '/inicio' },
            vista('inicio', 'inicio', 'Inicio', { seccion: 'inicio', titulo: 'Inicio' }),

            vista('revision', 'revision', 'Revision', { seccion: 'boletas', titulo: 'Revisión diaria', pestana: 'Revisión diaria', roles: GESTION }),
            vista('historial', 'historial', 'Historial', { seccion: 'boletas', titulo: 'Historial', pestana: 'Historial', roles: CONSULTAN }),
            vista('imprimir', 'imprimir', 'Imprimir', { seccion: 'boletas', titulo: 'Por imprimir', pestana: 'Por imprimir', roles: IMPRIMEN }),
            vista('historial/:id', 'detalle-servicio', 'DetalleServicio', { seccion: 'boletas', titulo: 'Boleta' }),
            vista('boleta/nueva', 'nueva-boleta', 'NuevaBoleta', { seccion: 'boletas', titulo: 'Registrar llamada', roles: REGISTRAN }),
            vista('boleta/:id', 'completar-boleta', 'CompletarBoleta', { seccion: 'boletas', titulo: 'Completar boleta', roles: ATIENDEN }),

            vista('servicios', 'servicios', 'AnalisisServicios', { seccion: 'servicios', titulo: 'Análisis de servicios', roles: GESTION }),

            vista('inventario', 'inventario', 'Inventario', { seccion: 'existencias', titulo: 'Existencias', pestana: 'Insumos', roles: CONSULTAN }),
            vista('lotes', 'lotes', 'Lotes', { seccion: 'existencias', titulo: 'Lotes y vencimientos', pestana: 'Lotes y vencimientos', roles: CONSULTAN }),
            vista('inventario/:id', 'kardex', 'Kardex', { seccion: 'existencias', titulo: 'Movimientos del insumo', roles: CONSULTAN }),
            vista('movimientos', 'movimientos', 'Documentos', { seccion: 'movimientos', titulo: 'Documentos de bodega', pestana: 'Documentos', roles: CONSULTAN }),
            vista('movimientos/lineas', 'movimientos-lineas', 'Movimientos', { seccion: 'movimientos', titulo: 'Movimientos por línea', pestana: 'Por insumo y lote', roles: CONSULTAN }),
            vista('control-mensual', 'control-mensual', 'ControlMensual', { seccion: 'informes', titulo: 'Control mensual', roles: CONSULTAN }),

            vista('panel', 'panel', 'Panel', { seccion: 'analisis', titulo: 'Resumen del periodo', pestana: 'Resumen', roles: GESTION }),
            vista('informe-integrado', 'informe-integrado', 'InformeIntegrado', { seccion: 'analisis', titulo: 'Consumo por servicio', pestana: 'Consumo por servicio', roles: GESTION }),
            vista('proyeccion', 'proyeccion', 'Proyeccion', { seccion: 'analisis', titulo: 'Proyección anual', pestana: 'Proyección anual', roles: GESTION }),
            vista('demanda', 'demanda', 'Demanda', { seccion: 'analisis', titulo: 'Demanda y recursos', pestana: 'Demanda y recursos', roles: GESTION }),

            vista('informes', 'informes', 'Informes', { seccion: 'informes', titulo: 'Informes', roles: CONSULTAN }),
            vista('informes/anual', 'informe-anual', 'InformeAnual', { seccion: 'informes', titulo: 'Resumen anual de inventario', roles: CONSULTAN }),
            vista('informes/combustible', 'informe-combustible', 'InformeCombustible', { seccion: 'informes', titulo: 'Salidas por unidad', roles: CONSULTAN }),
            vista('informes/personas', 'informe-personas', 'InformePersonas', { seccion: 'informes', titulo: 'Personas atendidas', roles: CONSULTAN }),
            vista('informes/totales', 'informe-totales', 'InformeTotales', { seccion: 'informes', titulo: 'Totales por tipo', roles: CONSULTAN }),
            vista('informes/servicios', 'informe-servicios', 'InformeServicios', { seccion: 'informes', titulo: 'Servicios atendidos', roles: CONSULTAN }),

            vista('catalogos', 'catalogos', 'Catalogos', { seccion: 'configuracion', titulo: 'Catálogos', pestana: 'Catálogos', roles: ADMIN }),
            vista('usuarios', 'usuarios', 'Usuarios', { seccion: 'configuracion', titulo: 'Usuarios', pestana: 'Usuarios', roles: ADMIN }),
            vista('bitacora', 'bitacora', 'Bitacora', { seccion: 'configuracion', titulo: 'Bitácora', pestana: 'Bitácora', roles: GESTION })
        ]
    },
    { path: '/:pathMatch(.*)*', redirect: '/' }
];

const router = createRouter({
    history: createWebHistory(),
    routes: rutas,
    scrollBehavior: (to, from, guardado) => guardado || { top: 0 }
});

export const puedeAbrir = (r, rol) => !r.meta?.roles || r.meta.roles.includes(rol);

// Páginas de una sección que el usuario puede abrir, en el orden de las pestañas
export const paginasVisibles = (clave, rol) => {
    const s = SECCIONES[clave];
    if (!s?.paginas) return [];
    return s.paginas
        .map(nombre => router.getRoutes().find(r => r.name === nombre))
        .filter(r => r && puedeAbrir(r, rol));
};

router.beforeEach((to) => {
    const auth = useAuthStore();
    // Una ventana que quedó abierta al cambiar de página no debe dejar la página sin desplazamiento
    document.body.style.overflow = '';
    if (to.meta.publica) return auth.autenticado ? '/' : true;
    if (!auth.autenticado) return { path: '/login', query: to.fullPath !== '/' ? { volver: to.fullPath } : {} };
    if (!puedeAbrir(to, auth.usuario?.rol)) return '/inicio';
    return true;
});

router.afterEach((to) => {
    document.title = `${to.meta.titulo ? to.meta.titulo + ' · ' : ''}Bomberos 39ª Compañía`;
});

export default router;
