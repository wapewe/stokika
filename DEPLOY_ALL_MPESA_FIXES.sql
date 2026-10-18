-- ============================================================================
-- COMPLETE M-PESA FIX DEPLOYMENT SCRIPT
-- ============================================================================
-- Run this entire script in Supabase Dashboard → SQL Editor
-- This fixes: Rate limiting, permissions, OAuth timeouts, security holes, duplicates
-- Version: 2026-10-16
-- ============================================================================

-- Migration 1/7: Schedule Rate Limit Cleanup
-- ============================================================================
-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule rate limit cleanup every 10 minutes
SELECT cron.schedule(
    'cleanup-rate-limits',
    '*/10 * * * *',  -- Every 10 minutes
    'SELECT cleanup_old_rate_limits();'
);

COMMENT ON FUNCTION cleanup_old_rate_limits IS 'Scheduled cleanup job: Removes rate_limits entries older than 2 hours to prevent permanent lockout';


-- Migration 2/7: Fix Kit Tables Service Role Permissions
-- ============================================================================
GRANT ALL ON stokika_kit_payments TO service_role;
GRANT ALL ON stokika_kit_config TO service_role;

ALTER TABLE stokika_kit_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE stokika_kit_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS stokika_kit_payments_service_role_all ON stokika_kit_payments;
CREATE POLICY stokika_kit_payments_service_role_all ON stokika_kit_payments
    FOR ALL 
    TO service_role
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS stokika_kit_config_service_role_all ON stokika_kit_config;
CREATE POLICY stokika_kit_config_service_role_all ON stokika_kit_config
    FOR ALL 
    TO service_role
    USING (true)
    WITH CHECK (true);


-- Migration 3/7: Fix Payment Events Service Role Permissions
-- ============================================================================
GRANT ALL ON payment_events TO service_role;
ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payment_events_service_role_all ON payment_events;
CREATE POLICY payment_events_service_role_all ON payment_events
    FOR ALL 
    TO service_role
    USING (true)
    WITH CHECK (true);


-- Migration 4/7: Create Timeout Detection RPC Function
-- ============================================================================
CREATE OR REPLACE FUNCTION detect_timeout_payments_query()
RETURNS TABLE (
    id UUID,
    application_code TEXT,
    phone_number TEXT,
    checkout_request_id TEXT,
    kit_amount NUMERIC,
    created_at TIMESTAMPTZ,
    payment_status TEXT,
    flow_type VARCHAR(50),
    timeout_duration INTEGER,
    elapsed_seconds NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        kp.id,
        kp.application_code,
        kp.phone_number,
        kp.checkout_request_id,
        kp.kit_amount,
        kp.created_at,
        kp.payment_status,
        kp.flow_type,
        COALESCE(tc.timeout_duration, 90) AS timeout_duration,
        EXTRACT(EPOCH FROM (NOW() - kp.created_at)) AS elapsed_seconds
    FROM stokika_kit_payments kp
    LEFT JOIN payment_timeout_config tc ON kp.flow_type = tc.flow_type
    WHERE kp.payment_status = 'pending'
      AND kp.checkout_request_id IS NOT NULL
      AND EXTRACT(EPOCH FROM (NOW() - kp.created_at)) > COALESCE(tc.timeout_duration, 90);
END;
$$;

GRANT EXECUTE ON FUNCTION detect_timeout_payments_query() TO service_role;
GRANT EXECUTE ON FUNCTION detect_timeout_payments_query() TO authenticated;


-- Migration 5/7: Fix Payment Metrics FK Constraint
-- ============================================================================
ALTER TABLE payment_metrics 
DROP CONSTRAINT IF EXISTS payment_metrics_payment_id_fkey;

ALTER TABLE payment_metrics 
ALTER COLUMN payment_id DROP NOT NULL;

COMMENT ON COLUMN payment_metrics.payment_id IS 
'Stores stokika_kit_payments.id for kit_payment flows, payment_intents.id for vendor_registration flows. No FK enforced due to multi-table reference.';

CREATE INDEX IF NOT EXISTS idx_payment_metrics_payment_id 
ON payment_metrics(payment_id) 
WHERE payment_id IS NOT NULL;

GRANT ALL ON TABLE payment_metrics TO service_role;


-- Migration 6/7: Create Manual Verification Queue
-- ============================================================================
CREATE TABLE IF NOT EXISTS manual_verification_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_intent_id UUID REFERENCES payment_intents(id) ON DELETE CASCADE,
    mpesa_code TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    application_code TEXT,
    transaction_found BOOLEAN DEFAULT false,
    mpesa_transaction_id UUID,
    status TEXT NOT NULL DEFAULT 'PENDING',
    verified_by UUID REFERENCES profiles(id),
    verified_at TIMESTAMPTZ,
    rejection_reason TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_manual_verification_status ON manual_verification_queue(status) WHERE status = 'PENDING';
CREATE INDEX IF NOT EXISTS idx_manual_verification_created ON manual_verification_queue(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_manual_verification_mpesa_code ON manual_verification_queue(mpesa_code);
CREATE INDEX IF NOT EXISTS idx_manual_verification_application ON manual_verification_queue(application_code);

ALTER TABLE manual_verification_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY manual_verification_service_role_all ON manual_verification_queue
    FOR ALL TO service_role USING (true) WITH CHECK (true);

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

GRANT ALL ON manual_verification_queue TO service_role;
GRANT SELECT ON manual_verification_queue TO authenticated;


-- Migration 7/7: Add Duplicate Prevention Constraints
-- ============================================================================

-- National ID Uniqueness
ALTER TABLE delivery_partners 
DROP CONSTRAINT IF EXISTS delivery_partners_id_number_unique;

ALTER TABLE delivery_partners 
ADD CONSTRAINT delivery_partners_id_number_unique 
UNIQUE (id_number);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'profiles_id_number_unique'
    ) THEN
        ALTER TABLE profiles 
        ADD CONSTRAINT profiles_id_number_unique 
        UNIQUE (id_number);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'vendors_id_number_unique'
    ) THEN
        ALTER TABLE vendors 
        ADD CONSTRAINT vendors_id_number_unique 
        UNIQUE (id_number);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'field_agents_id_number_unique'
    ) THEN
        ALTER TABLE field_agents 
        ADD CONSTRAINT field_agents_id_number_unique 
        UNIQUE (id_number);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'supervisors_id_number_unique'
    ) THEN
        ALTER TABLE supervisors 
        ADD CONSTRAINT supervisors_id_number_unique 
        UNIQUE (id_number);
    END IF;
END $$;

-- Phone Number Uniqueness
ALTER TABLE delivery_partners 
DROP CONSTRAINT IF EXISTS delivery_partners_phone_unique;

ALTER TABLE delivery_partners 
ADD CONSTRAINT delivery_partners_phone_unique 
UNIQUE (phone);

CREATE UNIQUE INDEX IF NOT EXISTS profiles_phone_unique_idx 
ON profiles(phone) 
WHERE phone IS NOT NULL;

-- M-Pesa Code Uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS manual_verification_mpesa_code_active_unique 
ON manual_verification_queue(mpesa_code) 
WHERE status IN ('PENDING', 'APPROVED');

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'mpesa_c2b_transactions'
    ) THEN
        CREATE UNIQUE INDEX IF NOT EXISTS mpesa_c2b_receipt_unique 
        ON mpesa_c2b_transactions(mpesa_receipt_number) 
        WHERE mpesa_receipt_number IS NOT NULL;
        
        CREATE UNIQUE INDEX IF NOT EXISTS mpesa_c2b_trans_id_unique 
        ON mpesa_c2b_transactions(trans_id) 
        WHERE trans_id IS NOT NULL;
    END IF;
END $$;

-- Application Code Uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS delivery_partners_application_code_unique 
ON delivery_partners(application_code) 
WHERE application_code IS NOT NULL;

-- Payment Reference Uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS payment_intents_reference_unique 
ON payment_intents(payment_reference) 
WHERE payment_reference IS NOT NULL;

-- Helper Functions
CREATE OR REPLACE FUNCTION check_duplicate_national_id(p_id_number TEXT)
RETURNS TABLE (
    found BOOLEAN,
    table_name TEXT,
    record_id UUID,
    created_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT true, 'delivery_partners'::TEXT, dp.id, dp.created_at
    FROM delivery_partners dp
    WHERE dp.id_number = p_id_number
    LIMIT 1;
    
    IF FOUND THEN RETURN; END IF;
    
    RETURN QUERY
    SELECT true, 'profiles'::TEXT, p.id, p.created_at
    FROM profiles p
    WHERE p.id_number = p_id_number
    LIMIT 1;
    
    IF FOUND THEN RETURN; END IF;
    
    RETURN QUERY
    SELECT true, 'vendors'::TEXT, v.id, v.created_at
    FROM vendors v
    WHERE v.id_number = p_id_number
    LIMIT 1;
    
    IF FOUND THEN RETURN; END IF;
    
    RETURN QUERY
    SELECT true, 'field_agents'::TEXT, fa.id, fa.created_at
    FROM field_agents fa
    WHERE fa.id_number = p_id_number
    LIMIT 1;
    
    IF FOUND THEN RETURN; END IF;
    
    RETURN QUERY
    SELECT true, 'supervisors'::TEXT, s.id, s.created_at
    FROM supervisors s
    WHERE s.id_number = p_id_number
    LIMIT 1;
    
    IF FOUND THEN RETURN; END IF;
    
    RETURN QUERY
    SELECT false, NULL::TEXT, NULL::UUID, NULL::TIMESTAMPTZ;
END;
$$;

GRANT EXECUTE ON FUNCTION check_duplicate_national_id TO service_role;
GRANT EXECUTE ON FUNCTION check_duplicate_national_id TO authenticated;

CREATE OR REPLACE FUNCTION check_duplicate_phone(p_phone TEXT)
RETURNS TABLE (
    found BOOLEAN,
    table_name TEXT,
    record_id UUID,
    name TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT true, 'delivery_partners'::TEXT, dp.id, dp.full_name
    FROM delivery_partners dp
    WHERE dp.phone = p_phone
    LIMIT 1;
    
    IF FOUND THEN RETURN; END IF;
    
    RETURN QUERY
    SELECT true, 'profiles'::TEXT, p.id, p.full_name
    FROM profiles p
    WHERE p.phone = p_phone
    LIMIT 1;
    
    IF FOUND THEN RETURN; END IF;
    
    RETURN QUERY
    SELECT false, NULL::TEXT, NULL::UUID, NULL::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION check_duplicate_phone TO service_role;
GRANT EXECUTE ON FUNCTION check_duplicate_phone TO authenticated;

-- Verification
DO $$
DECLARE
    v_constraints_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_constraints_count
    FROM pg_constraint
    WHERE conname IN (
        'delivery_partners_id_number_unique',
        'delivery_partners_phone_unique',
        'profiles_id_number_unique',
        'vendors_id_number_unique',
        'field_agents_id_number_unique',
        'supervisors_id_number_unique'
    );
    
    RAISE NOTICE 'Unique constraints created: %', v_constraints_count;
END $$;

-- ============================================================================
-- DEPLOYMENT COMPLETE
-- ============================================================================
-- Next steps:
-- 1. Deploy Edge Functions: supabase functions deploy mpesa-stk-push
-- 2. Deploy Edge Functions: supabase functions deploy verify-manual-payment
-- 3. Upload js/pages/delivery-partner-form.page.js to your server
-- 4. Verify M-Pesa credentials in Supabase Dashboard
-- 5. Test with a fake M-Pesa code (should show pending verification)
-- ============================================================================
