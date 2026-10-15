const express = require('express');
const router = express.Router();

const c = require('../controllers/informesController');
const { verificarToken } = require('../middleware/auth');
const { gestion } = require('../middleware/roles');

// Informes que se entregan fuera de la compañía: administración y dirección
router.use(verificarToken, gestion);

router.get('/anual', c.resumenAnual);
router.get('/proyeccion', c.proyeccion);
router.get('/salidas-unidad', c.salidasUnidad);
router.get('/personas', c.personas);
router.get('/totales', c.totalesTipo);

module.exports = router;
