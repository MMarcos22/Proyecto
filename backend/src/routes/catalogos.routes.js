const express = require('express');
const router = express.Router();

const c = require('../controllers/catalogosController');
const { verificarToken } = require('../middleware/auth');
const { soloAdministrador, todosLosRoles } = require('../middleware/roles');

router.use(verificarToken);

router.get('/dominio', todosLosRoles, c.obtenerDominio);
router.get('/sectores/pendientes', soloAdministrador, c.zonasSinSector);
router.post('/sectores/asignar', soloAdministrador, c.asignarSectorPendientes);

for (const [ruta, crud] of [['sectores', c.sectores], ['personal', c.personal], ['unidades', c.unidades],
    ['escuadras', c.escuadras], ['lugares', c.lugares]]) {
    router.get(`/${ruta}`, todosLosRoles, crud.listar);
    router.post(`/${ruta}`, soloAdministrador, crud.crear);
    router.put(`/${ruta}/:id`, soloAdministrador, crud.editar);
    router.delete(`/${ruta}/:id`, soloAdministrador, crud.retirar);
}

module.exports = router;
