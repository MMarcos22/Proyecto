// Reglas de inventario por lote. Todas las funciones reciben un cliente
// dentro de una transacción abierta; quien llama hace COMMIT o ROLLBACK.
const { MOTIVOS } = require('../config/dominio');
const { hoyGuatemala, FECHA_ISO, registrarBitacora } = require('../utils/comun');

class ErrorNegocio extends Error {
    constructor(mensaje, estado = 400) {
        super(mensaje);
        this.estado = estado;
    }
}

const validarCantidad = (cantidad) => {
    const n = Number(cantidad);
    if (!Number.isInteger(n) || n <= 0) {
        throw new ErrorNegocio('La cantidad debe ser un número entero mayor que cero');
    }
    return n;
};

const validarFecha = (f) => {
    if (!f) return null;
    if (!FECHA_ISO.test(f)) throw new ErrorNegocio('Fecha con formato inválido');
    if (f > hoyGuatemala()) throw new ErrorNegocio('La fecha del movimiento no puede ser futura');
    return f;
};

const bloquearInsumo = async (db, insumoId) => {
    const r = await db.query(
        `SELECT id, nombre, categoria, clase, unidad_medida, stock_actual, stock_minimo, activo
     FROM insumos WHERE id = $1 FOR UPDATE`, [insumoId]);
    if (!r.rows.length || !r.rows[0].activo) throw new ErrorNegocio('El insumo no existe', 404);
    return r.rows[0];
};

const ajustarStock = async (db, insumoId, delta) => {
    const r = await db.query(
        `UPDATE insumos SET stock_actual = stock_actual + $1 WHERE id = $2
     RETURNING id, nombre, unidad_medida, stock_actual, stock_minimo`, [delta, insumoId]);
    return r.rows[0];
};

const alertaDe = (insumo) => {
    if (insumo.stock_actual === 0) return `${insumo.nombre} quedó agotado`;
    if (insumo.stock_actual <= insumo.stock_minimo) return `${insumo.nombre} quedó por debajo del mínimo`;
    return null;
};

// ── ENTRADA: siempre crea un lote ─────────────────────────────
const registrarEntrada = async (db, datos, usuarioId) => {
    const cantidad = validarCantidad(datos.cantidad);
    const motivo = datos.motivo || 'compra';
    if (!MOTIVOS.entrada[motivo]) throw new ErrorNegocio('Motivo de entrada no válido');

    const fecha = validarFecha(datos.fecha_movimiento) || hoyGuatemala();
    const numeroLote = datos.numero_lote?.trim() || null;
    const vencimiento = datos.fecha_vencimiento || null;
    if (vencimiento && !FECHA_ISO.test(vencimiento)) throw new ErrorNegocio('Fecha de vencimiento inválida');
    // Se permite registrar lotes ya vencidos solo como inventario inicial (para darlos de baja)
    if (vencimiento && vencimiento < fecha && motivo !== 'inventario_inicial') {
        throw new ErrorNegocio('El lote ya está vencido a la fecha de ingreso');
    }

    const insumo = await bloquearInsumo(db, datos.insumo_id);
    // RN-07: un consumible con vencimiento no entra sin lote y fecha (salvo el conteo inicial)
    if (insumo.clase === 'consumible_vence' && motivo !== 'inventario_inicial' && motivo !== 'ajuste' && (!numeroLote || !vencimiento)) {
        throw new ErrorNegocio(`${insumo.nombre} vence: indique el número de lote y la fecha de vencimiento`);
    }

    if (numeroLote) {
        const dup = await db.query(
            'SELECT id FROM lotes WHERE insumo_id = $1 AND LOWER(numero_lote) = LOWER($2)',
            [datos.insumo_id, numeroLote]);
        if (dup.rows.length) throw new ErrorNegocio('Ese número de lote ya está registrado para el insumo', 409);
    }

    const lote = await db.query(
        `INSERT INTO lotes (insumo_id, numero_lote, fecha_vencimiento, cantidad_inicial, saldo, fecha_ingreso)
     VALUES ($1, $2, $3, $4, $4, $5) RETURNING id`,
        [datos.insumo_id, numeroLote, vencimiento, cantidad, fecha]);

    const mov = await db.query(
        `INSERT INTO movimientos_inventario
       (insumo_id, lote_id, tipo_movimiento, motivo, cantidad, numero_lote, fecha_vencimiento,
        fecha_movimiento, documento, observaciones, usuario_id, documento_id)
     VALUES ($1, $2, 'entrada', $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
        [datos.insumo_id, lote.rows[0].id, motivo, cantidad, numeroLote, vencimiento, fecha,
            datos.documento?.trim() || null, datos.observaciones?.trim() || null, usuarioId, datos.documento_id || null]);

    const actualizado = await ajustarStock(db, datos.insumo_id, cantidad);
    return { movimiento_id: mov.rows[0].id, lote_id: lote.rows[0].id, insumo: actualizado };
};

// ── SALIDA: descuenta del lote indicado o por FEFO ────────────
const registrarSalida = async (db, datos, usuarioId) => {
    const cantidad = validarCantidad(datos.cantidad);
    const motivo = datos.motivo || 'consumo_servicio';
    if (!MOTIVOS.salida[motivo]) throw new ErrorNegocio('Motivo de salida no válido');

    const emergenciaId = datos.emergencia_id || null;
    if (motivo === 'consumo_servicio' && !emergenciaId) {
        throw new ErrorNegocio('El consumo en servicio debe vincularse a una boleta de emergencia');
    }
    if (emergenciaId) {
        const e = await db.query('SELECT estado FROM emergencias WHERE id = $1', [emergenciaId]);
        if (!e.rows.length) throw new ErrorNegocio('La boleta indicada no existe', 404);
        if (e.rows[0].estado === 'anulada') throw new ErrorNegocio('La boleta indicada está anulada');
    }

    const fecha = validarFecha(datos.fecha_movimiento) || hoyGuatemala();
    const insumo = await bloquearInsumo(db, datos.insumo_id);

    if (insumo.stock_actual < cantidad) {
        throw new ErrorNegocio(
            `Existencia insuficiente de ${insumo.nombre}. Disponible: ${insumo.stock_actual}`);
    }

    // Lotes candidatos: el indicado, o todos con saldo ordenados por vencimiento (FEFO).
    // Solo cuentan los lotes que ya habían ingresado en la fecha de la salida.
    const lotes = datos.lote_id
        ? await db.query(
            `SELECT id, numero_lote, fecha_vencimiento, fecha_ingreso, saldo FROM lotes
       WHERE id = $1 AND insumo_id = $2 FOR UPDATE`, [datos.lote_id, datos.insumo_id])
        : await db.query(
            `SELECT id, numero_lote, fecha_vencimiento, fecha_ingreso, saldo FROM lotes
       WHERE insumo_id = $1 AND saldo > 0 AND fecha_ingreso <= $2
       ORDER BY fecha_vencimiento NULLS LAST, fecha_ingreso, id FOR UPDATE`, [datos.insumo_id, fecha]);

    if (datos.lote_id) {
        if (!lotes.rows.length || lotes.rows[0].saldo < cantidad) {
            throw new ErrorNegocio('El lote seleccionado no tiene saldo suficiente');
        }
        if (lotes.rows[0].fecha_ingreso > fecha) {
            throw new ErrorNegocio('El lote seleccionado ingresó después de la fecha de esta salida');
        }
    }

    // Las bajas por vencimiento se aceptan sobre lotes vencidos; el consumo no
    const usarVencidos = motivo === 'baja_vencimiento' || motivo === 'ajuste';
    let pendiente = cantidad;
    const movimientos = [];

    for (const lote of lotes.rows) {
        if (pendiente === 0) break;
        if (!usarVencidos && lote.fecha_vencimiento && lote.fecha_vencimiento < fecha) {
            if (datos.lote_id) throw new ErrorNegocio('El lote seleccionado está vencido; regístrelo como baja por vencimiento');
            continue;
        }
        const toma = Math.min(pendiente, lote.saldo);
        await db.query('UPDATE lotes SET saldo = saldo - $1 WHERE id = $2', [toma, lote.id]);
        const mov = await db.query(
            `INSERT INTO movimientos_inventario
         (insumo_id, lote_id, tipo_movimiento, motivo, cantidad, numero_lote, fecha_vencimiento,
          emergencia_id, fecha_movimiento, observaciones, usuario_id, documento_id)
       VALUES ($1, $2, 'salida', $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
            [datos.insumo_id, lote.id, motivo, toma, lote.numero_lote, lote.fecha_vencimiento,
                emergenciaId, fecha, datos.observaciones?.trim() || null, usuarioId, datos.documento_id || null]);
        movimientos.push({ id: mov.rows[0].id, lote_id: lote.id, numero_lote: lote.numero_lote, cantidad: toma });
        pendiente -= toma;
    }

    if (pendiente > 0) {
        throw new ErrorNegocio(
            `Al ${fecha} solo había ${cantidad - pendiente} ${insumo.unidad_medida || 'unidades'} de ${insumo.nombre} ` +
            'en lotes vigentes; el resto estaba vencido o ingresó después de esa fecha');
    }

    const actualizado = await ajustarStock(db, datos.insumo_id, -cantidad);
    return { movimientos, insumo: actualizado, alerta: alertaDe(actualizado) };
};

// ── ANULAR: revierte un movimiento y deja rastro en la bitácora ─
const anularMovimiento = async (db, id, usuarioId, motivo) => {
    const r = await db.query('SELECT * FROM movimientos_inventario WHERE id = $1 FOR UPDATE', [id]);
    if (!r.rows.length) throw new ErrorNegocio('El movimiento no existe', 404);
    const mov = r.rows[0];

    await bloquearInsumo(db, mov.insumo_id);

    if (mov.tipo_movimiento === 'entrada') {
        const lote = await db.query('SELECT saldo, cantidad_inicial FROM lotes WHERE id = $1 FOR UPDATE', [mov.lote_id]);
        if (lote.rows.length && lote.rows[0].saldo < lote.rows[0].cantidad_inicial) {
            throw new ErrorNegocio('El lote ya tiene salidas registradas; anule primero esas salidas');
        }
        await db.query('DELETE FROM movimientos_inventario WHERE id = $1', [id]);
        if (mov.lote_id) await db.query('DELETE FROM lotes WHERE id = $1', [mov.lote_id]);
        await ajustarStock(db, mov.insumo_id, -mov.cantidad);
    } else {
        if (mov.lote_id) await db.query('UPDATE lotes SET saldo = saldo + $1 WHERE id = $2', [mov.cantidad, mov.lote_id]);
        await db.query('DELETE FROM movimientos_inventario WHERE id = $1', [id]);
        await ajustarStock(db, mov.insumo_id, mov.cantidad);
    }

    await registrarBitacora(db, usuarioId, 'anular', 'movimiento', id, {
        tipo: mov.tipo_movimiento, motivo_movimiento: mov.motivo, insumo_id: mov.insumo_id,
        cantidad: mov.cantidad, lote_id: mov.lote_id, emergencia_id: mov.emergencia_id,
        fecha: mov.fecha_movimiento, motivo_anulacion: motivo || null
    });
    return mov;
};

module.exports = { ErrorNegocio, registrarEntrada, registrarSalida, anularMovimiento };
