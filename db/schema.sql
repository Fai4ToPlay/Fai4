-- PostgreSQL schema for full Excel replacement
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE user_role AS ENUM ('admin', 'user');
CREATE TYPE act_type AS ENUM (
  'act_detected',
  'act_detected_3d',
  'act_fixed',
  'equipment_defect',
  'equipment_defect_3d',
  'commercial_offer'
);
CREATE TYPE act_status AS ENUM ('draft', 'in_progress', 'done', 'archived');

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role user_role NOT NULL DEFAULT 'user',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE contractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  num SERIAL UNIQUE,
  org_name VARCHAR(255) NOT NULL,
  contact VARCHAR(255),
  phone VARCHAR(64),
  email VARCHAR(255),
  address TEXT,
  inn VARCHAR(32),
  kpp VARCHAR(32),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE acts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  act_number VARCHAR(100) NOT NULL,
  act_type act_type NOT NULL,
  status act_status NOT NULL DEFAULT 'draft',
  title TEXT NOT NULL,
  object_name TEXT,
  object_address TEXT,
  act_date DATE NOT NULL,
  due_date DATE,
  representative_position TEXT,
  representative_last_name TEXT,
  commission_position TEXT,
  commission_last_name TEXT,
  contractor_id UUID REFERENCES contractors(id) ON DELETE SET NULL,
  source_act_id UUID REFERENCES acts(id) ON DELETE SET NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  form_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (act_number, act_type)
);

CREATE TABLE defects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  act_id UUID NOT NULL REFERENCES acts(id) ON DELETE CASCADE,
  seq_no INTEGER NOT NULL,
  description TEXT NOT NULL,
  location TEXT,
  responsible TEXT,
  due_date DATE,
  is_fixed BOOLEAN NOT NULL DEFAULT FALSE,
  fixed_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (act_id, seq_no)
);

CREATE TABLE commercial_offer_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  act_id UUID NOT NULL REFERENCES acts(id) ON DELETE CASCADE,
  seq_no INTEGER NOT NULL,
  name TEXT NOT NULL,
  qty NUMERIC(12,2) NOT NULL DEFAULT 0,
  price NUMERIC(14,2) NOT NULL DEFAULT 0,
  amount NUMERIC(14,2) GENERATED ALWAYS AS (qty * price) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (act_id, seq_no)
);

CREATE TABLE equipment_defects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  act_id UUID NOT NULL REFERENCES acts(id) ON DELETE CASCADE,
  equipment_description TEXT NOT NULL,
  defect_description TEXT NOT NULL,
  responsible TEXT,
  defect_date DATE NOT NULL,
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE excel_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  sheets_meta JSONB NOT NULL DEFAULT '[]'::jsonb,
  field_map JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID,
  action VARCHAR(100) NOT NULL,
  diff JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_acts_type_status_date ON acts (act_type, status, act_date DESC);
CREATE INDEX idx_acts_contractor ON acts (contractor_id);
CREATE INDEX idx_defects_act ON defects (act_id);
CREATE INDEX idx_audit_entity ON audit_logs (entity_type, entity_id, created_at DESC);

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_contractors_updated BEFORE UPDATE ON contractors
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_acts_updated BEFORE UPDATE ON acts
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_defects_updated BEFORE UPDATE ON defects
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_co_items_updated BEFORE UPDATE ON commercial_offer_items
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_equipment_defects_updated BEFORE UPDATE ON equipment_defects
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_excel_templates_updated BEFORE UPDATE ON excel_templates
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
