const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { pool } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Orígenes permitidos separados por coma; por defecto cualquier puerto de localhost (Vite puede usar 5173, 5174...)
const ORIGENES = process.env.CORS_ORIGENES
    ? process.env.CORS_ORIGENES.split(',').map(o => o.trim())
    : /^http:\/\/(localhost|127\.0\.0\.1):\d+$/;

app.use(cors({ origin: ORIGENES, exposedHeaders: ['Content-Disposition'] }));
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
