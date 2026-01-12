-- Multi-Application & Multi-Tenant Schema Migration
-- Run this after deploying to Supabase

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  settings JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_organizations_slug ON organizations(slug);

-- Users table (synced with Supabase Auth)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY, -- Matches auth.users.id
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'member' NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_users_organization_id ON users(organization_id);
CREATE INDEX idx_users_email ON users(email);

-- Application configurations
CREATE TABLE IF NOT EXISTS application_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  application_name TEXT NOT NULL,
  application_url TEXT NOT NULL,
  url_pattern TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT TRUE,
  selector_config JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, application_name)
);

CREATE INDEX idx_application_configs_org_enabled ON application_configs(organization_id, is_enabled);

-- Update payment_sessions table
ALTER TABLE payment_sessions
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS application_config_id UUID REFERENCES application_configs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS application_name TEXT,
  ADD COLUMN IF NOT EXISTS source_url TEXT;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_payment_sessions_organization_id ON payment_sessions(organization_id);
CREATE INDEX IF NOT EXISTS idx_payment_sessions_org_app ON payment_sessions(organization_id, application_name);
CREATE INDEX IF NOT EXISTS idx_payment_sessions_user_id ON payment_sessions(user_id);

-- Update audit_logs table
ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);

-- Migration note: Existing data migration
-- Run these commands to migrate existing data:
--
-- 1. Create default organization for existing data:
-- INSERT INTO organizations (id, name, slug, created_at)
-- VALUES ('00000000-0000-0000-0000-000000000001', 'Legacy Organization', 'legacy', NOW())
-- ON CONFLICT (slug) DO NOTHING;
--
-- 2. Update existing payment sessions:
-- UPDATE payment_sessions
-- SET organization_id = '00000000-0000-0000-0000-000000000001',
--     application_name = 'Practice Panther'
-- WHERE organization_id IS NULL;


