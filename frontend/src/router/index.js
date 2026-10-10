import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const rutas = [
    {
        path: '/login',
        name: 'login',
        component: () => import('../views/Login.vue'),
        meta: { publica: true }
    },
    {
        path: '/',
        component: () => import('../components/LayoutPrincipal.vue'),
        children: [
            {
                path: '',
                redirect: () => {
                    const auth = useAuthStore();
                    return auth.esAdministrador ? '/panel' : '/registrar';
                }
            },
            {
                path: 'panel',
                name: 'panel',
                component: () => import('../views/Panel.vue'),
                meta: { rol: 'administrador' }
            },
            {
                path: 'registrar',
                name: 'registrar',
                component: () => import('../views/RegistrarServicio.vue'),
                meta: { rol: 'operativo' }
            },
            {
                path: 'historial',
                name: 'historial',
                component: () => import('../views/Historial.vue')
            },
            {
                path: 'historial/:id',
                name: 'detalle-servicio',
                component: () => import('../views/DetalleServicio.vue')
            },
            {
                path: 'inventario',
                name: 'inventario',
                component: () => import('../views/Inventario.vue')
            },
            {
                path: 'movimientos',
                name: 'movimientos',
                component: () => import('../views/Movimientos.vue')
            },

            {
                path: 'control-mensual',
                name: 'control-mensual',
                component: () => import('../views/ControlMensual.vue')
            },

            {
                path: 'reportes',
                name: 'reportes',
                component: () => import('../views/Reportes.vue')
            },
            {
                path: 'zonas',
                name: 'zonas',
                component: () => import('../views/AnalisisZonas.vue'),
                meta: { rol: 'administrador' }
            }
        ]
    },
    { path: '/:pathMatch(.*)*', redirect: '/' }
];

const router = createRouter({
    history: createWebHistory(),
    routes: rutas,
    scrollBehavior: () => ({ top: 0 })
});

router.beforeEach((to, from, next) => {
    const auth = useAuthStore();

    if (to.meta.publica) {
        if (auth.autenticado) return next('/');
        return next();
    }

    if (!auth.autenticado) return next('/login');

    if (to.meta.rol && auth.usuario?.rol !== to.meta.rol) {
        return next(auth.esAdministrador ? '/panel' : '/registrar');
    }

    next();
});

export default router;