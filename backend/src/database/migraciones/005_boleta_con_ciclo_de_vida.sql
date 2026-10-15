-- ═══════════════════════════════════════════════════════════════
-- MIGRACIÓN 005 — Boleta con ciclo de vida (análisis, Parte III §9)
--   · Estados: en_curso → pendiente → completa → firmada (o anulada)
--   · El número de control se asigna al registrar el regreso de la
--     unidad, en orden de regreso y correlativo por tipo y año
--     (regla de la capital; entrevista 57:00).
--   · Escuadras, tripulación por boleta y PIN personal.
--   · Lugares críticos dentro de un sector; estado de las unidades.
--   · Rol Dirección (solo consulta).
-- ═══════════════════════════════════════════════════════════════

-- ── 1. ROLES ───────────────────────────────────────────────────
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_rol_check;
ALTER TABLE usuarios ADD CONSTRAINT usuarios_rol_check
    CHECK (rol IN ('administrador', 'operativo', 'direccion'));

-- ── 2. ESCUADRAS Y PERSONAL ────────────────────────────────────
CREATE TABLE IF NOT EXISTS escuadras (
    id        SERIAL PRIMARY KEY,
    nombre    VARCHAR(60) NOT NULL,
    activo    BOOLEAN     NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS escuadras_nombre_unico ON escuadras (LOWER(nombre));

ALTER TABLE personal
    ADD COLUMN IF NOT EXISTS escuadra_id INTEGER REFERENCES escuadras(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS es_piloto   BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS voluntario  BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS pin_hash    VARCHAR(100);

UPDATE personal SET es_piloto = TRUE WHERE cargo ILIKE '%piloto%';

-- ── 3. UNIDADES: estado operativo ──────────────────────────────
ALTER TABLE unidades
    ADD COLUMN IF NOT EXISTS estado VARCHAR(12) NOT NULL DEFAULT 'servicio';
ALTER TABLE unidades DROP CONSTRAINT IF EXISTS unidades_estado_check;
ALTER TABLE unidades ADD CONSTRAINT unidades_estado_check
    CHECK (estado IN ('servicio', 'reposicion', 'taller'));

-- ── 4. TURNOS: escuadra de guardia ─────────────────────────────
ALTER TABLE turnos ADD COLUMN IF NOT EXISTS escuadra_id INTEGER REFERENCES escuadras(id) ON DELETE SET NULL;

-- ── 5. LUGARES CRÍTICOS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lugares_criticos (
    id          SERIAL PRIMARY KEY,
    sector_id   INTEGER      NOT NULL REFERENCES sectores(id),
    nombre      VARCHAR(150) NOT NULL,
    referencias TEXT,
    activo      BOOLEAN      NOT NULL DEFAULT TRUE,
    creado_en   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS lugares_criticos_nombre_unico ON lugares_criticos (LOWER(nombre));

-- ── 6. BOLETA: número al regreso, estados y datos nuevos ───────
ALTER TABLE emergencias ALTER COLUMN numero_control DROP NOT NULL;
ALTER TABLE emergencias
    ADD COLUMN IF NOT EXISTS secuencia        INTEGER,
    ADD COLUMN IF NOT EXISTS anio_secuencia   INTEGER,
    ADD COLUMN IF NOT EXISTS regreso_en       TIMESTAMP,
    ADD COLUMN IF NOT EXISTS hora_aviso       TIME,
    ADD COLUMN IF NOT EXISTS lugar_critico_id INTEGER REFERENCES lugares_criticos(id),
    ADD COLUMN IF NOT EXISTS no_aplica        JSONB NOT NULL DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS completada_en    TIMESTAMP,
    ADD COLUMN IF NOT EXISTS firmada_en       TIMESTAMP,
    ADD COLUMN IF NOT EXISTS firmada_por      INTEGER REFERENCES usuarios(id);

ALTER TABLE emergencias DROP CONSTRAINT IF EXISTS emergencias_estado_check;

-- Las boletas registradas antes pasan a completa; las ya impresas, a firmada
UPDATE emergencias SET estado = CASE WHEN impresa_en IS NOT NULL THEN 'firmada' ELSE 'completa' END,
                       completada_en = COALESCE(completada_en, creado_en),
                       firmada_en = CASE WHEN impresa_en IS NOT NULL THEN impresa_en END
WHERE estado = 'activa';

ALTER TABLE emergencias ALTER COLUMN estado SET DEFAULT 'en_curso';
ALTER TABLE emergencias ALTER COLUMN estado TYPE VARCHAR(12);
ALTER TABLE emergencias ADD CONSTRAINT emergencias_estado_check
    CHECK (estado IN ('en_curso', 'pendiente', 'completa', 'firmada', 'anulada'));

-- Correlativo existente: los dígitos finales del número de control
UPDATE emergencias
SET secuencia = NULLIF(substring(numero_control FROM '(\d+)\D*$'), '')::int,
    anio_secuencia = EXTRACT(YEAR FROM fecha)::int,
    regreso_en = COALESCE(regreso_en, fecha + COALESCE(hora_entrada, hora_salida, '00:00'::time))
WHERE numero_control IS NOT NULL AND secuencia IS NULL;

-- Una boleta en curso todavía no tiene número
UPDATE emergencias SET numero_control = NULL, secuencia = NULL, anio_secuencia = NULL, regreso_en = NULL
WHERE estado = 'en_curso';

CREATE UNIQUE INDEX IF NOT EXISTS emergencias_correlativo_unico
    ON emergencias (tipo_servicio, anio_secuencia, secuencia) WHERE secuencia IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_emerg_regreso ON emergencias(regreso_en);
CREATE INDEX IF NOT EXISTS idx_emerg_lugar ON emergencias(lugar_critico_id);

-- ── 7. TRIPULACIÓN DE CADA BOLETA ──────────────────────────────
CREATE TABLE IF NOT EXISTS boleta_tripulacion (
    emergencia_id INTEGER NOT NULL REFERENCES emergencias(id) ON DELETE CASCADE,
    personal_id   INTEGER NOT NULL REFERENCES personal(id),
    PRIMARY KEY (emergencia_id, personal_id)
);
CREATE INDEX IF NOT EXISTS idx_tripulacion_personal ON boleta_tripulacion(personal_id);

-- Tripulación de las boletas existentes a partir del texto "personal"
INSERT INTO boleta_tripulacion (emergencia_id, personal_id)
SELECT DISTINCT e.id, p.id
FROM emergencias e
CROSS JOIN LATERAL regexp_split_to_table(COALESCE(e.personal, ''), '\s*;\s*') AS nombre
JOIN personal p ON LOWER(p.nombre_completo) = LOWER(TRIM(nombre))
ON CONFLICT DO NOTHING;

-- ── 8. COPIAS CERTIFICADAS ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS certificaciones (
    id            SERIAL PRIMARY KEY,
    emergencia_id INTEGER      NOT NULL REFERENCES emergencias(id),
    solicitante   VARCHAR(200) NOT NULL,
    destino       VARCHAR(200),
    fecha         DATE         NOT NULL DEFAULT CURRENT_DATE,
    usuario_id    INTEGER      NOT NULL REFERENCES usuarios(id),
    creado_en     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_cert_emergencia ON certificaciones(emergencia_id);

-- ── 9. CAUSAS (subtipos) según la entrevista ───────────────────
-- El jefe de servicio separa accidentes de motocicleta y de vehículo (34:31)
UPDATE emergencias SET subtipo = 'accidente_vehiculo' WHERE tipo_servicio = 'ambulancia' AND subtipo = 'accidente_transito';
UPDATE emergencias SET subtipo = 'caida' WHERE tipo_servicio = 'ambulancia' AND subtipo = 'caida_trauma';
