-- ═══════════════════════════════════════════════════════════════
-- MIGRACIÓN 006 — Inventario por documentos (análisis, Parte III §10)
--   · Entradas, vales, bajas y ajustes como documentos con varias
--     líneas y número propio (E-2026-0001, V-2026-0001…).
--   · El vale reproduce la hoja que hoy se firma a mano: quién recibe,
--     escuadra y quién entrega (entrevista 00:42).
--   · Motivos nuevos: envío de la capital y entrega por vale.
--   · Clase de insumo (consumible con vencimiento, consumible, equipo)
--     y presentación de compra (caja de 50, paquete de 10…).
--   · Cierre mensual: congela los saldos de cada mes.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS documentos_inventario (
    id            SERIAL PRIMARY KEY,
    tipo          VARCHAR(10)  NOT NULL CHECK (tipo IN ('entrada', 'vale', 'baja', 'ajuste')),
    numero        VARCHAR(20)  NOT NULL UNIQUE,
    secuencia     INTEGER      NOT NULL,
    anio          INTEGER      NOT NULL,
    fecha         DATE         NOT NULL,
    categoria     VARCHAR(30),
    origen        VARCHAR(20),
    donante       VARCHAR(150),
    constancia    VARCHAR(80),
    escuadra_id   INTEGER      REFERENCES escuadras(id),
    recibe_id     INTEGER      REFERENCES personal(id),
    entrega       VARCHAR(150),
    observaciones TEXT,
    usuario_id    INTEGER      NOT NULL REFERENCES usuarios(id),
    creado_en     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (tipo, anio, secuencia)
);
CREATE INDEX IF NOT EXISTS idx_doc_fecha ON documentos_inventario(fecha);
CREATE INDEX IF NOT EXISTS idx_doc_escuadra ON documentos_inventario(escuadra_id);

ALTER TABLE movimientos_inventario
    ADD COLUMN IF NOT EXISTS documento_id INTEGER REFERENCES documentos_inventario(id);
CREATE INDEX IF NOT EXISTS idx_mov_documento ON movimientos_inventario(documento_id);

ALTER TABLE movimientos_inventario DROP CONSTRAINT IF EXISTS motivo_valido;
ALTER TABLE movimientos_inventario ADD CONSTRAINT motivo_valido CHECK (
    (tipo_movimiento = 'entrada' AND motivo IN ('envio_capital', 'compra', 'donacion', 'inventario_inicial', 'ajuste'))
 OR (tipo_movimiento = 'salida'  AND motivo IN ('entrega_escuadra', 'consumo_servicio', 'uso_interno', 'baja_vencimiento', 'baja_dano', 'ajuste'))
);

-- ── Clase y presentación de cada insumo ───────────────────────
ALTER TABLE insumos
    ADD COLUMN IF NOT EXISTS clase               VARCHAR(20) NOT NULL DEFAULT 'consumible',
    ADD COLUMN IF NOT EXISTS presentacion        VARCHAR(40),
    ADD COLUMN IF NOT EXISTS factor_presentacion INTEGER NOT NULL DEFAULT 1;
ALTER TABLE insumos DROP CONSTRAINT IF EXISTS insumos_clase_check;
ALTER TABLE insumos ADD CONSTRAINT insumos_clase_check CHECK (clase IN ('consumible_vence', 'consumible', 'equipo'));
ALTER TABLE insumos DROP CONSTRAINT IF EXISTS insumos_factor_check;
ALTER TABLE insumos ADD CONSTRAINT insumos_factor_check CHECK (factor_presentacion > 0);

UPDATE insumos SET clase = 'equipo'
WHERE nombre ~* '(glucómetro|estetoscopio|esfigmomanómetro|escobas|pala para basura|botes para basura|palos y bases)';
UPDATE insumos SET clase = 'consumible_vence'
WHERE clase <> 'equipo' AND (
    (categoria = 'prehospitalario' AND nombre !~* '(traje overol|algodón|micropor|esparadrapo|silk tape)')
    OR categoria = 'cafeteria');

-- ── Cierre mensual ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cierres_mensuales (
    id          SERIAL PRIMARY KEY,
    anio        INTEGER   NOT NULL,
    mes         INTEGER   NOT NULL CHECK (mes BETWEEN 1 AND 12),
    saldos      JSONB     NOT NULL,
    cerrado_por INTEGER   NOT NULL REFERENCES usuarios(id),
    cerrado_en  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (anio, mes)
);
