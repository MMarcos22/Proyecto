const express = require('express');
const router = express.Router();

const c = require('../controllers/emergenciasController');
const { verificarToken } = require('../middleware/auth');
const { soloAdministrador, atiendenServicios, registranLlamadas, ambosRoles, todosLosRoles, gestion } = require('../middleware/roles');

router.use(verificarToken);

router.get('/', todosLosRoles, c.listar);
router.get('/vinculo', todosLosRoles, c.listarParaVinculo);
router.get('/en-curso', todosLosRoles, c.enCurso);
router.get('/por-completar', todosLosRoles, c.porCompletar);
router.get('/contadores', todosLosRoles, c.contadores);
router.get('/revision', gestion, c.revision);
router.get('/llamante', todosLosRoles, c.llamante);
router.post('/impresas', ambosRoles, c.marcarImpresa);
router.post('/firmar', soloAdministrador, c.firmar);
router.get('/:id', todosLosRoles, c.obtenerPorId);
router.post('/', registranLlamadas, c.registrar);
// La administración ve las boletas por completar, pero las completa la tripulación
router.put('/:id', atiendenServicios, c.guardar);
router.post('/:id/regreso', atiendenServicios, c.registrarRegreso);
router.post('/:id/pin', atiendenServicios, c.verificarPin);
// Cabina solo puede cancelar servicios en curso (sin número); el controlador lo verifica
router.post('/:id/anular', ambosRoles, c.anular);
router.post('/:id/certificaciones', soloAdministrador, c.certificar);
router.post('/:id/insumos', atiendenServicios, c.agregarInsumo);
router.delete('/:id/insumos/:movId', atiendenServicios, c.quitarInsumo);

module.exports = router;
