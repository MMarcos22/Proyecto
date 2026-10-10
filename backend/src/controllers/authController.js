const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
require('dotenv').config();

const iniciarSesion = async (req, res) => {
    const { usuario, password } = req.body;

    if (!usuario || !password) {
        return res.status(400).json({ mensaje: 'Debe ingresar usuario y contraseña' });
    }

    try {
        const resultado = await query(
            'SELECT id, usuario, password_hash, nombre_completo, rol, activo FROM usuarios WHERE usuario = $1',
            [usuario]
        );

        if (resultado.rows.length === 0) {
            return res.status(401).json({ mensaje: 'Usuario o contraseña incorrectos' });
        }

        const registro = resultado.rows[0];

        if (!registro.activo) {
            return res.status(403).json({ mensaje: 'El usuario se encuentra inactivo' });
        }

        const coincide = await bcrypt.compare(password, registro.password_hash);

        if (!coincide) {
            return res.status(401).json({ mensaje: 'Usuario o contraseña incorrectos' });
        }

        const token = jwt.sign(
            {
                id: registro.id,
                usuario: registro.usuario,
                nombre: registro.nombre_completo,
                rol: registro.rol
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES }
        );

        res.json({
            token,
            usuario: {
                id: registro.id,
                usuario: registro.usuario,
                nombre: registro.nombre_completo,
                rol: registro.rol
            }
        });

    } catch (error) {
        console.error('Error al iniciar sesión:', error);
        res.status(500).json({ mensaje: 'Error al procesar la solicitud' });
    }
};

const obtenerPerfil = async (req, res) => {
    try {
        const resultado = await query(
            'SELECT id, usuario, nombre_completo, rol FROM usuarios WHERE id = $1',
            [req.usuario.id]
        );

        if (resultado.rows.length === 0) {
            return res.status(404).json({ mensaje: 'Usuario no encontrado' });
        }

        res.json(resultado.rows[0]);

    } catch (error) {
        console.error('Error al obtener perfil:', error);
        res.status(500).json({ mensaje: 'Error al procesar la solicitud' });
    }
};

module.exports = { iniciarSesion, obtenerPerfil };