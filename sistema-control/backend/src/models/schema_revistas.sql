-- Run this after the main schema.sql
-- Table: revistas
CREATE TABLE IF NOT EXISTS revistas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo VARCHAR(255) NOT NULL,
  descripcion TEXT,
  numero_edicion VARCHAR(50) NOT NULL,
  categoria VARCHAR(100) DEFAULT 'General',
  fecha_publicacion DATE NOT NULL,
  portada_url VARCHAR(500),
  pdf_url VARCHAR(500),
  visualizaciones INTEGER DEFAULT 0,
  descargas INTEGER DEFAULT 0,
  destacada BOOLEAN DEFAULT false,
  estado VARCHAR(20) DEFAULT 'borrador' CHECK (estado IN ('borrador','publicada')),
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_revistas_estado ON revistas(estado);
CREATE INDEX IF NOT EXISTS idx_revistas_destacada ON revistas(destacada);
CREATE INDEX IF NOT EXISTS idx_revistas_fecha ON revistas(fecha_publicacion DESC);
CREATE INDEX IF NOT EXISTS idx_revistas_categoria ON revistas(categoria);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER revistas_updated_at
  BEFORE UPDATE ON revistas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
