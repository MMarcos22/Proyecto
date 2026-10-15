// Roles (análisis §12):
//   administrador → Administración: opera todo el sistema
//   operativo     → Cabina: inicia boletas, registra regresos, completa las propias con PIN
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
// Escribir boletas: administración y cabina
const ambosRoles = permitirRoles('administrador', 'operativo');
// Consultar: cualquiera con sesión
const todosLosRoles = permitirRoles('administrador', 'operativo', 'direccion');
// Análisis e informes institucionales: administración y dirección
const gestion = permitirRoles('administrador', 'direccion');

// La dirección solo consulta: cualquier escritura se rechaza, salvo cambiar su propia clave
const soloLecturaDireccion = (req, res, next) => {
    if (req.usuario?.rol === 'direccion' && req.method !== 'GET' && !req.originalUrl.startsWith('/api/usuarios/mi-clave')) {
        return res.status(403).json({ mensaje: 'La dirección tiene acceso de consulta; no puede modificar registros' });
    }
    next();
};

module.exports = { permitirRoles, soloAdministrador, ambosRoles, todosLosRoles, gestion, soloLecturaDireccion };
