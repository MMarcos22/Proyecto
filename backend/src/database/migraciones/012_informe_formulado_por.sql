-- ═══════════════════════════════════════════════════════════════
-- MIGRACIÓN 012 — «Informe formulado por»
--   La palabra «reporte» ya no se usa en el sistema (pantallas, código y
--   base de datos). La columna de la boleta cambia de nombre; en una base
--   nueva, schema.sql ya la crea con el nombre nuevo.
-- ═══════════════════════════════════════════════════════════════

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'emergencias' AND column_name = 'reporte_formulado_por') THEN
        ALTER TABLE emergencias RENAME COLUMN reporte_formulado_por TO informe_formulado_por;
    END IF;
END $$;
