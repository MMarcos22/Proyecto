const express = require('express');
const router = express.Router();

const {
    obtenerEstadisticas, reporteIntegrado,
    inventarioExcel, inventarioControlMensual, valeSalidasExcel
} = require('../controllers/reportesController');

const { verificarToken } = require('../middleware/auth');
const { ambosRoles } = require('../middleware/roles');

router.use(verificarToken);

router.get('/estadisticas', ambosRoles, obtenerEstadisticas);
router.get('/integrado', ambosRoles, reporteIntegrado);
router.get('/inventario/excel', ambosRoles, inventarioExcel);
router.get('/inventario/control', ambosRoles, inventarioControlMensual);
router.get('/inventario/vale-salidas', ambosRoles, valeSalidasExcel);

module.exports = router;