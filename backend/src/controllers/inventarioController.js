const { query, getClient } = require('../config/database');

// ── LISTAR EXISTENCIAS ───────────────────────────
const listarInsumos = async (req, res) => {
    const { categoria, estado } = req.query;

    const condiciones = ['activo = TRUE'];
    const valores = [];

    if (categoria) {
        valores.push(categoria);
        condiciones.push(`categoria = $${valores.length}`);
    }

    try {
        const resultado = await query(`
      SELECT id, nombre, categoria, unidad_medida, stock_actual, stock_minimo,
        CASE
          WHEN stock_actual = 0                THEN 'agotado'
          WHEN stock_actual <= stock_minimo    THEN 'bajo'
          ELSE 'normal'
        END AS estado
      FROM insumos
      WHERE ${condiciones.join(' AND ')}
      ORDER BY categoria, nombre`, valores);

        let insumos = resultado.rows;
        if (estado) insumos = insumos.filter(i => i.estado === estado);

        res.json({ total: insumos.length, insumos });

    } catch (error) {
        console.error('Error al listar insumos:', error);
        res.status(500).json({ mensaje: 'Error al consultar las existencias' });
    }
};

// ── ALERTAS RESUMIDAS ────────────────────────────
const obtenerAlertas = async (req, res) => {
    try {
        const bajos = await query(`
      SELECT id, nombre, categoria, stock_actual, stock_minimo,
        CASE WHEN stock_actual = 0 THEN 'agotado' ELSE 'bajo' END AS estado
      FROM insumos
      WHERE activo = TRUE AND stock_actual <= stock_minimo
      ORDER BY stock_actual, nombre`);

        const vencer = await query(`
      SELECT DISTINCT i.id, i.nombre, m.numero_lote, m.fecha_vencimiento,
             (m.fecha_vencimiento - CURRENT_DATE) AS dias_restantes
      FROM movimientos_inventario m
      JOIN insumos i ON i.id = m.insumo_id
      WHERE m.tipo_movimiento = 'entrada'
        AND m.fecha_vencimiento IS NOT NULL
        AND m.fecha_vencimiento <= CURRENT_DATE + INTERVAL '60 days'
      ORDER BY m.fecha_vencimiento`);

        res.json({
            existencia_critica: bajos.rows,
            proximos_a_vencer: vencer.rows
        });

    } catch (error) {
        console.error('Error al obtener alertas:', error);
        res.status(500).json({ mensaje: 'Error al consultar las alertas' });
    }
};

// ── DETALLE DE ALERTAS PARA CAMPANA ──────────────
const alertasDetalladas = async (req, res) => {
    try {
        const criticos = await query(`
      SELECT id, nombre, categoria, unidad_medida, stock_actual, stock_minimo,
        CASE WHEN stock_actual = 0 THEN 'agotado' ELSE 'bajo' END AS estado
      FROM insumos
      WHERE activo = TRUE AND stock_actual <= stock_minimo
      ORDER BY stock_actual ASC, nombre`);

        const vencimientos = await query(`
      SELECT i.id, i.nombre, i.categoria, i.unidad_medida,
             m.numero_lote, m.fecha_vencimiento, m.cantidad,
             (m.fecha_vencimiento - CURRENT_DATE)::int AS dias_restantes,
        CASE
          WHEN m.fecha_vencimiento < CURRENT_DATE THEN 'vencido'
          WHEN m.fecha_vencimiento <= CURRENT_DATE + 30 THEN 'critico'
          ELSE 'proximo'
        END AS urgencia
      FROM movimientos_inventario m
      JOIN insumos i ON i.id = m.insumo_id
      WHERE m.tipo_movimiento = 'entrada'
        AND m.fecha_vencimiento IS NOT NULL
        AND m.fecha_vencimiento <= CURRENT_DATE + 90
      ORDER BY m.fecha_vencimiento ASC`);

        const agotados = criticos.rows.filter(i => i.estado === 'agotado');
        const bajos = criticos.rows.filter(i => i.estado === 'bajo');
        const vencidos = vencimientos.rows.filter(v => v.urgencia === 'vencido');
        const porVencer = vencimientos.rows.filter(v => v.urgencia !== 'vencido');

        res.json({
            resumen: {
                agotados: agotados.length,
                bajos: bajos.length,
                vencidos: vencidos.length,
                por_vencer: porVencer.length,
                total: agotados.length + bajos.length + vencidos.length + porVencer.length
            },
            insumos_agotados: agotados,
            existencia_baja: bajos,
            lotes_vencidos: vencidos,
            lotes_por_vencer: porVencer
        });

    } catch (error) {
        console.error('Error al obtener alertas detalladas:', error);
        res.status(500).json({ mensaje: 'Error al consultar las alertas' });
    }
};

// ── REGISTRAR ENTRADA ────────────────────────────
const registrarEntrada = async (req, res) => {
    const { insumo_id, cantidad, numero_lote, fecha_vencimiento,
        fecha_movimiento, observaciones } = req.body;

    if (!insumo_id || !cantidad || cantidad <= 0) {
        return res.status(400).json({ mensaje: 'Debe indicar el insumo y una cantidad válida' });
    }

    if (fecha_vencimiento) {
        const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
        const venc = new Date(fecha_vencimiento + 'T00:00:00');
        if (venc < hoy) {
            return res.status(400).json({
                mensaje: 'La fecha de vencimiento no puede ser anterior a la fecha actual'
            });
        }
    }

    const cliente = await getClient();

    try {
        await cliente.query('BEGIN');

        if (numero_lote) {
            const lote = await cliente.query(
                `SELECT id FROM movimientos_inventario
         WHERE insumo_id = $1 AND numero_lote = $2 AND tipo_movimiento = 'entrada'`,
                [insumo_id, numero_lote]
            );
            if (lote.rows.length > 0) {
                await cliente.query('ROLLBACK');
                return res.status(409).json({
                    mensaje: 'El número de lote ya fue registrado para este insumo'
                });
            }
        }

        await cliente.query(`
      INSERT INTO movimientos_inventario
        (insumo_id, tipo_movimiento, cantidad, numero_lote, fecha_vencimiento,
         fecha_movimiento, observaciones, usuario_id)
      VALUES ($1, 'entrada', $2, $3, $4, COALESCE($5, CURRENT_DATE), $6, $7)`,
            [insumo_id, cantidad, numero_lote || null, fecha_vencimiento || null,
                fecha_movimiento || null, observaciones || null, req.usuario.id]);

        const actualizado = await cliente.query(
            `UPDATE insumos SET stock_actual = stock_actual + $1
       WHERE id = $2 RETURNING nombre, stock_actual`,
            [cantidad, insumo_id]
        );

        await cliente.query('COMMIT');

        res.status(201).json({
            mensaje: 'Entrada registrada correctamente',
            insumo: actualizado.rows[0]
        });

    } catch (error) {
        await cliente.query('ROLLBACK');
        console.error('Error al registrar entrada:', error);
        res.status(500).json({ mensaje: 'Error al registrar la entrada' });
    } finally {
        cliente.release();
    }
};

// ── REGISTRAR SALIDA ─────────────────────────────
const registrarSalida = async (req, res) => {
    const { insumo_id, cantidad, emergencia_id,
        fecha_movimiento, observaciones } = req.body;

    if (!insumo_id || !cantidad || cantidad <= 0) {
        return res.status(400).json({ mensaje: 'Debe indicar el insumo y una cantidad válida' });
    }
    if (!emergencia_id) {
        return res.status(400).json({
            mensaje: 'Debe vincular la salida al servicio de emergencia correspondiente'
        });
    }

    const cliente = await getClient();

    try {
        await cliente.query('BEGIN');

        const insumo = await cliente.query(
            'SELECT nombre, stock_actual, stock_minimo FROM insumos WHERE id = $1 FOR UPDATE',
            [insumo_id]
        );

        if (insumo.rows.length === 0) {
            await cliente.query('ROLLBACK');
            return res.status(404).json({ mensaje: 'El insumo no existe' });
        }

        if (insumo.rows[0].stock_actual < cantidad) {
            await cliente.query('ROLLBACK');
            return res.status(400).json({
                mensaje: `Existencia insuficiente. Disponible: ${insumo.rows[0].stock_actual}`
            });
        }

        await cliente.query(`
      INSERT INTO movimientos_inventario
        (insumo_id, tipo_movimiento, cantidad, emergencia_id,
         fecha_movimiento, observaciones, usuario_id)
      VALUES ($1, 'salida', $2, $3, COALESCE($4, CURRENT_DATE), $5, $6)`,
            [insumo_id, cantidad, emergencia_id, fecha_movimiento || null,
                observaciones || null, req.usuario.id]);

        const actualizado = await cliente.query(
            `UPDATE insumos SET stock_actual = stock_actual - $1
       WHERE id = $2 RETURNING nombre, stock_actual, stock_minimo`,
            [cantidad, insumo_id]
        );

        await cliente.query('COMMIT');

        const resultado = actualizado.rows[0];
        let alerta = null;
        if (resultado.stock_actual === 0) {
            alerta = `El insumo ${resultado.nombre} ha quedado agotado`;
        } else if (resultado.stock_actual <= resultado.stock_minimo) {
            alerta = `El insumo ${resultado.nombre} se encuentra por debajo del mínimo`;
        }

        res.status(201).json({
            mensaje: 'Salida registrada correctamente',
            insumo: resultado,
            alerta
        });

    } catch (error) {
        await cliente.query('ROLLBACK');
        console.error('Error al registrar salida:', error);
        res.status(500).json({ mensaje: 'Error al registrar la salida' });
    } finally {
        cliente.release();
    }
};

// ── HISTORIAL DE MOVIMIENTOS ─────────────────────
const listarMovimientos = async (req, res) => {
    const { tipo, categoria, mes, anio, insumo_id } = req.query;

    const condiciones = [];
    const valores = [];

    if (tipo) { valores.push(tipo); condiciones.push(`m.tipo_movimiento = $${valores.length}`); }
    if (categoria) { valores.push(categoria); condiciones.push(`i.categoria = $${valores.length}`); }
    if (insumo_id) { valores.push(insumo_id); condiciones.push(`m.insumo_id = $${valores.length}`); }
    if (mes) { valores.push(mes); condiciones.push(`EXTRACT(MONTH FROM m.fecha_movimiento) = $${valores.length}`); }
    if (anio) { valores.push(anio); condiciones.push(`EXTRACT(YEAR  FROM m.fecha_movimiento) = $${valores.length}`); }

    const where = condiciones.length ? `WHERE ${condiciones.join(' AND ')}` : '';

    try {
        const resultado = await query(`
      SELECT m.id, m.tipo_movimiento, m.cantidad, m.numero_lote, m.fecha_vencimiento,
             m.fecha_movimiento, m.observaciones,
             i.nombre AS insumo, i.categoria, i.unidad_medida,
             e.numero_control AS servicio, e.tipo_servicio,
             u.nombre_completo AS registrado_por
      FROM movimientos_inventario m
      JOIN insumos i  ON i.id = m.insumo_id
      JOIN usuarios u ON u.id = m.usuario_id
      LEFT JOIN emergencias e ON e.id = m.emergencia_id
      ${where}
      ORDER BY m.fecha_movimiento DESC, m.id DESC`, valores);

        res.json({ total: resultado.rows.length, movimientos: resultado.rows });

    } catch (error) {
        console.error('Error al listar movimientos:', error);
        res.status(500).json({ mensaje: 'Error al consultar los movimientos' });
    }
};

// ── MOVIMIENTOS DE UN INSUMO EN UN MES ───────────
const movimientosDeInsumo = async (req, res) => {
    const { id } = req.params;
    const { mes, anio, tipo } = req.query;

    const cond = ['m.insumo_id = $1'];
    const val = [id];

    if (mes) { val.push(mes); cond.push(`EXTRACT(MONTH FROM m.fecha_movimiento) = $${val.length}`); }
    if (anio) { val.push(anio); cond.push(`EXTRACT(YEAR  FROM m.fecha_movimiento) = $${val.length}`); }
    if (tipo) { val.push(tipo); cond.push(`m.tipo_movimiento = $${val.length}`); }

    try {
        const r = await query(`
      SELECT m.id, m.tipo_movimiento, m.cantidad, m.numero_lote,
             m.fecha_vencimiento, m.fecha_movimiento, m.observaciones,
             m.emergencia_id,
             e.numero_control AS servicio, e.tipo_servicio,
             u.nombre_completo AS registrado_por
      FROM movimientos_inventario m
      JOIN usuarios u ON u.id = m.usuario_id
      LEFT JOIN emergencias e ON e.id = m.emergencia_id
      WHERE ${cond.join(' AND ')}
      ORDER BY m.fecha_movimiento, m.id`, val);

        res.json({ total: r.rows.length, movimientos: r.rows });

    } catch (error) {
        console.error('Error al listar movimientos del insumo:', error);
        res.status(500).json({ mensaje: 'Error al consultar los movimientos' });
    }
};

// ── EDITAR MOVIMIENTO ────────────────────────────
const editarMovimiento = async (req, res) => {
    const { id } = req.params;
    const { cantidad, numero_lote, fecha_vencimiento,
        fecha_movimiento, emergencia_id, observaciones } = req.body;

    if (!cantidad || cantidad <= 0) {
        return res.status(400).json({ mensaje: 'Indique una cantidad válida' });
    }

    const cliente = await getClient();

    try {
        await cliente.query('BEGIN');

        const prev = await cliente.query(
            'SELECT * FROM movimientos_inventario WHERE id = $1', [id]);

        if (prev.rows.length === 0) {
            await cliente.query('ROLLBACK');
            return res.status(404).json({ mensaje: 'El movimiento no existe' });
        }

        const mov = prev.rows[0];

        if (mov.tipo_movimiento === 'salida' && !emergencia_id) {
            await cliente.query('ROLLBACK');
            return res.status(400).json({
                mensaje: 'La salida debe estar vinculada a un servicio de emergencia'
            });
        }

        if (fecha_vencimiento) {
            const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
            if (new Date(fecha_vencimiento + 'T00:00:00') < hoy) {
                await cliente.query('ROLLBACK');
                return res.status(400).json({
                    mensaje: 'La fecha de vencimiento no puede ser anterior a la fecha actual'
                });
            }
        }

        const revertir = mov.tipo_movimiento === 'entrada' ? -mov.cantidad : mov.cantidad;
        const aplicar = mov.tipo_movimiento === 'entrada' ? cantidad : -cantidad;
        const ajuste = revertir + aplicar;

        const insumo = await cliente.query(
            'SELECT nombre, stock_actual FROM insumos WHERE id = $1 FOR UPDATE',
            [mov.insumo_id]
        );

        if (insumo.rows[0].stock_actual + ajuste < 0) {
            await cliente.query('ROLLBACK');
            return res.status(400).json({
                mensaje: 'El cambio dejaría la existencia en negativo'
            });
        }

        await cliente.query(`
      UPDATE movimientos_inventario
      SET cantidad = $1, numero_lote = $2, fecha_vencimiento = $3,
          fecha_movimiento = COALESCE($4, fecha_movimiento),
          emergencia_id = $5, observaciones = $6
      WHERE id = $7`,
            [cantidad, numero_lote || null, fecha_vencimiento || null,
                fecha_movimiento || null, emergencia_id || null, observaciones || null, id]);

        const act = await cliente.query(
            `UPDATE insumos SET stock_actual = stock_actual + $1
       WHERE id = $2 RETURNING nombre, stock_actual`,
            [ajuste, mov.insumo_id]
        );

        await cliente.query('COMMIT');

        res.json({
            mensaje: 'Movimiento actualizado correctamente',
            insumo: act.rows[0]
        });

    } catch (error) {
        await cliente.query('ROLLBACK');
        console.error('Error al editar movimiento:', error);
        res.status(500).json({ mensaje: 'Error al actualizar el movimiento' });
    } finally {
        cliente.release();
    }
};

// ── ELIMINAR MOVIMIENTO ──────────────────────────
const eliminarMovimiento = async (req, res) => {
    const { id } = req.params;
    const cliente = await getClient();

    try {
        await cliente.query('BEGIN');

        const prev = await cliente.query(
            'SELECT * FROM movimientos_inventario WHERE id = $1', [id]);

        if (prev.rows.length === 0) {
            await cliente.query('ROLLBACK');
            return res.status(404).json({ mensaje: 'El movimiento no existe' });
        }

        const mov = prev.rows[0];
        const ajuste = mov.tipo_movimiento === 'entrada' ? -mov.cantidad : mov.cantidad;

        const insumo = await cliente.query(
            'SELECT stock_actual FROM insumos WHERE id = $1 FOR UPDATE',
            [mov.insumo_id]
        );

        if (insumo.rows[0].stock_actual + ajuste < 0) {
            await cliente.query('ROLLBACK');
            return res.status(400).json({
                mensaje: 'No se puede eliminar, la existencia quedaría en negativo'
            });
        }

        await cliente.query('DELETE FROM movimientos_inventario WHERE id = $1', [id]);

        const act = await cliente.query(
            `UPDATE insumos SET stock_actual = stock_actual + $1
       WHERE id = $2 RETURNING nombre, stock_actual`,
            [ajuste, mov.insumo_id]
        );

        await cliente.query('COMMIT');

        res.json({
            mensaje: 'Movimiento eliminado correctamente',
            insumo: act.rows[0]
        });

    } catch (error) {
        await cliente.query('ROLLBACK');
        console.error('Error al eliminar movimiento:', error);
        res.status(500).json({ mensaje: 'Error al eliminar el movimiento' });
    } finally {
        cliente.release();
    }
};

// ── CREAR INSUMO ─────────────────────────────────
const crearInsumo = async (req, res) => {
    const { nombre, categoria, unidad_medida, stock_minimo } = req.body;

    if (!nombre || !categoria) {
        return res.status(400).json({ mensaje: 'El nombre y la categoría son obligatorios' });
    }

    try {
        const existe = await query(
            'SELECT id FROM insumos WHERE LOWER(nombre) = LOWER($1) AND activo = TRUE',
            [nombre]
        );
        if (existe.rows.length > 0) {
            return res.status(409).json({ mensaje: 'Ya existe un insumo con ese nombre' });
        }

        const r = await query(`
      INSERT INTO insumos (nombre, categoria, unidad_medida, stock_minimo)
      VALUES ($1, $2, $3, $4)
      RETURNING id, nombre, categoria, unidad_medida, stock_actual, stock_minimo`,
            [nombre, categoria, unidad_medida || null, stock_minimo ?? 5]);

        res.status(201).json({ mensaje: 'Insumo agregado correctamente', insumo: r.rows[0] });

    } catch (error) {
        console.error('Error al crear insumo:', error);
        res.status(500).json({ mensaje: 'Error al agregar el insumo' });
    }
};

// ── EDITAR INSUMO ────────────────────────────────
const editarInsumo = async (req, res) => {
    const { id } = req.params;
    const { nombre, categoria, unidad_medida, stock_minimo } = req.body;

    if (!nombre || !categoria) {
        return res.status(400).json({ mensaje: 'El nombre y la categoría son obligatorios' });
    }

    try {
        const dup = await query(
            'SELECT id FROM insumos WHERE LOWER(nombre) = LOWER($1) AND id <> $2 AND activo = TRUE',
            [nombre, id]
        );
        if (dup.rows.length > 0) {
            return res.status(409).json({ mensaje: 'Ya existe otro insumo con ese nombre' });
        }

        const r = await query(`
      UPDATE insumos
      SET nombre = $1, categoria = $2, unidad_medida = $3, stock_minimo = $4
      WHERE id = $5
      RETURNING id, nombre, categoria, unidad_medida, stock_actual, stock_minimo`,
            [nombre, categoria, unidad_medida || null, stock_minimo ?? 5, id]);

        if (r.rows.length === 0) {
            return res.status(404).json({ mensaje: 'El insumo no existe' });
        }

        res.json({ mensaje: 'Insumo actualizado correctamente', insumo: r.rows[0] });

    } catch (error) {
        console.error('Error al editar insumo:', error);
        res.status(500).json({ mensaje: 'Error al actualizar el insumo' });
    }
};

// ── ELIMINAR INSUMO ──────────────────────────────
const eliminarInsumo = async (req, res) => {
    const { id } = req.params;

    try {
        const movs = await query(
            'SELECT COUNT(*)::int AS total FROM movimientos_inventario WHERE insumo_id = $1',
            [id]
        );

        if (movs.rows[0].total > 0) {
            await query('UPDATE insumos SET activo = FALSE WHERE id = $1', [id]);
            return res.json({
                mensaje: 'El insumo tiene movimientos registrados, se desactivó para conservar el historial'
            });
        }

        const r = await query('DELETE FROM insumos WHERE id = $1 RETURNING nombre', [id]);

        if (r.rows.length === 0) {
            return res.status(404).json({ mensaje: 'El insumo no existe' });
        }

        res.json({ mensaje: `Insumo ${r.rows[0].nombre} eliminado correctamente` });

    } catch (error) {
        console.error('Error al eliminar insumo:', error);
        res.status(500).json({ mensaje: 'Error al eliminar el insumo' });
    }
};

module.exports = {
    listarInsumos, obtenerAlertas, alertasDetalladas,
    registrarEntrada, registrarSalida, listarMovimientos,
    crearInsumo, editarInsumo, eliminarInsumo,
    movimientosDeInsumo, editarMovimiento, eliminarMovimiento
};