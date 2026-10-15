-- ═══════════════════════════════════════════════════════════════
-- MIGRACIÓN 004 — Retiro de la inteligencia artificial
--   La IA salió del alcance del proyecto. El sector se reconoce por
--   coincidencia con el catálogo y los hallazgos salen de reglas
--   explícitas, así que el registro de sugerencias ya no tiene uso.
-- ═══════════════════════════════════════════════════════════════

DROP TABLE IF EXISTS ia_sugerencias;
