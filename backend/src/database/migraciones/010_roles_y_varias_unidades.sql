-- ═══════════════════════════════════════════════════════════════
-- MIGRACIÓN 010 — Recomendaciones de la compañía (octubre 2026)
--   · Rol Cabina: solo registra llamadas y completa boletas.
--     Operativo: lo de cabina, más existencias, movimientos e informes.
--     Administración: ve todo, pero no completa boletas.
--   · Varias unidades por incidente: cada unidad que sale lleva su
--     propia boleta (su número, su piloto y su tripulación) y todas
--     quedan ligadas al mismo incidente.
--   · Sectores del municipio de Chiquimula (catálogo inicial).
-- ═══════════════════════════════════════════════════════════════

-- ── 1. ROLES ───────────────────────────────────────────────────
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_check;
ALTER TABLE usuarios ADD CONSTRAINT usuarios_rol_check
    CHECK (rol IN ('administrador', 'operativo', 'cabina', 'direccion'));

-- Usuario de la computadora de cabina (clave de prueba: cabina123; cámbiela)
INSERT INTO usuarios (usuario, password_hash, nombre_completo, rol)
VALUES ('cabina', crypt('cabina123', gen_salt('bf', 10)), 'Cabina de radio', 'cabina')
ON CONFLICT (usuario) DO NOTHING;

-- ── 2. INCIDENTE: boletas de varias unidades ───────────────────
-- incidente_id es el id de la primera boleta del incidente; una boleta
-- de una sola unidad apunta a sí misma.
ALTER TABLE emergencias ADD COLUMN IF NOT EXISTS incidente_id INTEGER REFERENCES emergencias(id);
UPDATE emergencias SET incidente_id = id WHERE incidente_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_emerg_incidente ON emergencias(incidente_id);

-- ── 3. SECTORES DE CHIQUIMULA ──────────────────────────────────
-- Catálogo inicial del municipio; la administración lo corrige en
-- Configuración › Catálogos cuando se confirme el listado oficial.
INSERT INTO sectores (nombre, tipo, referencias) VALUES
    ('Zona 1 (Centro)', 'zona', 'Parque central, mercado municipal, catedral'),
    ('Zona 2', 'zona', 'Salida a Esquipulas'),
    ('Zona 3', 'zona', 'Terminal de buses'),
    ('Zona 4', 'zona', NULL),
    ('Zona 5', 'zona', NULL),
    ('Barrio El Molino', 'barrio', 'Junto al río Tacó'),
    ('Barrio La Democracia', 'barrio', NULL),
    ('Barrio San Antonio', 'barrio', NULL),
    ('Colonia El Zapotillo', 'colonia', NULL),
    ('Colonia Las Victorias', 'colonia', NULL),
    ('Colonia Bethania', 'colonia', NULL),
    ('Colonia El Maestro', 'colonia', NULL),
    ('Colonia Pradera', 'colonia', 'Entrada a Pradera'),
    ('Aldea Vado Hondo', 'aldea', 'Cruce a Esquipulas y Zacapa'),
    ('Aldea Petapilla', 'aldea', NULL),
    ('Aldea Maraxcó', 'aldea', NULL),
    ('Aldea San Esteban', 'aldea', NULL),
    ('Aldea Sabana Grande', 'aldea', NULL),
    ('Aldea El Ingeniero', 'aldea', NULL),
    ('Aldea Santa Bárbara', 'aldea', NULL),
    ('Aldea Shusho Arriba', 'aldea', NULL),
    ('Aldea Conacaste', 'aldea', NULL),
    ('Caserío Los Planes', 'caserio', NULL),
    ('Ruta CA-10 (Chiquimula–Vado Hondo)', 'otro', 'Tramo carretero de alta siniestralidad')
ON CONFLICT DO NOTHING;
