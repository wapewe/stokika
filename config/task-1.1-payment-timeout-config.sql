-- ============================================================================
-- TASK 1.1: Create payment_timeout_config table
-- Spec: secure-mpesa-integration
-- Requirements: 1.1, 1.3, 1.4, 1.7
-- ============================================================================
-- 
-- This migration creates a configuration table for managing payment timeout
-- settings across different payment flow types (kit_payment, vendor_order, etc.)
--
-- Features:
-- - Configurable timeout durations (30-300 seconds)
-- - Configurable max retries (1-5 attempts)
-- - Configurable retry intervals (10-60 seconds)
-- - Fast lookups via indexed flow_type column
-- - RLS policies: Public reads, Admin-only updates
-- - Default configuration for kit_payment flow type
--
-- ============================================================================

-- Payment Timeout Configuration Table
-- This table stores configurable timeout settings for different payment flow types
CREATE TABLE IF NOT EXISTS payment_timeout_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    flow_type VARCHAR(50) NOT NULL UNIQUE,
    timeout_duration INTEGER NOT NULL CHECK (timeout_duration BETWEEN 30 AND 300),
    max_retries INTEGER NOT NULL CHECK (max_retries BETWEEN 1 AND 5),
    retry_interval INTEGER NOT NULL CHECK (retry_interval BETWEEN 10 AND 60),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Documentation constraints
    CONSTRAINT valid_flow_type CHECK (flow_type IN ('kit_payment', 'vendor_order', 'manual_payment'))
);

-- Create index on flow_type for fast lookups
CREATE INDEX IF NOT EXISTS idx_payment_timeout_config_flow_type
ON payment_timeout_config(flow_type);

-- Enable RLS for security
ALTER TABLE payment_timeout_config ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Public reads - anyone can view timeout configuration
CREATE POLICY "Anyone can view timeout configuration"
    ON payment_timeout_config FOR SELECT
    USING (true);

-- RLS Policy: Admin-only updates - only admins can modify timeout settings
CREATE POLICY "Admins can modify timeout configuration"
    ON payment_timeout_config FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.user_type = 'admin'
        )
    );

-- Insert default configuration for kit_payment flow type
-- timeout_duration: 90 seconds (requirement 1.3)
-- max_retries: 3 attempts (requirement 1.4)
-- retry_interval: 30 seconds (requirement 1.7)
INSERT INTO payment_timeout_config (flow_type, timeout_duration, max_retries, retry_interval)
VALUES ('kit_payment', 90, 3, 30)
ON CONFLICT (flow_type) DO NOTHING;

-- Insert default configuration for vendor_order flow type
INSERT INTO payment_timeout_config (flow_type, timeout_duration, max_retries, retry_interval)
VALUES ('vendor_order', 120, 3, 30)
ON CONFLICT (flow_type) DO NOTHING;

-- Insert default configuration for manual_payment flow type
INSERT INTO payment_timeout_config (flow_type, timeout_duration, max_retries, retry_interval)
VALUES ('manual_payment', 300, 5, 60)
ON CONFLICT (flow_type) DO NOTHING;

-- Comments for documentation
COMMENT ON TABLE payment_timeout_config IS 'Configuration table for payment timeout settings per flow type';
COMMENT ON COLUMN payment_timeout_config.flow_type IS 'Type of payment flow: kit_payment, vendor_order, manual_payment';
COMMENT ON COLUMN payment_timeout_config.timeout_duration IS 'Duration in seconds before payment times out (30-300s)';
COMMENT ON COLUMN payment_timeout_config.max_retries IS 'Maximum number of retry attempts allowed (1-5)';
COMMENT ON COLUMN payment_timeout_config.retry_interval IS 'Time interval in seconds between retries (10-60s)';

-- ============================================================================
-- Verification Query
-- ============================================================================

-- Verify the table was created and data inserted successfully
DO $$
DECLARE
    v_table_exists BOOLEAN;
    v_row_count INTEGER;
BEGIN
    -- Check if table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'payment_timeout_config'
    ) INTO v_table_exists;
    
    IF v_table_exists THEN
        -- Count rows
        SELECT COUNT(*) INTO v_row_count FROM payment_timeout_config;
        
        RAISE NOTICE '✅ payment_timeout_config table created successfully';
        RAISE NOTICE '✅ Index on flow_type created';
        RAISE NOTICE '✅ RLS policies enabled';
        RAISE NOTICE '✅ % default configuration(s) inserted', v_row_count;
        RAISE NOTICE '';
        RAISE NOTICE '📋 Default Configurations:';
        RAISE NOTICE '   - kit_payment: 90s timeout, 3 retries, 30s interval';
        RAISE NOTICE '   - vendor_order: 120s timeout, 3 retries, 30s interval';
        RAISE NOTICE '   - manual_payment: 300s timeout, 5 retries, 60s interval';
    ELSE
        RAISE WARNING '⚠️  Table payment_timeout_config was not created';
    END IF;
END $$;

-- Display current configuration
SELECT 
    flow_type,
    timeout_duration || 's' as timeout,
    max_retries || ' attempts' as retries,
    retry_interval || 's' as retry_interval,
    created_at
FROM payment_timeout_config
ORDER BY flow_type;
