const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
require('dotenv').config();

const { pool } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Sin JWT_SECRET en el .env (p. ej. copiado de .env.example) no se podía iniciar
// sesión. Se usa una clave aleatoria mientras el servidor esté encendido; las
// sesiones se cierran al reiniciarlo. Defina JWT_SECRET para que duren.
if (!process.env.JWT_SECRET?.trim()) {
    process.env.JWT_SECRET = crypto.randomBytes(48).toString('hex');
    console.warn('Aviso: JWT_SECRET no está definido en backend/.env; se usa una clave temporal.');
}

// Orígenes permitidos: cualquier puerto de esta computadora y de la red local de la
// estación (192.168.x.x, 10.x.x.x, 172.16–31.x.x), para usar el sistema desde
// otra computadora. CORS_ORIGENES agrega otros orígenes, separados por coma.
const RED_LOCAL = /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|[a-z0-9-]+)(:\d+)?$/i;
const EXTRA = (process.env.CORS_ORIGENES || '').split(',').map(o => o.trim()).filter(Boolean);
const origenPermitido = (origen, listo) => listo(null, !origen || RED_LOCAL.test(origen) || EXTRA.includes(origen));

app.use(cors({ origin: origenPermitido, exposedHeaders: ['Content-Disposition'] }));
app.use(express.json({ limit: '1mb' }));

app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/emergencias', require('./routes/emergencias.routes'));
app.use('/api/inventario', require('./routes/inventario.routes'));
app.use('/api/reportes', require('./routes/reportes.routes'));
app.use('/api/catalogos', require('./routes/catalogos.routes'));
app.use('/api/usuarios', require('./routes/usuarios.routes'));
app.use('/api/turnos', require('./routes/turnos.routes'));
app.use('/api/informes', require('./routes/informes.routes'));

app.get('/api/salud', async (req, res) => {
    try {
        const resultado = await pool.query('SELECT NOW() AS hora');
        res.json({ estado: 'activo', baseDeDatos: 'conectada', hora: resultado.rows[0].hora });
    } catch (error) {
        res.status(500).json({ estado: 'error', mensaje: 'No se pudo conectar con la base de datos' });
    }
});

app.use((req, res) => {
    res.status(404).json({ mensaje: 'Recurso no encontrado' });
});

app.use((error, req, res, next) => {
    if (error.type === 'entity.parse.failed') return res.status(400).json({ mensaje: 'Solicitud con formato inválido' });
    console.error(error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
});

app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en el puerto ${PORT}`);
});
