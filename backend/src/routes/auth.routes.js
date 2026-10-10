const express = require('express');
const router = express.Router();

const { iniciarSesion, obtenerPerfil } = require('../controllers/authController');
const { verificarToken } = require('../middleware/auth');

router.post('/login', iniciarSesion);
router.get('/perfil', verificarToken, obtenerPerfil);

module.exports = router;