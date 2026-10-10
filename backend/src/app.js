const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { pool } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/emergencias', require('./routes/emergencias.routes'));
app.use('/api/inventario', require('./routes/inventario.routes'));
app.use('/api/reportes', require('./routes/reportes.routes'));
app.use('/api/analisis', require('./routes/analisis.routes'));

app.get('/api/salud', async (req, res) => {
    try {
        const resultado = await pool.query('SELECT NOW() AS hora');
        res.json({
            estado: 'activo',
            baseDeDatos: 'conectada',
            hora: resultado.rows[0].hora
        });
    } catch (error) {
        res.status(500).json({
            estado: 'error',
            mensaje: 'No se pudo conectar con la base de datos'
        });
    }
});

app.use((req, res) => {
    res.status(404).json({ mensaje: 'Recurso no encontrado' });
});

app.use((error, req, res, next) => {
    console.error(error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
});

app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en el puerto ${PORT}`);
});