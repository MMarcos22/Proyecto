const express = require('express');
const router = express.Router();

const c = require('../controllers/turnosController');
const { verificarToken } = require('../middleware/auth');
const { atiendenServicios, todosLosRoles } = require('../middleware/roles');

router.use(verificarToken);

router.get('/actual', todosLosRoles, c.actual);
router.get('/', todosLosRoles, c.historial);
router.post('/', atiendenServicios, c.abrir);
router.put('/:id', atiendenServicios, c.editar);
router.post('/:id/cerrar', atiendenServicios, c.cerrar);

module.exports = router;
