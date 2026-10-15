const express = require('express');
const router = express.Router();

const c = require('../controllers/usuariosController');
const { verificarToken } = require('../middleware/auth');
const { soloAdministrador, todosLosRoles, gestion } = require('../middleware/roles');

router.use(verificarToken);

router.put('/mi-clave', todosLosRoles, c.cambiarClave);
router.get('/bitacora', gestion, c.bitacora);
router.get('/', soloAdministrador, c.listar);
router.post('/', soloAdministrador, c.crear);
router.put('/:id', soloAdministrador, c.editar);

module.exports = router;
