const { query } = require('../config/database');
const ExcelJS = require('exceljs');

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const CATEGORIAS = [
    {
        clave: 'prehospitalario', hoja: 'PREHOSPITALARIO',
        titulo: 'CONTROL DE INGRESOS Y EGRESOS DE INSUMOS DE EQUIPO PRE-HOSPITALARIO'
    },
    {
        clave: 'libreria', hoja: 'LIBRERIA',
        titulo: 'CONTROL DE INGRESOS Y EGRESOS DE INSUMOS DE OFICINA/LIBRERÍA'
    },
    {
        clave: 'limpieza', hoja: 'LIMPIEZA',
        titulo: 'CONTROL DE INGRESOS Y EGRESOS DE INSUMOS DE LIMPIEZA'
    },
    {
        clave: 'cafeteria', hoja: 'CAFETERIA',
        titulo: 'CONTROL DE INGRESOS Y EGRESOS DE INSUMOS DE CAFETERÍA'
    }
];

// Consulta compartida por el Excel y por la hoja del sistema
const obtenerControlMensual = async (m, a) => {
    const mesAnterior = m === 1 ? 12 : m - 1;
    const anioAnterior = m === 1 ? a - 1 : a;
    const categorias = [];

    for (const cat of CATEGORIAS) {
        const r = await query(`
      SELECT i.id, i.nombre,
        COALESCE((
          SELECT SUM(CASE WHEN mv.tipo_movimiento='entrada' THEN mv.cantidad
                          ELSE -mv.cantidad END)
          FROM movimientos_inventario mv
          WHERE mv.insumo_id = i.id
            AND (EXTRACT(YEAR FROM mv.fecha_movimiento) < $2
              OR (EXTRACT(YEAR FROM mv.fecha_movimiento) = $2
                  AND EXTRACT(MONTH FROM mv.fecha_movimiento) <= $1))
        ),0)::int AS vienen,
        COALESCE((
          SELECT SUM(mv.cantidad) FROM movimientos_inventario mv
          WHERE mv.insumo_id = i.id AND mv.tipo_movimiento='entrada'
            AND EXTRACT(MONTH FROM mv.fecha_movimiento) = $3
            AND EXTRACT(YEAR  FROM mv.fecha_movimiento) = $4
        ),0)::int AS ingreso,
        COALESCE((
          SELECT SUM(mv.cantidad) FROM movimientos_inventario mv
          WHERE mv.insumo_id = i.id AND mv.tipo_movimiento='salida'
            AND EXTRACT(MONTH FROM mv.fecha_movimiento) = $3
            AND EXTRACT(YEAR  FROM mv.fecha_movimiento) = $4
        ),0)::int AS salida,
        TO_CHAR((
          SELECT MIN(mv.fecha_movimiento) FROM movimientos_inventario mv
          WHERE mv.insumo_id = i.id AND mv.tipo_movimiento='entrada'
            AND EXTRACT(MONTH FROM mv.fecha_movimiento) = $3
            AND EXTRACT(YEAR  FROM mv.fecha_movimiento) = $4
        ), 'DD/MM') AS fecha_ingreso
      FROM insumos i
      WHERE i.categoria = $5 AND i.activo = TRUE
      ORDER BY i.id`,
            [mesAnterior, anioAnterior, m, a, cat.clave]);

        categorias.push({ ...cat, insumos: r.rows });
    }

    return { categorias, mesAnterior, anioAnterior };
};

// ── EXCEL CONTROL MENSUAL ────────────────────────
const inventarioExcel = async (req, res) => {
    const { mes, anio } = req.query;

    if (!mes || !anio) {
        return res.status(400).json({ mensaje: 'Debe indicar el mes y el año' });
    }

    const m = parseInt(mes), a = parseInt(anio);

    try {
        const { categorias, mesAnterior } = await obtenerControlMensual(m, a);

        const libro = new ExcelJS.Workbook();
        libro.creator = 'Sistema Bomberos Voluntarios 39a Compania';
        libro.created = new Date();

        const FUENTE = 'Aptos Narrow';
        const borde = {
            top: { style: 'thin' }, bottom: { style: 'thin' },
            left: { style: 'thin' }, right: { style: 'thin' }
        };

        for (const cat of categorias) {
            const h = libro.addWorksheet(cat.hoja, {
                pageSetup: {
                    paperSize: 5, orientation: 'portrait',
                    fitToPage: true, fitToWidth: 1, fitToHeight: 0,
                    margins: { left: 0.5, right: 0.5, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 }
                }
            });

            h.columns = [
                { width: 5 }, { width: 46 }, { width: 13 },
                { width: 12 }, { width: 12 }, { width: 12 },
                { width: 12 }, { width: 13 }
            ];

            const titulos = [
                'BENEMÉRITO CUERPO VOLUNTARIO DE BOMBEROS',
                'TRIGÉSIMA NOVENA COMPAÑÍA CHIQUIMULA, GUATEMALA',
                cat.titulo,
                `DURANTE EL MES DE ${MESES[m - 1].toUpperCase()} DE ${a}`
            ];
            titulos.forEach((t, i) => {
                h.mergeCells(i + 1, 2, i + 1, 8);
                const c = h.getCell(i + 1, 2);
                c.value = t;
                c.font = { name: FUENTE, size: 11, bold: true };
                c.alignment = { horizontal: 'center', vertical: 'middle' };
            });
            h.getRow(5).height = 8;

            h.mergeCells('A6:A7'); h.getCell('A6').value = 'No.';
            h.mergeCells('B6:B7'); h.getCell('B6').value = 'INSUMO';
            h.getCell('C6').value = `MES: ${MESES[mesAnterior - 1].toUpperCase()}`;
            h.getCell('C7').value = 'VIENEN';
            h.mergeCells('D6:E6'); h.getCell('D6').value = 'INGRESO';
            h.getCell('D7').value = 'FECHA';
            h.getCell('E7').value = 'CANTIDAD';
            h.getCell('F6').value = 'EXISTENCIA';
            h.getCell('F7').value = 'CANTIDAD';
            h.getCell('G6').value = 'SALIDA';
            h.getCell('G7').value = 'CANTIDAD';
            h.mergeCells('H6:H7'); h.getCell('H6').value = 'TOTAL';

            for (const f of [6, 7]) {
                for (let c = 1; c <= 8; c++) {
                    const celda = h.getCell(f, c);
                    celda.font = { name: FUENTE, size: 10, bold: true };
                    celda.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                    celda.border = borde;
                }
            }

            let fila = 8;
            cat.insumos.forEach((r, i) => {
                const existencia = r.vienen + r.ingreso;
                const total = existencia - r.salida;

                h.getCell(fila, 1).value = i + 1;
                h.getCell(fila, 2).value = r.nombre.toUpperCase();
                h.getCell(fila, 3).value = r.vienen;
                h.getCell(fila, 4).value = r.fecha_ingreso || '';
                h.getCell(fila, 5).value = r.ingreso || '';
                h.getCell(fila, 6).value = existencia;
                h.getCell(fila, 7).value = r.salida || '';
                h.getCell(fila, 8).value = total;

                for (let c = 1; c <= 8; c++) {
                    const celda = h.getCell(fila, c);
                    celda.font = { name: FUENTE, size: 10 };
                    celda.border = borde;
                    celda.alignment = c === 2
                        ? { horizontal: 'left', vertical: 'middle', wrapText: true }
                        : { horizontal: 'center', vertical: 'middle' };
                }
                fila++;
            });

            for (let k = 0; k < 2; k++) {
                for (let c = 1; c <= 8; c++) h.getCell(fila, c).border = borde;
                fila++;
            }

            const filaFirma = fila + 5;
            h.mergeCells(filaFirma, 3, filaFirma, 6);
            const f1 = h.getCell(filaFirma, 3);
            f1.value = 'Of. I As. Kevin Gabriel Cerín Marroquín';
            f1.font = { name: FUENTE, size: 10 };
            f1.alignment = { horizontal: 'center' };
            f1.border = { top: { style: 'thin' } };

            h.mergeCells(filaFirma + 1, 3, filaFirma + 1, 6);
            const f2 = h.getCell(filaFirma + 1, 3);
            f2.value = 'Director 39 Compañía';
            f2.font = { name: FUENTE, size: 10 };
            f2.alignment = { horizontal: 'center' };
        }

        const nombreArchivo = `Inventario_${MESES[m - 1]}_${a}.xlsx`;

        res.setHeader('Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);

        await libro.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Error al generar Excel:', error);
        res.status(500).json({ mensaje: 'Error al generar el archivo' });
    }
};

// ── DATOS DEL CONTROL MENSUAL PARA LA VISTA ──────
const inventarioControlMensual = async (req, res) => {
    const { mes, anio } = req.query;

    if (!mes || !anio) {
        return res.status(400).json({ mensaje: 'Debe indicar el mes y el año' });
    }

    const m = parseInt(mes), a = parseInt(anio);

    try {
        const { categorias, mesAnterior } = await obtenerControlMensual(m, a);

        res.json({
            periodo: { mes: MESES[m - 1], anio: a, mes_numero: m },
            mes_anterior: MESES[mesAnterior - 1],
            categorias: categorias.map(c => ({
                clave: c.clave, hoja: c.hoja, titulo: c.titulo, insumos: c.insumos
            }))
        });

    } catch (error) {
        console.error('Error al generar control mensual:', error);
        res.status(500).json({ mensaje: 'Error al generar el control mensual' });
    }
};

// ── EXCEL VALE DE SALIDAS (hoja en blanco) ───────
const valeSalidasExcel = async (req, res) => {
    const HOJAS = [
        {
            hoja: 'LIMPIEZA', col2: 'PRODUCTO',
            titulo: 'CONTROL DE PRODUCTOS DE LIMPIEZA'
        },
        {
            hoja: 'LIBRERIA', col2: 'PRODUCTO',
            titulo: 'CONTROL DE PRODUCTOS DE LIBRERÍA'
        },
        {
            hoja: 'PREHOSPITALARIO', col2: 'EQUIPO PREHOSPITALARIO',
            titulo: 'CONTROL DE EQUIPO PREHOSPITALARIO'
        },
        {
            hoja: 'CAFETERIA', col2: 'INSUMO',
            titulo: 'CONTROL DE INSUMOS DE CAFETERÍA'
        }
    ];

    try {
        const libro = new ExcelJS.Workbook();
        libro.creator = 'Sistema Bomberos Voluntarios 39a Compania';
        libro.created = new Date();

        const FUENTE = 'Aptos Narrow';
        const borde = {
            top: { style: 'thin' }, bottom: { style: 'thin' },
            left: { style: 'thin' }, right: { style: 'thin' }
        };

        for (const cfg of HOJAS) {
            const h = libro.addWorksheet(cfg.hoja, {
                pageSetup: {
                    paperSize: 5, orientation: 'portrait',
                    fitToPage: true, fitToWidth: 1, fitToHeight: 0,
                    margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 }
                }
            });

            h.columns = [
                { width: 7.6 }, { width: 57.9 }, { width: 13.7 },
                { width: 22.7 }, { width: 8 }, { width: 22.7 }, { width: 13 }
            ];

            h.mergeCells('A2:G2');
            const t1 = h.getCell('A2');
            t1.value = 'BENEMÉRITO CUERPO VOLUNTARIO DE BOMBEROS';
            t1.font = { name: FUENTE, size: 12, bold: true };
            t1.alignment = { horizontal: 'center' };

            h.mergeCells('A3:G3');
            const t2 = h.getCell('A3');
            t2.value = 'TRIGÉSIMA NOVENA COMPAÑÍA CHIQUIMULA, GUATEMALA';
            t2.font = { name: FUENTE, size: 12, bold: true };
            t2.alignment = { horizontal: 'center' };

            h.mergeCells('B4:G4');
            const t3 = h.getCell('B4');
            t3.value = `${cfg.titulo} CORRESPONDIENTE AL MES:___________________ AÑO: ________`;
            t3.font = { name: FUENTE, size: 11, bold: true };
            t3.alignment = { horizontal: 'center' };

            const enc = ['CANT.', cfg.col2, 'FECHA DE SALIDA', 'RECIBIDO POR',
                'ESCUA-DRA', 'FIRMA DE RECIBIDO', 'ENTREGADO POR'];
            enc.forEach((v, i) => {
                const celda = h.getCell(6, i + 1);
                celda.value = v;
                celda.font = { name: FUENTE, size: 10, bold: true };
                celda.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                celda.border = borde;
            });
            h.getRow(6).height = 30;

            for (let f = 7; f <= 29; f++) {
                h.getRow(f).height = 22;
                for (let c = 1; c <= 7; c++) h.getCell(f, c).border = borde;
            }

            h.mergeCells('B31:D31');
            const f1 = h.getCell('B31');
            f1.value = 'Oficial I As. Kevin Gabriel Cerín Marroquín ';
            f1.font = { name: FUENTE, size: 11 };
            f1.alignment = { horizontal: 'center' };
            f1.border = { top: { style: 'thin' } };

            h.mergeCells('B32:D32');
            const f2 = h.getCell('B32');
            f2.value = 'Director 39 Compañía ';
            f2.font = { name: FUENTE, size: 11 };
            f2.alignment = { horizontal: 'center' };
        }

        res.setHeader('Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="Vale_de_salidas.xlsx"');

        await libro.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error('Error al generar vale de salidas:', error);
        res.status(500).json({ mensaje: 'Error al generar el archivo' });
    }
};

module.exports = { inventarioExcel, inventarioControlMensual, valeSalidasExcel };