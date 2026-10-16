-- ═══════════════════════════════════════════════════════════════
-- MIGRACIÓN 011 — Cambiar el tipo de servicio de una boleta
--   Llamaron por un choque (ambulancia) y al llegar hay alguien atrapado
--   (rescate); o el herido ya se fue y el servicio no se completó
--   (servicios varios). La boleta cambia de tipo sin rehacerla: conserva
--   horas, piloto y tripulación. Si ya tenía número, recibe el siguiente
--   del tipo nuevo y el anterior queda aquí: no se vuelve a usar (pudo
--   imprimirse) y la revisión diaria explica el salto en la numeración.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS numeros_liberados (
    id             SERIAL PRIMARY KEY,
    tipo_servicio  VARCHAR(20) NOT NULL,
    anio           INTEGER     NOT NULL,
    secuencia      INTEGER     NOT NULL,
    numero_control VARCHAR(30) NOT NULL,
    emergencia_id  INTEGER     NOT NULL REFERENCES emergencias(id),
    paso_a         VARCHAR(30),
    usuario_id     INTEGER     NOT NULL REFERENCES usuarios(id),
    creado_en      TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (tipo_servicio, anio, secuencia)
);
