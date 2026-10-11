-- Rollback Script: generate_field_agent_code function
-- Purpose: Remove the generate_field_agent_code RPC function
-- Date: 2026-01-25

-- ============================================================
-- Remove Function
-- ============================================================

DROP FUNCTION IF EXISTS generate_field_agent_code(TEXT);

-- ============================================================
-- Verification
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_proc 
        WHERE proname = 'generate_field_agent_code'
    ) THEN
        RAISE NOTICE '✓ Rollback successful: generate_field_agent_code function removed';
    ELSE
        RAISE EXCEPTION '✗ Rollback failed: generate_field_agent_code function still exists';
    END IF;
END $$;
