const express = require('express');
const router = express.Router();

const c = require('../controllers/informesController');
const { verificarToken } = require('../middleware/auth');
const { consultaInstitucional } = require('../middleware/roles');

// Informes: operativo, administración y dirección
router.use(verificarToken, consultaInstitucional);

router.get('/anual', c.resumenAnual);
router.get('/proyeccion', c.proyeccion);
router.get('/salidas-unidad', c.salidasUnidad);
router.get('/personas', c.personas);
router.get('/totales', c.totalesTipo);
router.get('/servicios', c.serviciosDetalle);

module.exports = router;
