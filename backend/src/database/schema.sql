-- ═══════════════════════════════════════════════════════════════
-- SISTEMA BOMBEROS VOLUNTARIOS 39ª COMPAÑÍA, CHIQUIMULA
-- Script completo de la base de datos (estado actual)
-- Base de datos: "Bomberos-Voluntarios-39"
-- ═══════════════════════════════════════════════════════════════

-- ── OPCIONAL: reinicio completo (borra TODOS los datos) ─────────
-- Quite los comentarios solo si quiere empezar desde cero.
-- DROP TABLE IF EXISTS movimientos_inventario CASCADE;
-- DROP TABLE IF EXISTS insumos                CASCADE;
-- DROP TABLE IF EXISTS detalle_agua           CASCADE;
-- DROP TABLE IF EXISTS detalle_varios         CASCADE;
-- DROP TABLE IF EXISTS detalle_rescate        CASCADE;
-- DROP TABLE IF EXISTS detalle_incendio       CASCADE;
-- DROP TABLE IF EXISTS detalle_ambulancia     CASCADE;
-- DROP TABLE IF EXISTS emergencias            CASCADE;
-- DROP TABLE IF EXISTS usuarios               CASCADE;
-- DROP TABLE IF EXISTS unidades               CASCADE;
-- DROP TABLE IF EXISTS personal               CASCADE;

-- Permite generar las contraseñas cifradas (bcrypt) desde SQL
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ═══════════════════════════════════════════════════════════════
-- 1. USUARIOS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE usuarios (
    id              SERIAL PRIMARY KEY,
    usuario         VARCHAR(50)  NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    nombre_completo VARCHAR(150) NOT NULL,
    rol             VARCHAR(20)  NOT NULL CHECK (rol IN ('administrador','operativo')),
    activo          BOOLEAN      NOT NULL DEFAULT TRUE,
    creado_en       TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ═══════════════════════════════════════════════════════════════
-- 2. EMERGENCIAS (datos comunes a los 5 tipos de servicio)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE emergencias (
    id                     SERIAL PRIMARY KEY,
    numero_control         VARCHAR(30)  NOT NULL UNIQUE,
    tipo_servicio          VARCHAR(20)  NOT NULL
                           CHECK (tipo_servicio IN ('ambulancia','incendio','rescate','varios','agua')),
    fecha                  DATE         NOT NULL,
    minutos_trabajados     INTEGER,
    solicitud_por_telefono VARCHAR(50),
    personal               VARCHAR(150),
    salida_de              VARCHAR(150),
    hora_salida            TIME,
    entrada_a              VARCHAR(150),
    hora_entrada           TIME,
    direccion              TEXT         NOT NULL,
    zona                   VARCHAR(100),
    solicitante            VARCHAR(150),
    radiotelefonista       VARCHAR(150),
    piloto                 VARCHAR(150),
    unidad                 VARCHAR(50),
    personal_destacado     TEXT,
    observaciones          TEXT,
    usuario_id             INTEGER      NOT NULL REFERENCES usuarios(id),
    creado_en              TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- firmas y certificación de la boleta
    reporte_formulado_por  VARCHAR(150),
    conforme_piloto        VARCHAR(150),
    vobo_jefe_servicio     VARCHAR(150),
    responsable            VARCHAR(150),
    jefes_servicio         VARCHAR(150),
    copia_certificada_a    VARCHAR(200),
    fecha_certificacion    DATE
);

CREATE INDEX idx_emerg_fecha  ON emergencias(fecha);
CREATE INDEX idx_emerg_tipo   ON emergencias(tipo_servicio);
CREATE INDEX idx_emerg_unidad ON emergencias(unidad);
CREATE INDEX idx_emerg_zona   ON emergencias(zona);

-- ═══════════════════════════════════════════════════════════════
-- 3. DETALLE POR TIPO DE SERVICIO
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE detalle_ambulancia (
    emergencia_id     INTEGER PRIMARY KEY REFERENCES emergencias(id) ON DELETE CASCADE,
    nombres_pacientes TEXT,
    hubo_fallecidos   BOOLEAN DEFAULT FALSE,
    fallecidos        TEXT,
    edades            VARCHAR(150),
    domicilios        TEXT,
    acompanantes      TEXT,
    serv_maternidad   VARCHAR(100),
    acc_transito      VARCHAR(100),
    acc_trabajo       VARCHAR(100),
    otros             TEXT,
    hosp_modular      VARCHAR(150),
    hosp_privado      VARCHAR(150),
    hosp_igss         VARCHAR(150),
    otro_traslado     VARCHAR(150)
);

CREATE TABLE detalle_incendio (
    emergencia_id        INTEGER PRIMARY KEY REFERENCES emergencias(id) ON DELETE CASCADE,
    prop_propietario     VARCHAR(150),
    sitio_inicio         TEXT,
    causas               TEXT,
    valor_inmueble       NUMERIC(12,2),
    perdidas_inmueble    NUMERIC(12,2),
    aseguradora_inmueble VARCHAR(150),
    veh_propietario      VARCHAR(150),
    conductor            VARCHAR(150),
    descripcion_tipo     VARCHAR(100),
    marca                VARCHAR(80),
    modelo               VARCHAR(80),
    placas               VARCHAR(30),
    valor_vehiculo       NUMERIC(12,2),
    perdidas_vehiculo    NUMERIC(12,2),
    aseguradora_vehiculo VARCHAR(150)
);

CREATE TABLE detalle_rescate (
    emergencia_id      INTEGER PRIMARY KEY REFERENCES emergencias(id) ON DELETE CASCADE,
    nombres_rescatados TEXT,
    edades             VARCHAR(150),
    domicilios         TEXT,
    traslado_a         VARCHAR(200),
    forma_aviso        VARCHAR(100)
);

CREATE TABLE detalle_varios (
    emergencia_id  INTEGER PRIMARY KEY REFERENCES emergencias(id) ON DELETE CASCADE,
    clase_servicio VARCHAR(200)
);

CREATE TABLE detalle_agua (
    emergencia_id           INTEGER PRIMARY KEY REFERENCES emergencias(id) ON DELETE CASCADE,
    residencia              VARCHAR(200),
    nombre_establecimiento  VARCHAR(200),
    centro_asistencial      VARCHAR(200),
    colonia                 VARCHAR(150),
    nota                    TEXT,
    servicio_autorizado_por VARCHAR(150),
    galones_distribuidos    INTEGER,
    forma_distribucion      TEXT,
    donativo                NUMERIC(10,2),
    donativo_letras         VARCHAR(200)
);

-- ═══════════════════════════════════════════════════════════════
-- 4. INVENTARIO
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE insumos (
    id            SERIAL PRIMARY KEY,
    nombre        VARCHAR(200) NOT NULL,
    categoria     VARCHAR(30)  NOT NULL
                  CHECK (categoria IN ('prehospitalario','cafeteria','libreria','limpieza')),
    unidad_medida VARCHAR(40),
    stock_actual  INTEGER      NOT NULL DEFAULT 0,
    stock_minimo  INTEGER      NOT NULL DEFAULT 5,
    activo        BOOLEAN      NOT NULL DEFAULT TRUE,
    creado_en     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_insumo_categoria ON insumos(categoria);

CREATE TABLE movimientos_inventario (
    id                SERIAL PRIMARY KEY,
    insumo_id         INTEGER     NOT NULL REFERENCES insumos(id),
    tipo_movimiento   VARCHAR(10) NOT NULL CHECK (tipo_movimiento IN ('entrada','salida')),
    cantidad          INTEGER     NOT NULL CHECK (cantidad > 0),
    numero_lote       VARCHAR(80),
    fecha_vencimiento DATE,
    emergencia_id     INTEGER     REFERENCES emergencias(id),
    fecha_movimiento  DATE        NOT NULL DEFAULT CURRENT_DATE,
    observaciones     TEXT,
    usuario_id        INTEGER     NOT NULL REFERENCES usuarios(id),
    creado_en         TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT salida_requiere_servicio
        CHECK (tipo_movimiento = 'entrada' OR emergencia_id IS NOT NULL)
);

CREATE INDEX idx_mov_fecha  ON movimientos_inventario(fecha_movimiento);
CREATE INDEX idx_mov_insumo ON movimientos_inventario(insumo_id);
CREATE INDEX idx_mov_tipo   ON movimientos_inventario(tipo_movimiento);

-- ═══════════════════════════════════════════════════════════════
-- 5. CATÁLOGOS DE PERSONAL Y UNIDADES (para llenar las boletas)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS personal (
    id              SERIAL PRIMARY KEY,
    nombre_completo VARCHAR(150) NOT NULL,
    cargo           VARCHAR(80),
    creado_en       TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS personal_nombre_unico
    ON personal (LOWER(nombre_completo));

CREATE TABLE IF NOT EXISTS unidades (
    id          SERIAL PRIMARY KEY,
    codigo      VARCHAR(50) NOT NULL,
    descripcion VARCHAR(100),
    piloto_id   INTEGER REFERENCES personal(id) ON DELETE SET NULL,
    creado_en   TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS unidades_codigo_unico
    ON unidades (LOWER(codigo));

-- ═══════════════════════════════════════════════════════════════
-- 6. DATOS INICIALES: USUARIOS
-- Contraseñas de prueba: admin123 y operativo123 (cámbielas en producción)
-- ═══════════════════════════════════════════════════════════════
INSERT INTO usuarios (usuario, password_hash, nombre_completo, rol) VALUES
('admin',     crypt('admin123',     gen_salt('bf', 10)), 'Administrador del Sistema', 'administrador'),
('operativo', crypt('operativo123', gen_salt('bf', 10)), 'Personal Operativo',        'operativo');

-- ═══════════════════════════════════════════════════════════════
-- 7. DATOS INICIALES: INSUMOS
-- ═══════════════════════════════════════════════════════════════
-- PREHOSPITALARIOS (33)
INSERT INTO insumos (nombre, categoria, unidad_medida, stock_minimo) VALUES
('Batas hospitalarias',                  'prehospitalario', 'paquete de 10', 3),
('Venoset',                              'prehospitalario', 'unidad',        10),
('Compresa quirúrgica 12"x12"',          'prehospitalario', 'unidad',        10),
('Esparadrapo',                          'prehospitalario', 'unidad',        5),
('Venda gasa 4x10 Prosan',               'prehospitalario', 'unidad',        15),
('Venda gasa 4x10 absorbente',           'prehospitalario', 'unidad',        15),
('Venda gasa 6x10 Prosan',               'prehospitalario', 'unidad',        15),
('Bolsa de solución salina',             'prehospitalario', 'unidad',        10),
('Bolsa de solución Hartman',            'prehospitalario', 'unidad',        10),
('Galón de clorhexidina 5%',             'prehospitalario', 'galón',         2),
('Glucómetro',                           'prehospitalario', 'unidad',        1),
('Estetoscopio',                         'prehospitalario', 'unidad',        1),
('Esfigmomanómetro',                     'prehospitalario', 'unidad',        1),
('Clorhexidina 5% gluconato 5 litros',   'prehospitalario', 'bote',          2),
('Clorhexidina 5% galón gluconato',      'prehospitalario', 'galón',         2),
('Catéter #20',                          'prehospitalario', 'unidad',        10),
('Jeringa safety',                       'prehospitalario', 'caja',          3),
('Solución Hartmann 500ml',              'prehospitalario', 'bote',          10),
('Guantes Wolf talla S',                 'prehospitalario', 'caja',          3),
('Guantes Wolf talla M',                 'prehospitalario', 'caja',          3),
('Guantes Wolf talla L',                 'prehospitalario', 'caja',          3),
('Guantes Wolf talla XL',                'prehospitalario', 'caja',          3),
('Agua oxigenada 480 ml',                'prehospitalario', 'unidad',        5),
('Agua oxigenada 960 ml',                'prehospitalario', 'unidad',        5),
('Microporous / Micropore',              'prehospitalario', 'rollito',       10),
('Algodón',                              'prehospitalario', 'rollo',         5),
('Venda elástica',                       'prehospitalario', 'unidad',        10),
('Traje overol blanco con logo',         'prehospitalario', 'unidad',        3),
('Traje overol zipper blanco',           'prehospitalario', 'unidad',        3),
('Traje overol zipper gris',             'prehospitalario', 'unidad',        3),
('Traje overol zipper beige',            'prehospitalario', 'unidad',        3),
('Silk tape',                            'prehospitalario', 'rollo',         5),
('Mascarilla KN95',                      'prehospitalario', 'unidad',        20);

-- CAFETERÍA (4)
INSERT INTO insumos (nombre, categoria, unidad_medida, stock_minimo) VALUES
('Frasco cremora mate 650 g',  'cafeteria', 'frasco', 2),
('Frasco café Incasa 250 g',   'cafeteria', 'frasco', 2),
('Nescafé clásico 120 g',      'cafeteria', 'frasco', 2),
('Bolsa de azúcar 1 lb',       'cafeteria', 'bolsa',  4);

-- LIBRERÍA (20)
INSERT INTO insumos (nombre, categoria, unidad_medida, stock_minimo) VALUES
('Bolsa manila oficio',                       'libreria', 'bolsa',  10),
('Cartapacio Ampo oficio',                    'libreria', 'unidad', 5),
('Cartapacio Ampo carta',                     'libreria', 'unidad', 5),
('Libro de actas de 400 hojas',               'libreria', 'unidad', 2),
('Resma papel tamaño carta',                  'libreria', 'resma',  3),
('Resma papel tamaño oficio',                 'libreria', 'resma',  3),
('Canon 190 negro',                           'libreria', 'unidad', 2),
('Canon 190 amarillo',                        'libreria', 'unidad', 1),
('Canon 190 magenta',                         'libreria', 'unidad', 1),
('Canon 190 cian',                            'libreria', 'unidad', 1),
('Resma hojas membretadas carta',             'libreria', 'resma',  2),
('Resma hojas membretadas oficio',            'libreria', 'resma',  2),
('Lapicero Bic color rojo',                   'libreria', 'unidad', 10),
('Lapicero Bic color negro',                  'libreria', 'unidad', 10),
('Lapicero Bic color azul',                   'libreria', 'unidad', 10),
('Caja de grapas barrilito C/0.47mm',         'libreria', 'caja',   2),
('Bote de tinta Stamp Ink 28ml negro',        'libreria', 'bote',   2),
('Folder manila tamaño oficio',               'libreria', 'unidad', 20),
('Protectores tamaño oficio',                 'libreria', 'unidad', 20),
('Sellador',                                  'libreria', 'unidad', 2);

-- LIMPIEZA (30)
INSERT INTO insumos (nombre, categoria, unidad_medida, stock_minimo) VALUES
('Toalla microfibra',                                   'limpieza', 'unidad', 5),
('Galón desinfectante',                                 'limpieza', 'galón',  2),
('Envase para pulir vehículo 8 oz Ebullient',           'limpieza', 'envase', 2),
('Envase para lustrar vehículo 32 oz cera Visol',       'limpieza', 'envase', 2),
('Jabón para trastos Klinpiax',                         'limpieza', 'unidad', 3),
('Limpia muebles Pledge',                               'limpieza', 'unidad', 2),
('Jabón gel galón Max',                                 'limpieza', 'galón',  2),
('Pastilla aromatizante para baño',                     'limpieza', 'unidad', 5),
('Cloro Magia Blanca galón',                            'limpieza', 'galón',  2),
('Cloro Magia Blanca 1 litro',                          'limpieza', 'unidad', 3),
('Cloro Bleach 1000 ml',                                'limpieza', 'unidad', 3),
('Galón cloro Max',                                     'limpieza', 'galón',  2),
('Bolsa detergente 2.7 k',                              'limpieza', 'bolsa',  2),
('Toalla para trapeador',                               'limpieza', 'unidad', 3),
('Aromatizante ambiental Glade',                        'limpieza', 'unidad', 3),
('Escobas',                                             'limpieza', 'unidad', 2),
('Galón shampoo Ultra Cera',                            'limpieza', 'galón',  2),
('Esponja lavatrastos Paishte',                         'limpieza', 'unidad', 5),
('Envase Ajax Power 600 gr',                            'limpieza', 'envase', 3),
('Pala para basura',                                    'limpieza', 'unidad', 2),
('Papel higiénico',                                     'limpieza', 'rollo',  20),
('Botes para basura',                                   'limpieza', 'unidad', 3),
('Bolsa para basura',                                   'limpieza', 'bolsa',  10),
('Envase para pulir Visol 320 g',                       'limpieza', 'envase', 2),
('Paño esponja Scotch',                                 'limpieza', 'unidad', 5),
('Toallas húmedas sanitizante Oxivir',                  'limpieza', 'bote',   3),
('Trapeador trenza Klintex',                            'limpieza', 'unidad', 2),
('Palos y bases para trapeador',                        'limpieza', 'unidad', 2),
('Limpia vidrios',                                      'limpieza', 'unidad', 3),
('Bolsa detergente Lariza',                             'limpieza', 'bolsa',  3);

-- ═══════════════════════════════════════════════════════════════
-- 8. VERIFICACIÓN
-- Debe mostrar: cafeteria 4, libreria 20, limpieza 30, prehospitalario 33
-- ═══════════════════════════════════════════════════════════════
SELECT categoria, COUNT(*) AS total FROM insumos GROUP BY categoria ORDER BY categoria;
SELECT usuario, rol, activo FROM usuarios;
