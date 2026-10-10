const express = require('express');
const router = express.Router();

const {
    registrar, listar, obtenerPorId, listarParaVinculo
} = require('../controllers/emergenciasController');

const { verificarToken } = require('../middleware/auth');
const { soloOperativo, ambosRoles } = require('../middleware/roles');

router.use(verificarToken);

router.post('/', soloOperativo, registrar);
router.get('/', ambosRoles, listar);
router.get('/vinculo', ambosRoles, listarParaVinculo);
router.get('/:id', ambosRoles, obtenerPorId);

module.exports = router;