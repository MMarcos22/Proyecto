const express = require('express');
const router = express.Router();

const c = require('../controllers/inventarioController');
const { verificarToken } = require('../middleware/auth');
const d = require('../controllers/documentosController');
const { soloAdministrador, todosLosRoles, consultaInstitucional } = require('../middleware/roles');

// Consultar existencias: todos (la cabina las ve al registrar insumos usados).
// Documentos y cierres: operativo, administración y dirección los consultan.
// Mover bodega: solo administración (la encargada, en horario de oficina).
router.use(verificarToken, todosLosRoles);

router.get('/', c.listarInsumos);
router.get('/documentos', consultaInstitucional, d.listar);
router.get('/documentos/:id', consultaInstitucional, d.obtener);
router.post('/documentos', soloAdministrador, d.registrar);
router.get('/cierres', consultaInstitucional, d.cierres);
router.post('/cierres', soloAdministrador, d.cerrarMes);
router.get('/alertas/detalle', c.alertasDetalladas);
router.get('/lotes', c.listarLotes);
router.get('/movimientos', c.listarMovimientos);
router.get('/kardex/:id', c.kardex);
router.post('/entrada', soloAdministrador, c.registrarEntrada);
router.post('/salida', soloAdministrador, c.registrarSalida);
router.delete('/movimientos/:id', soloAdministrador, c.eliminarMovimiento);
router.post('/insumos', soloAdministrador, c.crearInsumo);
router.put('/insumos/:id', soloAdministrador, c.editarInsumo);
router.delete('/insumos/:id', soloAdministrador, c.eliminarInsumo);

module.exports = router;
