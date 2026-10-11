-- Admin Audit Log Table
-- Purpose: Track all administrative actions for security and compliance
-- Requirement 5.10: Record administrator identity and timestamp for all verification actions

CREATE TABLE IF NOT EXISTS admin_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    details JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin_id ON admin_audit_log(admin_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_timestamp ON admin_audit_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action ON admin_audit_log(action, timestamp DESC);

-- RLS Policies
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view all audit logs"
    ON admin_audit_log FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.user_type = 'admin'
        )
    );

-- Service role can insert audit logs (for Edge Functions)
CREATE POLICY "Service role can insert audit logs"
    ON admin_audit_log FOR INSERT
    TO service_role
    WITH CHECK (true);

-- Authenticated users can insert their own audit logs if they are admin
CREATE POLICY "Admins can insert audit logs"
    ON admin_audit_log FOR INSERT
    TO authenticated
    WITH CHECK (
        admin_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.user_type = 'admin'
        )
    );

COMMENT ON TABLE admin_audit_log IS 'Audit trail of all administrative actions including payment verifications, configuration changes, and system modifications';
COMMENT ON COLUMN admin_audit_log.admin_id IS 'UUID of the admin user who performed the action';
COMMENT ON COLUMN admin_audit_log.action IS 'Type of action performed (e.g., manual_payment_approved, manual_payment_rejected, update_timeout_config)';
COMMENT ON COLUMN admin_audit_log.details IS 'JSONB field containing action-specific details such as payment_id, old/new values, notes, etc.';
COMMENT ON COLUMN admin_audit_log.timestamp IS 'When the action was performed';
