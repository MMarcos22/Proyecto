const express = require('express');
const router = express.Router();

const r = require('../controllers/reportesController');
const a = require('../controllers/analiticaController');
const s = require('../controllers/serviciosController');
const { verificarToken } = require('../middleware/auth');
const { todosLosRoles, gestion } = require('../middleware/roles');

router.use(verificarToken);

router.get('/panel', todosLosRoles, a.panel);
router.get('/servicios', gestion, s.analisis);
router.get('/integrado', gestion, a.integrado);
router.get('/tendencias', gestion, a.tendencias);
router.get('/inventario/excel', gestion, r.inventarioExcel);
router.get('/inventario/control', gestion, r.inventarioControlMensual);
router.get('/inventario/vale-salidas', gestion, r.valeSalidasExcel);

module.exports = router;
