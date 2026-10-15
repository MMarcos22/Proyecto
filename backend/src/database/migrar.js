// Ejecuta en orden las migraciones pendientes de src/database/migraciones
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');

const CARPETA = path.join(__dirname, 'migraciones');

const migrar = async () => {
    const cliente = await pool.connect();
    try {
        await cliente.query(`
      CREATE TABLE IF NOT EXISTS schema_migraciones (
        nombre      VARCHAR(120) PRIMARY KEY,
        aplicada_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`);

        const aplicadas = new Set(
            (await cliente.query('SELECT nombre FROM schema_migraciones')).rows.map(r => r.nombre)
        );

        const archivos = fs.readdirSync(CARPETA).filter(f => f.endsWith('.sql')).sort();
        let total = 0;

        for (const archivo of archivos) {
            if (aplicadas.has(archivo)) continue;
            const sql = fs.readFileSync(path.join(CARPETA, archivo), 'utf8');
            try {
                await cliente.query('BEGIN');
                await cliente.query(sql);
                await cliente.query('INSERT INTO schema_migraciones (nombre) VALUES ($1)', [archivo]);
                await cliente.query('COMMIT');
                console.log(`  ✓ ${archivo}`);
                total++;
            } catch (error) {
                await cliente.query('ROLLBACK');
                console.error(`  ✗ ${archivo}: ${error.message}`);
                process.exitCode = 1;
                return;
            }
        }

        console.log(total ? `${total} migración(es) aplicada(s)` : 'La base de datos está al día');
    } finally {
        cliente.release();
        await pool.end();
    }
};

migrar();
