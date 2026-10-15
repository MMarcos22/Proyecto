// Roles (recomendaciones de la compañía, octubre 2026):
//   cabina        → Cabina: registra llamadas, regresos y completa boletas con el PIN de la tripulación
//   operativo     → lo de cabina, más existencias, movimientos e informes
//   administrador → Administración: ve todo; revisa, firma y anula, pero no completa boletas
//   direccion     → Dirección: consulta todo, no modifica nada
const permitirRoles = (...rolesPermitidos) => {
    return (req, res, next) => {
        if (!req.usuario) {
            return res.status(401).json({ mensaje: 'Usuario no autenticado' });
        }
        if (!rolesPermitidos.includes(req.usuario.rol)) {
            return res.status(403).json({ mensaje: 'No cuenta con permisos para realizar esta acción' });
        }
        next();
    };
};

const soloAdministrador = permitirRoles('administrador');
// Escribir boletas (regreso, completar): cabina y operativo
const atiendenServicios = permitirRoles('cabina', 'operativo');
// Registrar una llamada (botón rojo): también la administración
const registranLlamadas = permitirRoles('administrador', 'cabina', 'operativo');
// Acciones de boleta que también hace la administración (anular un servicio en curso, imprimir)
const ambosRoles = permitirRoles('administrador', 'operativo', 'cabina');
// Consultar: cualquiera con sesión
const todosLosRoles = permitirRoles('administrador', 'operativo', 'cabina', 'direccion');
// Análisis institucional, revisión y bitácora: administración y dirección
const gestion = permitirRoles('administrador', 'direccion');
// Inventario (consulta) e informes: operativo, administración y dirección
const consultaInstitucional = permitirRoles('administrador', 'operativo', 'direccion');

// La dirección solo consulta: cualquier escritura se rechaza, salvo cambiar su propia clave
const soloLecturaDireccion = (req, res, next) => {
    if (req.usuario?.rol === 'direccion' && req.method !== 'GET' && !req.originalUrl.startsWith('/api/usuarios/mi-clave')) {
        return res.status(403).json({ mensaje: 'La dirección tiene acceso de consulta; no puede modificar registros' });
    }
    next();
};

module.exports = {
    permitirRoles, soloAdministrador, atiendenServicios, registranLlamadas, ambosRoles, todosLosRoles, gestion, consultaInstitucional,
    soloLecturaDireccion
};
