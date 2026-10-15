-- ═══════════════════════════════════════════════════════════════
-- MIGRACIÓN 002 — Turnos y servicios en curso
--   · Una boleta puede abrirse al salir la unidad (en_curso) y
--     cerrarse al regresar (activa).
--   · El turno guarda quién está de guardia; las boletas lo usan
--     para autocompletar radiotelefonista, jefe y personal.
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE emergencias DROP CONSTRAINT IF EXISTS emergencias_estado_check;
ALTER TABLE emergencias ADD CONSTRAINT emergencias_estado_check
    CHECK (estado IN ('en_curso', 'activa', 'anulada'));

CREATE TABLE IF NOT EXISTS turnos (
    id               SERIAL PRIMARY KEY,
    inicio           TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fin              TIMESTAMP,
    radiotelefonista VARCHAR(150),
    jefe_servicio    VARCHAR(150),
    personal         TEXT[]      NOT NULL DEFAULT '{}',
    observaciones    TEXT,
    usuario_id       INTEGER     NOT NULL REFERENCES usuarios(id),
    cerrado_por      INTEGER     REFERENCES usuarios(id)
);

-- Solo puede haber un turno abierto a la vez
CREATE UNIQUE INDEX IF NOT EXISTS turno_abierto_unico ON turnos ((fin IS NULL)) WHERE fin IS NULL;

ALTER TABLE emergencias ADD COLUMN IF NOT EXISTS turno_id INTEGER REFERENCES turnos(id);
CREATE INDEX IF NOT EXISTS idx_emerg_telefono ON emergencias(solicitud_por_telefono);
