# Sistema de Bomberos Voluntarios · 39ª Compañía, Chiquimula

Registro de servicios de emergencia, inventario por documentos y lotes, análisis e informes institucionales.
El diseño completo y su justificación están en [docs/analisis-del-sistema.md](docs/analisis-del-sistema.md).

| Sección | Objetivo | Páginas |
|---|---|---|
| Inicio | — | Según el rol: unidades fuera, boletas por completar, lo que hay que revisar, resumen del mes |
| Boletas | OE1 | Revisión diaria · Historial · Por imprimir · Registrar llamada · Completar boleta |
| Análisis de servicios | OE1 | Zonas de mayor incidencia, lugares críticos, franjas, día × hora, causas |
| Existencias | OE3 | Insumos · Lotes y vencimientos · Movimientos de cada insumo |
| Movimientos | OE3 | Documentos (entradas, vales, bajas, ajustes) · Por insumo y lote |
| Análisis institucional | OE2 | Resumen · Consumo por servicio · Proyección anual · Demanda y recursos |
| Informes | OE2/OE3 | Control mensual, resumen anual, proyección, salidas por unidad, personas atendidas, totales por tipo |
| Configuración | — | Catálogos (sectores, escuadras, personal y PIN, unidades, lugares críticos) · Usuarios · Bitácora |

## Puesta en marcha

1. Crear la base `Bomberos-Voluntarios-39` en PostgreSQL y ejecutar `backend/src/database/schema.sql`.
2. Copiar `backend/.env.example` a `backend/.env` y completar los valores.
3. Backend: `cd backend && npm install && npm run migrar && npm run dev`
4. Frontend: `cd frontend && npm install && npm run dev` → http://localhost:5173

`npm run migrar` aplica en orden los archivos de `backend/src/database/migraciones/` que falten; es seguro ejecutarlo varias veces.
Todo funciona en la red local de la estación, sin internet (fuentes incluidas).

Usuarios iniciales: `admin / admin123`, `operativo / operativo123` y `cabina / cabina123` (cámbielos desde *Configuración › Usuarios*).
Los datos de prueba (`npm run simular -- --reiniciar`) crean además `direccion / direccion123`, y todo el personal simulado tiene el PIN `1234`.

## Roles

| Rol | Quién | Puede |
|---|---|---|
| Cabina (`cabina`) | Computadora de cabina | Solo registra llamadas y regresos; cada bombero completa sus boletas con su PIN. Inicio: unidades fuera, disponibles y fuera de servicio, boletas por completar del turno y turno activo |
| Operativo (`operativo`) | Personal operativo | Lo de cabina, más existencias y movimientos de inventario (consulta), historial de boletas e informes |
| Administración | Encargada administrativa | Todo el sistema: inventario, revisión y firma, análisis, informes, catálogos y usuarios. Ve las boletas por completar, pero no las completa |
| Dirección | Jefe de la compañía | Consultar todo; no puede modificar registros |

## Antes de usar en producción

- Cargar el catálogo de **sectores** y los **lugares críticos** que la compañía ya conoce.
- Registrar **escuadras**, **personal** (con su escuadra y su PIN) y **unidades** (con su estado).
- Registrar el inventario existente como una **entrada** de origen *Inventario inicial*, con lote y vencimiento.

## Cómo funciona una boleta

1. **Cabina** registra la llamada (tipo, dirección, sector, unidades y tripulación) y pulsa **«La unidad salió»**. Si salen varias unidades, cada una lleva su propia boleta con su piloto y su tripulación, ligadas al mismo incidente. Piloto, tripulación y firmas solo se eligen del personal del turno de guardia. La boleta queda *en curso*, todavía sin número.
2. Cuando la unidad vuelve, en Inicio se pulsa **«La unidad regresó»**: la boleta recibe el **siguiente número de control de su tipo, en el orden en que regresan las unidades** (regla de la capital).
3. La **tripulación** completa la boleta cuando puede, identificándose con su **PIN**. Para marcarla como completa no puede quedar ningún campo en blanco: cada uno lleva su dato o «No aplica».
4. Se imprime en hoja oficio con el formato oficial completo y se firma.
5. La **administración** hace la **revisión diaria**: ve la secuencia de números por tipo, detecta saltos y marca las boletas firmadas. Una boleta firmada ya no se edita; solo se anula con motivo.

## Reglas de inventario

- Todo movimiento de bodega nace de un **documento** con varias líneas: entrada, vale de entrega, baja o ajuste.
- Toda entrada de un insumo que vence exige **lote y vencimiento**; las salidas toman primero el lote que vence antes.
- El **vale** registra la escuadra, quién recibe y quién entrega, y se imprime con el formato de la hoja de papel.
- Los insumos anotados en una boleta son el **uso en ese servicio**: no se descuentan otra vez de bodega (ya salieron por vale) y alimentan el consumo por tipo, causa y sector.
- La hoja mensual se calcula sola. Al **cerrar un mes** sus saldos se congelan y registrar algo con fecha de ese mes pide una justificación.
- Ningún registro se borra: las correcciones se hacen con un ajuste o una anulación con motivo, y quedan en la bitácora.
