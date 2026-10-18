-- Create manual verification queue table
-- Tracks manual payment submissions that need admin review

CREATE TABLE IF NOT EXISTS manual_verification_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_intent_id UUID REFERENCES payment_intents(id) ON DELETE CASCADE,
    mpesa_code TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    application_code TEXT,
    transaction_found BOOLEAN DEFAULT false,
    mpesa_transaction_id UUID,
    status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
    verified_by UUID REFERENCES profiles(id),
    verified_at TIMESTAMPTZ,
    rejection_reason TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_manual_verification_status ON manual_verification_queue(status) WHERE status = 'PENDING';
CREATE INDEX IF NOT EXISTS idx_manual_verification_created ON manual_verification_queue(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_manual_verification_mpesa_code ON manual_verification_queue(mpesa_code);
CREATE INDEX IF NOT EXISTS idx_manual_verification_application ON manual_verification_queue(application_code);

-- RLS policies
ALTER TABLE manual_verification_queue ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY manual_verification_service_role_all ON manual_verification_queue
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Admins can view all
CREATE POLICY manual_verification_admin_view ON manual_verification_queue
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN user_roles r ON p.role_id = r.id
            WHERE p.id = auth.uid()
            AND r.role_name IN ('admin', 'super_admin')
        )
    );

-- Admins can update
CREATE POLICY manual_verification_admin_update ON manual_verification_queue
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN user_roles r ON p.role_id = r.id
            WHERE p.id = auth.uid()
            AND r.role_name IN ('admin', 'super_admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            JOIN user_roles r ON p.role_id = r.id
            WHERE p.id = auth.uid()
            AND r.role_name IN ('admin', 'super_admin')
        )
    );

-- Comments
COMMENT ON TABLE manual_verification_queue IS 'Queue of manual payment submissions awaiting admin verification';
COMMENT ON COLUMN manual_verification_queue.transaction_found IS 'Whether the M-Pesa code was found in C2B transactions';
COMMENT ON COLUMN manual_verification_queue.status IS 'PENDING: awaiting review, APPROVED: verified and approved, REJECTED: fake or invalid';

-- Grant permissions
GRANT ALL ON manual_verification_queue TO service_role;
GRANT SELECT ON manual_verification_queue TO authenticated;
