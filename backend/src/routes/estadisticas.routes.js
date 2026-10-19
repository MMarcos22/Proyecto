const express = require('express');
const router = express.Router();

const r = require('../controllers/controlMensualController');
const a = require('../controllers/analiticaController');
const s = require('../controllers/serviciosController');
const { verificarToken } = require('../middleware/auth');
const { todosLosRoles, gestion, consultaInstitucional } = require('../middleware/roles');

router.use(verificarToken);

router.get('/panel', todosLosRoles, a.panel);
router.get('/servicios', gestion, s.analisis);
router.get('/integrado', gestion, a.integrado);
router.get('/tendencias', gestion, a.tendencias);
router.get('/inventario/excel', consultaInstitucional, r.inventarioExcel);
router.get('/inventario/control', consultaInstitucional, r.inventarioControlMensual);
router.get('/inventario/vale-salidas', consultaInstitucional, r.valeSalidasExcel);

module.exports = router;
