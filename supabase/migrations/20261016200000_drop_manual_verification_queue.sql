-- Migration: Drop manual_verification_queue table and related objects
-- Date: 2026-10-16
-- Purpose: Remove manual payment verification infrastructure (feature removed from frontend)
-- Author: System cleanup

-- ============================================================================
-- DROP RLS POLICIES
-- ============================================================================

-- Drop RLS policies for manual_verification_queue table
DROP POLICY IF EXISTS manual_verification_service_role_all ON manual_verification_queue;
DROP POLICY IF EXISTS manual_verification_admin_view ON manual_verification_queue;
DROP POLICY IF EXISTS manual_verification_admin_update ON manual_verification_queue;

-- ============================================================================
-- DROP INDEXES
-- ============================================================================

-- Drop indexes on manual_verification_queue
DROP INDEX IF EXISTS idx_manual_verification_status;
DROP INDEX IF EXISTS idx_manual_verification_created;
DROP INDEX IF EXISTS idx_manual_verification_mpesa_code;
DROP INDEX IF EXISTS idx_manual_verification_application;
DROP INDEX IF EXISTS manual_verification_mpesa_code_active_unique;

-- ============================================================================
-- DROP TABLE
-- ============================================================================

-- Drop the manual_verification_queue table
DROP TABLE IF EXISTS manual_verification_queue CASCADE;

-- ============================================================================
-- CLEANUP ALERT THRESHOLDS
-- ============================================================================

-- Remove manual verification alert type from payment_alert_thresholds
-- (if the table exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'payment_alert_thresholds'
    ) THEN
        DELETE FROM payment_alert_thresholds 
        WHERE alert_type = 'manual_verification_queue_length';
    END IF;
END $$;

-- ============================================================================
-- CLEANUP HELPER FUNCTIONS
-- ============================================================================

-- Drop helper functions used for manual payment duplicate checking
DROP FUNCTION IF EXISTS check_duplicate_national_id(TEXT);
DROP FUNCTION IF EXISTS check_duplicate_phone(TEXT);
DROP FUNCTION IF EXISTS check_duplicate_mpesa_code(TEXT);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify table is dropped
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'manual_verification_queue'
    ) THEN
        RAISE EXCEPTION 'manual_verification_queue table still exists after drop attempt';
    END IF;
    
    RAISE NOTICE 'Manual verification queue cleanup completed successfully';
END $$;

-- ============================================================================
-- MIGRATION NOTES
-- ============================================================================

-- This migration removes all database objects related to the manual payment
-- verification feature that was removed from the frontend.
--
-- Related Edge Function: supabase/functions/verify-manual-payment (deleted)
-- Related Frontend Files: All removed in previous commit
--
-- SAFE TO RUN: This migration only drops objects that are no longer used
-- ROLLBACK: Manual verification feature cannot be restored without
--           recreating the table, policies, indexes, and Edge Function
