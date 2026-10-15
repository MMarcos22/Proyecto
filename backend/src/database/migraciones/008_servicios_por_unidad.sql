-- ═══════════════════════════════════════════════════════════════
-- MIGRACIÓN 008 — Qué servicios atiende cada unidad
--   (docs/Sistema_por_modulos.docx, sección 5). Al registrar una llamada el
--   sistema propone sola la unidad disponible que corresponde al tipo:
--   una ambulancia para ambulancia, la cisterna para agua. Sin este
--   dato la cabina tenía que elegir entre todas las unidades.
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE unidades ADD COLUMN IF NOT EXISTS servicios TEXT[] NOT NULL DEFAULT '{}';

-- Valores iniciales según la descripción de cada unidad; la administración
-- los ajusta en Configuración › Catálogos › Unidades
UPDATE unidades SET servicios = ARRAY['ambulancia', 'rescate', 'varios']
 WHERE servicios = '{}' AND descripcion ILIKE '%ambulancia%';
UPDATE unidades SET servicios = ARRAY['agua', 'incendio']
 WHERE servicios = '{}' AND (descripcion ILIKE '%agua%' OR descripcion ILIKE '%cisterna%');
UPDATE unidades SET servicios = ARRAY['incendio', 'varios']
 WHERE servicios = '{}' AND (descripcion ILIKE '%bomba%' OR descripcion ILIKE '%incendio%');
UPDATE unidades SET servicios = ARRAY['rescate', 'varios']
 WHERE servicios = '{}' AND descripcion ILIKE '%rescate%';
