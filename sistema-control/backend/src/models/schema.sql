-- IAGAMI - Sistema de Control y Seguimiento de Actividades
-- PostgreSQL Schema

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────
-- Table: users
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name          VARCHAR(255) NOT NULL,
  role          VARCHAR(50)  NOT NULL DEFAULT 'admin',
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- Table: forms  (optional form registry)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS forms (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  type        VARCHAR(50)  NOT NULL CHECK (type IN ('reporte_diario', 'planificacion_semanal')),
  title       VARCHAR(255) NOT NULL,
  description TEXT,
  is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
  share_token UUID         NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  created_by  INT          REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- Table: form_submissions
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS form_submissions (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id      UUID         REFERENCES forms(id) ON DELETE SET NULL,
  form_type    VARCHAR(50)  NOT NULL,
  institucion  VARCHAR(255),
  responsable  VARCHAR(255) NOT NULL,
  fecha        DATE,
  semana       VARCHAR(100),
  hora_inicio  TIME,
  hora_fin     TIME,
  observaciones TEXT,
  estado       VARCHAR(50)  NOT NULL DEFAULT 'enviado'
                            CHECK (estado IN ('enviado', 'revisado', 'aprobado', 'rechazado')),
  notas_admin  TEXT,
  submitted_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  reviewed_at  TIMESTAMPTZ,
  reviewed_by  INT          REFERENCES users(id) ON DELETE SET NULL
);

-- ─────────────────────────────────────────────
-- Table: activities
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS activities (
  id            SERIAL  PRIMARY KEY,
  submission_id UUID    NOT NULL REFERENCES form_submissions(id) ON DELETE CASCADE,
  descripcion   TEXT    NOT NULL,
  dia           VARCHAR(50),
  hora          TIME,
  completada    BOOLEAN NOT NULL DEFAULT FALSE,
  orden         INT     NOT NULL DEFAULT 0
);

-- ─────────────────────────────────────────────
-- Table: evidences
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS evidences (
  id            SERIAL       PRIMARY KEY,
  submission_id UUID         NOT NULL REFERENCES form_submissions(id) ON DELETE CASCADE,
  filename      VARCHAR(255),
  original_name VARCHAR(255),
  mimetype      VARCHAR(100),
  size_bytes    INT,
  uploaded_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- Table: audit_logs
-- Auditoría server-side de eventos de seguridad
-- (login, logout, denegaciones de permiso, etc).
-- Nunca debe ser editable/borrable vía API pública.
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id          BIGSERIAL    PRIMARY KEY,
  action      VARCHAR(50)  NOT NULL,
  user_id     INT          REFERENCES users(id) ON DELETE SET NULL,
  email       VARCHAR(255),
  role        VARCHAR(50),
  ip          VARCHAR(64),
  user_agent  VARCHAR(512),
  detail      VARCHAR(500),
  severity    VARCHAR(20)  NOT NULL DEFAULT 'INFO',
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')
);

-- Migration: add severity if deploying on an existing database
ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS severity VARCHAR(20) NOT NULL DEFAULT 'INFO';

CREATE INDEX IF NOT EXISTS idx_audit_logs_action     ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity   ON audit_logs(severity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_created ON audit_logs(action, created_at DESC);

-- ─────────────────────────────────────────────────────────────────────────────
-- Blindaje "append-only" de audit_logs (WORM real a nivel de privilegios)
--
-- Un trigger NO logra esto: el dueño de la tabla siempre puede deshabilitar
-- triggers o usar session_replication_role. La protección real es revocar
-- UPDATE/DELETE al rol que usa la aplicación, dejándole solo INSERT/SELECT,
-- y dejar un rol de auditoría aparte solo con SELECT.
--
-- EJECUTAR UNA SOLA VEZ, como superusuario/owner de la base de datos
-- (no como parte del arranque normal de la app):
--
--   CREATE ROLE app_writer LOGIN PASSWORD '<contraseña-fuerte>';
--   GRANT CONNECT ON DATABASE iagami_forms TO app_writer;
--   GRANT USAGE ON SCHEMA public TO app_writer;
--   GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_writer;
--   -- Igualar privilegios futuros (nuevas tablas) a los anteriores...
--   ALTER DEFAULT PRIVILEGES IN SCHEMA public
--     GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_writer;
--   -- ...y luego retirar específicamente UPDATE/DELETE solo sobre audit_logs:
--   REVOKE UPDATE, DELETE ON TABLE audit_logs FROM app_writer;
--
--   CREATE ROLE audit_reader LOGIN PASSWORD '<contraseña-fuerte>';
--   GRANT CONNECT ON DATABASE iagami_forms TO audit_reader;
--   GRANT USAGE ON SCHEMA public TO audit_reader;
--   GRANT SELECT ON audit_logs TO audit_reader;
--
-- Después: actualizar DATABASE_URL del backend para conectar como `app_writer`
-- (no como el owner/superuser). Así, aunque se inyecte código en la app,
-- el proceso no tendrá privilegio de UPDATE/DELETE sobre audit_logs —
-- la restricción está en PostgreSQL, no en el código de la aplicación.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_submissions_form_type   ON form_submissions(form_type);
CREATE INDEX IF NOT EXISTS idx_submissions_estado      ON form_submissions(estado);
CREATE INDEX IF NOT EXISTS idx_submissions_submitted_at ON form_submissions(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_submission   ON activities(submission_id);
CREATE INDEX IF NOT EXISTS idx_evidences_submission    ON evidences(submission_id);

-- ─────────────────────────────────────────────
-- Default admin user
-- password: Admin2026!  (bcrypt cost 10)
-- ─────────────────────────────────────────────
INSERT INTO users (email, password_hash, name, role)
VALUES (
  'admin@iagami.gob.ve',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'Administrador IAGAMI',
  'admin'
)
ON CONFLICT (email) DO UPDATE
  SET password_hash = EXCLUDED.password_hash,
      name          = EXCLUDED.name,
      role          = EXCLUDED.role;
