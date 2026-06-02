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
