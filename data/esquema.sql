-- ============================================================
-- ESQUEMA DE BASE DE DATOS — Fundación Red Con Ciencia (V10)
-- Referencia oficial de las tablas que usa el sitio.
-- (SQLite: el servidor crea estas tablas automáticamente al
--  arrancar; este archivo es para documentar, revisar o migrar.)
-- ============================================================

-- Publicaciones del sitio (noticias, eventos, convocatorias, talleres)
CREATE TABLE IF NOT EXISTS noticias (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha      TEXT    NOT NULL,                  -- AAAA-MM-DD
  etiqueta   TEXT    NOT NULL DEFAULT 'Novedad',
  titulo     TEXT    NOT NULL,
  texto      TEXT    NOT NULL,                  -- resumen corto
  cuerpo     TEXT    NOT NULL DEFAULT '',       -- contenido enriquecido (HTML saneado)
  categoria  TEXT    NOT NULL DEFAULT 'Noticia',-- Noticia|Evento|Convocatoria|Taller
  estado     TEXT    NOT NULL DEFAULT 'publicada', -- publicada|borrador
  imagen     TEXT,                              -- /uploads/imagen-xxxx.jpg
  creada_en  TEXT    NOT NULL DEFAULT (datetime('now')),
  editada_en TEXT
);

-- Bandeja de mensajes del formulario «Escríbenos»
CREATE TABLE IF NOT EXISTS mensajes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre      TEXT    NOT NULL,
  correo      TEXT,
  motivo      TEXT,
  mensaje     TEXT    NOT NULL,
  ip          TEXT,
  leido       INTEGER NOT NULL DEFAULT 0,
  recibido_en TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Configuración clave/valor: hash de la clave del panel, correo, etc.
CREATE TABLE IF NOT EXISTS ajustes (
  clave          TEXT PRIMARY KEY,
  valor          TEXT NOT NULL,
  actualizado_en TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Sesiones del panel (solo el SHA-256 del token, nunca el token)
CREATE TABLE IF NOT EXISTS sesiones (
  id        TEXT    PRIMARY KEY,
  csrf      TEXT    NOT NULL,
  ip        TEXT,
  agente    TEXT,
  creada_en TEXT    NOT NULL DEFAULT (datetime('now')),
  expira_en INTEGER NOT NULL
);

-- Intentos de inicio de sesión (bloqueo anti fuerza bruta)
CREATE TABLE IF NOT EXISTS intentos_login (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip TEXT NOT NULL,
  ok INTEGER NOT NULL,
  en TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_intentos_ip_en ON intentos_login (ip, en);

-- Bitácora de seguridad y actividad del panel
CREATE TABLE IF NOT EXISTS registro_seguridad (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo    TEXT NOT NULL,
  detalle TEXT,
  ip      TEXT,
  en      TEXT NOT NULL DEFAULT (datetime('now'))
);
