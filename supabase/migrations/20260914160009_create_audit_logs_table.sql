-- Migration: Create Audit Logs Table
-- Description: Creates audit logs table for tracking all system changes
-- Requirements: 2.25, 24.24

-- ============================================================================
-- Audit Logs Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id),
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE audit_logs IS 'Audit trail of all system actions and data changes';
COMMENT ON COLUMN audit_logs.action IS 'Action performed (e.g., CREATE, UPDATE, DELETE, LOGIN)';
COMMENT ON COLUMN audit_logs.entity_type IS 'Type of entity affected (e.g., vendor, stock_request, payment)';
COMMENT ON COLUMN audit_logs.entity_id IS 'ID of the affected entity';
COMMENT ON COLUMN audit_logs.old_values IS 'JSON representation of values before change';
COMMENT ON COLUMN audit_logs.new_values IS 'JSON representation of values after change';
COMMENT ON COLUMN audit_logs.ip_address IS 'IP address of user performing action';
COMMENT ON COLUMN audit_logs.user_agent IS 'User agent string of client';