-- ═══════════════════════════════════════════════════════════════
-- MIGRACIÓN 001 — Modelo analítico
--   · Catálogo de sectores (zonas, barrios, colonias, aldeas)
--   · Emergencias ligadas a sector, unidad y piloto; subtipo; anulación
--   · Inventario por lote (saldo por lote, salidas FEFO)
--   · Motivos de movimiento (solo el consumo en servicio exige boleta)
--   · Bitácora de cambios y registro de sugerencias de IA
-- ═══════════════════════════════════════════════════════════════

-- ── 1. SECTORES ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sectores (
    id          SERIAL PRIMARY KEY,
    nombre      VARCHAR(120) NOT NULL,
    tipo        VARCHAR(20)  NOT NULL DEFAULT 'zona'
                CHECK (tipo IN ('zona','barrio','colonia','aldea','caserio','otro')),
    referencias TEXT,
    activo      BOOLEAN      NOT NULL DEFAULT TRUE,
    creado_en   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS sectores_nombre_unico ON sectores (LOWER(nombre));

-- ── 2. EMERGENCIAS ─────────────────────────────────────────────
ALTER TABLE emergencias
    ADD COLUMN IF NOT EXISTS sector_id        INTEGER REFERENCES sectores(id),
    ADD COLUMN IF NOT EXISTS unidad_id        INTEGER REFERENCES unidades(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS piloto_id        INTEGER REFERENCES personal(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS subtipo          VARCHAR(40),
    ADD COLUMN IF NOT EXISTS estado           VARCHAR(10) NOT NULL DEFAULT 'activa'
                                              CHECK (estado IN ('activa','anulada')),
    ADD COLUMN IF NOT EXISTS motivo_anulacion TEXT,
    ADD COLUMN IF NOT EXISTS anulada_por      INTEGER REFERENCES usuarios(id),
    ADD COLUMN IF NOT EXISTS anulada_en       TIMESTAMP,
    ADD COLUMN IF NOT EXISTS actualizado_por  INTEGER REFERENCES usuarios(id),
    ADD COLUMN IF NOT EXISTS actualizado_en   TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_emerg_sector  ON emergencias(sector_id);
CREATE INDEX IF NOT EXISTS idx_emerg_estado  ON emergencias(estado);
CREATE INDEX IF NOT EXISTS idx_emerg_subtipo ON emergencias(subtipo);

-- ── 3. PERSONAL Y UNIDADES: baja lógica ────────────────────────
ALTER TABLE personal ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE unidades ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE;

-- ── 4. LOTES ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lotes (
    id                SERIAL PRIMARY KEY,
    insumo_id         INTEGER     NOT NULL REFERENCES insumos(id),
    numero_lote       VARCHAR(80),
    fecha_vencimiento DATE,
    cantidad_inicial  INTEGER     NOT NULL CHECK (cantidad_inicial > 0),
    saldo             INTEGER     NOT NULL CHECK (saldo >= 0),
    fecha_ingreso     DATE        NOT NULL DEFAULT CURRENT_DATE,
    creado_en         TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (saldo <= cantidad_inicial)
);

CREATE INDEX IF NOT EXISTS idx_lote_insumo ON lotes(insumo_id);
CREATE INDEX IF NOT EXISTS idx_lote_venc   ON lotes(fecha_vencimiento) WHERE saldo > 0;
CREATE UNIQUE INDEX IF NOT EXISTS lote_numero_unico
    ON lotes (insumo_id, LOWER(numero_lote)) WHERE numero_lote IS NOT NULL;

-- ── 5. MOVIMIENTOS: lote y motivo ──────────────────────────────
ALTER TABLE movimientos_inventario
    ADD COLUMN IF NOT EXISTS lote_id   INTEGER REFERENCES lotes(id),
    ADD COLUMN IF NOT EXISTS motivo    VARCHAR(20),
    ADD COLUMN IF NOT EXISTS documento VARCHAR(80);

-- Lotes para entradas previas a esta migración
INSERT INTO lotes (insumo_id, numero_lote, fecha_vencimiento, cantidad_inicial, saldo, fecha_ingreso)
SELECT m.insumo_id, m.numero_lote, m.fecha_vencimiento, m.cantidad, 0, m.fecha_movimiento
FROM movimientos_inventario m
WHERE m.tipo_movimiento = 'entrada' AND m.lote_id IS NULL;

UPDATE movimientos_inventario m SET lote_id = l.id
FROM lotes l
WHERE m.tipo_movimiento = 'entrada' AND m.lote_id IS NULL
  AND l.insumo_id = m.insumo_id AND l.cantidad_inicial = m.cantidad
  AND l.fecha_ingreso = m.fecha_movimiento
  AND l.numero_lote IS NOT DISTINCT FROM m.numero_lote;

-- El stock vigente se reparte en los lotes más recientes
UPDATE lotes l SET saldo = LEAST(l.cantidad_inicial, GREATEST(0,
    i.stock_actual - COALESCE((
        SELECT SUM(l2.cantidad_inicial) FROM lotes l2
        WHERE l2.insumo_id = l.insumo_id AND l2.id > l.id), 0)))
FROM insumos i WHERE i.id = l.insumo_id;

UPDATE movimientos_inventario SET motivo = 'compra'
    WHERE motivo IS NULL AND tipo_movimiento = 'entrada';
UPDATE movimientos_inventario SET motivo = 'consumo_servicio'
    WHERE motivo IS NULL AND tipo_movimiento = 'salida';

ALTER TABLE movimientos_inventario ALTER COLUMN motivo SET NOT NULL;

ALTER TABLE movimientos_inventario DROP CONSTRAINT IF EXISTS salida_requiere_servicio;
ALTER TABLE movimientos_inventario DROP CONSTRAINT IF EXISTS motivo_valido;
ALTER TABLE movimientos_inventario DROP CONSTRAINT IF EXISTS consumo_requiere_servicio;

ALTER TABLE movimientos_inventario ADD CONSTRAINT motivo_valido CHECK (
    (tipo_movimiento = 'entrada' AND motivo IN ('compra','donacion','inventario_inicial','ajuste'))
 OR (tipo_movimiento = 'salida'  AND motivo IN ('consumo_servicio','uso_interno','baja_vencimiento','baja_dano','ajuste'))
);

ALTER TABLE movimientos_inventario ADD CONSTRAINT consumo_requiere_servicio
    CHECK (motivo <> 'consumo_servicio' OR emergencia_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_mov_lote       ON movimientos_inventario(lote_id);
CREATE INDEX IF NOT EXISTS idx_mov_emergencia ON movimientos_inventario(emergencia_id);

-- ── 6. BITÁCORA ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bitacora (
    id         SERIAL PRIMARY KEY,
    usuario_id INTEGER     REFERENCES usuarios(id),
    accion     VARCHAR(40) NOT NULL,
    entidad    VARCHAR(40) NOT NULL,
    entidad_id INTEGER,
    detalle    JSONB,
    creado_en  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bitacora_entidad ON bitacora(entidad, entidad_id);
CREATE INDEX IF NOT EXISTS idx_bitacora_fecha   ON bitacora(creado_en);

-- ── 7. SUGERENCIAS DE IA ───────────────────────────────────────
-- Cada sugerencia queda registrada; al guardar la boleta se marca si el
-- operador la aceptó. Con esto se mide la precisión del asistente.
CREATE TABLE IF NOT EXISTS ia_sugerencias (
    id            SERIAL PRIMARY KEY,
    tipo          VARCHAR(20) NOT NULL CHECK (tipo IN ('sector','subtipo','informe')),
    origen        VARCHAR(20) NOT NULL CHECK (origen IN ('modelo','reglas')),
    modelo        VARCHAR(60),
    entrada       JSONB,
    sugerencia    JSONB,
    emergencia_id INTEGER     REFERENCES emergencias(id) ON DELETE SET NULL,
    aceptada      BOOLEAN,
    valor_final   VARCHAR(120),
    usuario_id    INTEGER     REFERENCES usuarios(id),
    creado_en     TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ia_tipo ON ia_sugerencias(tipo, creado_en);
