const express = require('express');
const router = express.Router();

const { analizarZonas, zonasSinIA } = require('../controllers/analisisController');
const { verificarToken } = require('../middleware/auth');
const { soloAdministrador, ambosRoles } = require('../middleware/roles');

router.use(verificarToken);

router.get('/zonas', soloAdministrador, analizarZonas);
router.get('/zonas/tabla', ambosRoles, zonasSinIA);

module.exports = router;