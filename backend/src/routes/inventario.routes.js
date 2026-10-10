const express = require('express');
const router = express.Router();

const {
    listarInsumos, obtenerAlertas, alertasDetalladas,
    registrarEntrada, registrarSalida, listarMovimientos,
    crearInsumo, editarInsumo, eliminarInsumo,
    movimientosDeInsumo, editarMovimiento, eliminarMovimiento
} = require('../controllers/inventarioController');

const { verificarToken } = require('../middleware/auth');
const { soloOperativo, ambosRoles } = require('../middleware/roles');

router.use(verificarToken);

router.get('/', ambosRoles, listarInsumos);
router.get('/alertas', ambosRoles, obtenerAlertas);
router.get('/alertas/detalle', ambosRoles, alertasDetalladas);
router.get('/movimientos', ambosRoles, listarMovimientos);
router.get('/movimientos/insumo/:id', ambosRoles, movimientosDeInsumo);
router.post('/entrada', soloOperativo, registrarEntrada);
router.post('/salida', soloOperativo, registrarSalida);
router.put('/movimientos/:id', soloOperativo, editarMovimiento);
router.delete('/movimientos/:id', soloOperativo, eliminarMovimiento);
router.post('/insumos', soloOperativo, crearInsumo);
router.put('/insumos/:id', soloOperativo, editarInsumo);
router.delete('/insumos/:id', soloOperativo, eliminarInsumo);

module.exports = router;