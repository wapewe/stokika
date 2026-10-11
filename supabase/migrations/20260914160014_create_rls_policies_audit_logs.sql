-- Migration: Create RLS Policies for Audit Logs
-- Description: Implements Row Level Security policies for audit_logs table
-- Requirements: 3.1-3.5, 25.1-25.8

-- ============================================================================
-- Enable RLS on Audit Logs Table
-- ============================================================================

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Audit Logs Table Policies
-- ============================================================================

-- Users can view their own audit logs
CREATE POLICY "Users can view own audit logs"
ON audit_logs FOR SELECT
USING (user_id = auth.uid());

-- Supervisors can view logs of their field agents
CREATE POLICY "Supervisors can view field agent logs"
ON audit_logs FOR SELECT
USING (
    has_role(ARRAY['supervisor'])
    AND EXISTS (
        SELECT 1 FROM profiles p
        JOIN user_roles ur ON p.role_id = ur.id
        WHERE p.id = audit_logs.user_id
        AND ur.role_name = 'field_agent'
    )
);

-- Operations and admin can view all audit logs
CREATE POLICY "Admin can view all audit logs"
ON audit_logs FOR SELECT
USING (has_role(ARRAY['operations', 'admin', 'super_admin']));

-- Only system can insert audit logs (no direct user inserts)
CREATE POLICY "System can insert audit logs"
ON audit_logs FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- No updates or deletes allowed on audit logs (immutable)
-- (No policies needed - RLS will deny by default)

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON POLICY "Users can view own audit logs" ON audit_logs IS 'Users can view audit logs of their own actions';
COMMENT ON POLICY "Admin can view all audit logs" ON audit_logs IS 'Admin and operations staff can view all audit logs';
COMMENT ON TABLE audit_logs IS 'Audit logs are immutable - no updates or deletes allowed';