const express = require('express');
const router = express.Router();

const c = require('../controllers/turnosController');
const { verificarToken } = require('../middleware/auth');
const { ambosRoles, todosLosRoles } = require('../middleware/roles');

router.use(verificarToken);

router.get('/actual', todosLosRoles, c.actual);
router.get('/', todosLosRoles, c.historial);
router.post('/', ambosRoles, c.abrir);
router.put('/:id', ambosRoles, c.editar);
router.post('/:id/cerrar', ambosRoles, c.cerrar);

module.exports = router;
