const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
require('dotenv').config();

// Bloqueo temporal tras intentos fallidos (por IP + usuario)
const INTENTOS_MAX = 5;
const BLOQUEO_MS = 15 * 60 * 1000;
const fallidos = new Map();

const claveIntento = (req, usuario) => `${req.ip}|${(usuario || '').toLowerCase()}`;

const minutosBloqueo = (clave) => {
    const f = fallidos.get(clave);
    if (!f) return 0;
    if (Date.now() - f.desde > BLOQUEO_MS) {
        fallidos.delete(clave);
        return 0;
    }
    return f.n >= INTENTOS_MAX ? Math.ceil((BLOQUEO_MS - (Date.now() - f.desde)) / 60000) : 0;
};

const anotarFallo = (clave) => {
    const f = fallidos.get(clave) || { n: 0, desde: Date.now() };
    f.n++;
    fallidos.set(clave, f);
};

const iniciarSesion = async (req, res) => {
    const { usuario, password } = req.body;

    if (!usuario || !password) {
        return res.status(400).json({ mensaje: 'Debe ingresar usuario y contraseña' });
    }

    const clave = claveIntento(req, usuario);
    const minutos = minutosBloqueo(clave);
    if (minutos) {
        return res.status(429).json({ mensaje: `Demasiados intentos fallidos. Intente de nuevo en ${minutos} min` });
    }

    try {
        const resultado = await query(
            'SELECT id, usuario, password_hash, nombre_completo, rol, activo FROM usuarios WHERE usuario = LOWER($1)',
            [usuario.trim()]
        );

        const registro = resultado.rows[0];
        const coincide = registro ? await bcrypt.compare(password, registro.password_hash) : false;

        if (!coincide) {
            anotarFallo(clave);
            return res.status(401).json({ mensaje: 'Usuario o contraseña incorrectos' });
        }

        if (!registro.activo) {
            return res.status(403).json({ mensaje: 'El usuario se encuentra inactivo' });
        }

        fallidos.delete(clave);

        const datos = {
            id: registro.id,
            usuario: registro.usuario,
            nombre: registro.nombre_completo,
            rol: registro.rol
        };

        const token = jwt.sign(datos, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES || '8h' });
        res.json({ token, usuario: datos });

    } catch (error) {
        console.error('Error al iniciar sesión:', error);
        res.status(500).json({ mensaje: 'Error al procesar la solicitud' });
    }
};

const obtenerPerfil = async (req, res) => {
    try {
        const resultado = await query(
            'SELECT id, usuario, nombre_completo, rol, activo FROM usuarios WHERE id = $1',
            [req.usuario.id]
        );

        if (!resultado.rows.length || !resultado.rows[0].activo) {
            return res.status(401).json({ mensaje: 'La sesión ya no es válida' });
        }

        res.json(resultado.rows[0]);

    } catch (error) {
        console.error('Error al obtener perfil:', error);
        res.status(500).json({ mensaje: 'Error al procesar la solicitud' });
    }
};

module.exports = { iniciarSesion, obtenerPerfil };
