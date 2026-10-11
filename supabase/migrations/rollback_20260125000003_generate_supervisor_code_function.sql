-- Rollback Script: generate_supervisor_code function
-- Purpose: Remove the generate_supervisor_code RPC function
-- Date: 2026-01-25

-- ============================================================
-- Remove Function
-- ============================================================

DROP FUNCTION IF EXISTS generate_supervisor_code(TEXT);

-- ============================================================
-- Verification
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_proc 
        WHERE proname = 'generate_supervisor_code'
    ) THEN
        RAISE NOTICE '✓ Rollback successful: generate_supervisor_code function removed';
    ELSE
        RAISE EXCEPTION '✗ Rollback failed: generate_supervisor_code function still exists';
    END IF;
END $$;
