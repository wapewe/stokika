-- ROLLBACK Migration: Restore manual_verification_queue table and related objects
-- Date: 2026-10-16
-- Purpose: Rollback for 20261016200000_drop_manual_verification_queue.sql
-- WARNING: This rollback recreates the database structure only. 
--          Frontend code and Edge Function must be restored separately.

-- ============================================================================
-- RECREATE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS manual_verification_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_intent_id UUID REFERENCES payment_intents(id) ON DELETE SET NULL,
    mpesa_code TEXT NOT NULL,
    phone_number TEXT,
    amount NUMERIC(10,2),
    application_code TEXT,
    national_id TEXT,
    transaction_found BOOLEAN DEFAULT false,
    mpesa_transaction_id UUID,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    admin_notes TEXT,
    verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- RECREATE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_manual_verification_status ON manual_verification_queue(status);
CREATE INDEX IF NOT EXISTS idx_manual_verification_created ON manual_verification_queue(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_manual_verification_mpesa_code ON manual_verification_queue(mpesa_code);
CREATE INDEX IF NOT EXISTS idx_manual_verification_application ON manual_verification_queue(application_code);

-- Unique constraint: M-Pesa code can only be used once for active verifications
CREATE UNIQUE INDEX IF NOT EXISTS manual_verification_mpesa_code_active_unique 
ON manual_verification_queue(mpesa_code) 
WHERE status IN ('PENDING', 'APPROVED');

-- ============================================================================
-- RECREATE RLS POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE manual_verification_queue ENABLE ROW LEVEL SECURITY;

-- Service role has full access
CREATE POLICY manual_verification_service_role_all ON manual_verification_queue
    FOR ALL 
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Admins can view all manual verifications
CREATE POLICY manual_verification_admin_view ON manual_verification_queue
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Admins can update manual verifications (approve/reject)
CREATE POLICY manual_verification_admin_update ON manual_verification_queue
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- ============================================================================
-- RECREATE HELPER FUNCTIONS
-- ============================================================================

-- Function to check for duplicate national IDs across all payment tables
CREATE OR REPLACE FUNCTION check_duplicate_national_id(p_national_id TEXT)
RETURNS TABLE (
    found BOOLEAN,
    table_name TEXT,
    user_type TEXT,
    application_code TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check field_agents table
    RETURN QUERY
    SELECT 
        TRUE as found,
        'field_agents'::TEXT as table_name,
        'field_agent'::TEXT as user_type,
        fa.application_code
    FROM field_agents fa
    WHERE fa.national_id = p_national_id
    LIMIT 1;
    
    IF FOUND THEN RETURN; END IF;
    
    -- Check supervisors table
    RETURN QUERY
    SELECT 
        TRUE as found,
        'supervisors'::TEXT as table_name,
        'supervisor'::TEXT as user_type,
        s.application_code
    FROM supervisors s
    WHERE s.national_id = p_national_id
    LIMIT 1;
    
    IF FOUND THEN RETURN; END IF;
    
    -- Check vendors table
    RETURN QUERY
    SELECT 
        TRUE as found,
        'vendors'::TEXT as table_name,
        'vendor'::TEXT as user_type,
        v.registration_code as application_code
    FROM vendors v
    WHERE v.national_id = p_national_id
    LIMIT 1;
    
    IF FOUND THEN RETURN; END IF;
    
    -- No duplicates found
    RETURN QUERY
    SELECT FALSE, NULL::TEXT, NULL::TEXT, NULL::TEXT;
END;
$$;

-- Function to check for duplicate phone numbers
CREATE OR REPLACE FUNCTION check_duplicate_phone(p_phone TEXT)
RETURNS TABLE (
    found BOOLEAN,
    table_name TEXT,
    user_type TEXT,
    application_code TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check field_agents table
    RETURN QUERY
    SELECT 
        TRUE as found,
        'field_agents'::TEXT as table_name,
        'field_agent'::TEXT as user_type,
        fa.application_code
    FROM field_agents fa
    WHERE fa.phone = p_phone
    LIMIT 1;
    
    IF FOUND THEN RETURN; END IF;
    
    -- Check supervisors table
    RETURN QUERY
    SELECT 
        TRUE as found,
        'supervisors'::TEXT as table_name,
        'supervisor'::TEXT as user_type,
        s.application_code
    FROM supervisors s
    WHERE s.phone = p_phone
    LIMIT 1;
    
    IF FOUND THEN RETURN; END IF;
    
    -- Check vendors table  
    RETURN QUERY
    SELECT 
        TRUE as found,
        'vendors'::TEXT as table_name,
        'vendor'::TEXT as user_type,
        v.registration_code as application_code
    FROM vendors v
    WHERE v.contact_phone = p_phone
    LIMIT 1;
    
    IF FOUND THEN RETURN; END IF;
    
    -- No duplicates found
    RETURN QUERY
    SELECT FALSE, NULL::TEXT, NULL::TEXT, NULL::TEXT;
END;
$$;

-- Function to check for duplicate M-Pesa codes in manual verification queue
CREATE OR REPLACE FUNCTION check_duplicate_mpesa_code(p_mpesa_code TEXT)
RETURNS TABLE (
    found BOOLEAN,
    status TEXT,
    application_code TEXT,
    created_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        TRUE as found,
        mvq.status,
        mvq.application_code,
        mvq.created_at
    FROM manual_verification_queue mvq
    WHERE mvq.mpesa_code = p_mpesa_code
    AND mvq.status IN ('PENDING', 'APPROVED')
    LIMIT 1;
    
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT FALSE, NULL::TEXT, NULL::TEXT, NULL::TIMESTAMPTZ;
    END IF;
END;
$$;

-- ============================================================================
-- RESTORE ALERT THRESHOLD
-- ============================================================================

-- Re-add manual verification alert type to payment_alert_thresholds
-- (if the table exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'payment_alert_thresholds'
    ) THEN
        INSERT INTO payment_alert_thresholds (alert_type, threshold_value, description)
        VALUES (
            'manual_verification_queue_length',
            10,
            'Alert when manual verification queue exceeds 10 pending items'
        )
        ON CONFLICT (alert_type) DO NOTHING;
    END IF;
END $$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'manual_verification_queue'
    ) THEN
        RAISE EXCEPTION 'Failed to recreate manual_verification_queue table';
    END IF;
    
    RAISE NOTICE 'Manual verification queue rollback completed successfully';
    RAISE WARNING 'Frontend code and Edge Function must be restored separately for full rollback';
END $$;

-- ============================================================================
-- ROLLBACK NOTES
-- ============================================================================

-- This rollback recreates the database structure for manual payment verification.
-- 
-- TO COMPLETE ROLLBACK:
-- 1. Restore supabase/functions/verify-manual-payment/ directory
-- 2. Restore frontend files deleted in the manual payment removal commit
-- 3. Deploy Edge Function: supabase functions deploy verify-manual-payment
-- 4. Test manual payment flow end-to-end
--
-- WITHOUT these additional steps, the manual payment feature will not work.
