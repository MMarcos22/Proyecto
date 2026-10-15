const express = require('express');
const router = express.Router();

const c = require('../controllers/emergenciasController');
const { verificarToken } = require('../middleware/auth');
const { soloAdministrador, ambosRoles, todosLosRoles, gestion } = require('../middleware/roles');

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
router.post('/', ambosRoles, c.registrar);
router.put('/:id', ambosRoles, c.guardar);
router.post('/:id/regreso', ambosRoles, c.registrarRegreso);
router.post('/:id/pin', ambosRoles, c.verificarPin);
// Cabina solo puede cancelar servicios en curso (sin número); el controlador lo verifica
router.post('/:id/anular', ambosRoles, c.anular);
router.post('/:id/certificaciones', soloAdministrador, c.certificar);
router.post('/:id/insumos', ambosRoles, c.agregarInsumo);
router.delete('/:id/insumos/:movId', ambosRoles, c.quitarInsumo);

module.exports = router;
