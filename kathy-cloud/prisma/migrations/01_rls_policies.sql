-- Row Level Security (RLS) Policies for Multi-Tenant Security
-- Run this in Supabase SQL Editor after schema migration

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE application_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- ORGANIZATIONS POLICIES
-- ============================================================================

-- Users can view their own organization
CREATE POLICY "Users can view their organization"
  ON organizations FOR SELECT
  USING (
    id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()::text
    )
  );

-- Only admins can update their organization
CREATE POLICY "Admins can update their organization"
  ON organizations FOR UPDATE
  USING (
    id IN (
      SELECT organization_id FROM users 
      WHERE id = auth.uid()::text AND role = 'admin'
    )
  );

-- ============================================================================
-- USERS POLICIES
-- ============================================================================

-- Users can view members of their own organization
CREATE POLICY "Users can view org members"
  ON users FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()::text
    )
  );

-- Users can view their own record
CREATE POLICY "Users can view themselves"
  ON users FOR SELECT
  USING (id = auth.uid()::text);

-- Admins can insert new users to their organization
CREATE POLICY "Admins can create org users"
  ON users FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users 
      WHERE id = auth.uid()::text AND role = 'admin'
    )
  );

-- Admins can update users in their organization
CREATE POLICY "Admins can update org users"
  ON users FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM users 
      WHERE id = auth.uid()::text AND role = 'admin'
    )
  );

-- ============================================================================
-- APPLICATION CONFIGS POLICIES
-- ============================================================================

-- Users can view their organization's application configs
CREATE POLICY "Users can view org app configs"
  ON application_configs FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()::text
    )
  );

-- Only admins can manage application configs
CREATE POLICY "Admins can manage app configs"
  ON application_configs FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM users 
      WHERE id = auth.uid()::text AND role = 'admin'
    )
  );

-- ============================================================================
-- PAYMENT SESSIONS POLICIES
-- ============================================================================

-- Users can view their organization's payment sessions
CREATE POLICY "Users can view org payments"
  ON payment_sessions FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()::text
    )
  );

-- Users can create payment sessions for their organization
CREATE POLICY "Users can create org payments"
  ON payment_sessions FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()::text
    )
  );

-- Users can update their organization's payment sessions
CREATE POLICY "Users can update org payments"
  ON payment_sessions FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()::text
    )
  );

-- ============================================================================
-- AUDIT LOGS POLICIES
-- ============================================================================

-- Users can view audit logs for their organization's payments
CREATE POLICY "Users can view org audit logs"
  ON audit_logs FOR SELECT
  USING (
    payment_session_id IN (
      SELECT id FROM payment_sessions 
      WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()::text
      )
    )
  );

-- System can insert audit logs (via service role key)
CREATE POLICY "System can create audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get user's organization ID
CREATE OR REPLACE FUNCTION get_user_organization_id()
RETURNS TEXT AS $$
  SELECT organization_id FROM users WHERE id = auth.uid()::text
$$ LANGUAGE SQL SECURITY DEFINER;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_user_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid()::text AND role = 'admin'
  )
$$ LANGUAGE SQL SECURITY DEFINER;

-- ============================================================================
-- INDEXES FOR RLS PERFORMANCE
-- ============================================================================

-- These indexes improve RLS policy performance
CREATE INDEX IF NOT EXISTS idx_users_auth_uid ON users(id) WHERE id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_org_role ON users(organization_id, role);
CREATE INDEX IF NOT EXISTS idx_payment_sessions_org_lookup ON payment_sessions(organization_id) WHERE organization_id IS NOT NULL;

-- ============================================================================
-- NOTES
-- ============================================================================

-- To test RLS policies:
-- 1. Create test organizations and users
-- 2. Use Supabase auth to sign in as different users
-- 3. Query tables and verify users only see their organization's data
--
-- To bypass RLS for admin operations, use service_role key in your API

