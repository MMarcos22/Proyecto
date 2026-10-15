-- ═══════════════════════════════════════════════════════════════
-- MIGRACIÓN 009 — La clase de servicio varios puede esperar
--   La llamada se registra con lo mínimo y la causa «si ya se sabe»
--   (docs/Sistema_por_modulos.docx, 3.2). Esta columna venía del
--   modelo anterior, donde la boleta se guardaba completa de una vez,
--   y hacía fallar el registro de un servicio varios sin causa.
--   Que la boleta completa la tenga lo exige la regla de faltantes
--   (CAMPOS_BOLETA), no la base de datos.
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE detalle_varios ALTER COLUMN clase_servicio DROP NOT NULL;
