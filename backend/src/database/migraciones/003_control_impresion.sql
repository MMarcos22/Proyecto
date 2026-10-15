-- ═══════════════════════════════════════════════════════════════
-- MIGRACIÓN 003 — Control de impresión de boletas
--   Permite listar las boletas pendientes de imprimir y las ya impresas.
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE emergencias
    ADD COLUMN IF NOT EXISTS impresa_en    TIMESTAMP,
    ADD COLUMN IF NOT EXISTS impresiones   INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_emerg_impresa ON emergencias(impresa_en);
