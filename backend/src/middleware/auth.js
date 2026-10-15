const jwt = require('jsonwebtoken');
const { soloLecturaDireccion } = require('./roles');
require('dotenv').config();

const verificarToken = (req, res, next) => {
    const encabezado = req.headers.authorization;

    if (!encabezado || !encabezado.startsWith('Bearer ')) {
        return res.status(401).json({ mensaje: 'Token no proporcionado' });
    }

    const token = encabezado.split(' ')[1];

    try {
        const datos = jwt.verify(token, process.env.JWT_SECRET);
        req.usuario = datos;
        soloLecturaDireccion(req, res, next);
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ mensaje: 'La sesión ha expirado' });
        }
        return res.status(401).json({ mensaje: 'Token inválido' });
    }
};

module.exports = { verificarToken };