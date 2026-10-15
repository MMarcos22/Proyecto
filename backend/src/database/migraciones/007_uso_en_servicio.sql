-- ═══════════════════════════════════════════════════════════════
-- MIGRACIÓN 007 — Uso de insumos en el servicio (análisis §10.1)
--   Los insumos salen de bodega por vale hacia la escuadra (entrevista
--   00:42). Lo que la tripulación anota en la boleta es el USO en ese
--   servicio: no vuelve a descontar de bodega (sería contarlo dos
--   veces) pero alimenta el consumo por tipo, causa y sector (OE2).
--   La vista une este registro con los consumos que antes sí se
--   descontaban de bodega, para que los informes tengan una sola fuente.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS consumos_servicio (
    id            SERIAL PRIMARY KEY,
    emergencia_id INTEGER   NOT NULL REFERENCES emergencias(id) ON DELETE CASCADE,
    insumo_id     INTEGER   NOT NULL REFERENCES insumos(id),
    cantidad      INTEGER   NOT NULL CHECK (cantidad > 0),
    usuario_id    INTEGER   NOT NULL REFERENCES usuarios(id),
    creado_en     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_consumo_emergencia ON consumos_servicio(emergencia_id);
CREATE INDEX IF NOT EXISTS idx_consumo_insumo ON consumos_servicio(insumo_id);

CREATE OR REPLACE VIEW v_consumo_servicio AS
SELECT 'u' || c.id AS id, c.emergencia_id, c.insumo_id, c.cantidad
FROM consumos_servicio c
UNION ALL
SELECT 'm' || m.id AS id, m.emergencia_id, m.insumo_id, m.cantidad
FROM movimientos_inventario m
WHERE m.tipo_movimiento = 'salida' AND m.motivo = 'consumo_servicio' AND m.emergencia_id IS NOT NULL;
