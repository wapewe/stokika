-- ============================================================================
-- ROLLBACK SCRIPT: ID-Based Application Code Schema Setup
-- Date: 2026-01-25
-- Purpose: Rollback migration 20260125000001
-- ============================================================================
-- 
-- WARNING: This will remove unique constraints and indexes added by the migration.
-- Existing data will NOT be deleted, but duplicate ID numbers will be allowed again.
-- Only run this if you need to undo the migration.
-- 
-- ============================================================================

BEGIN;

RAISE NOTICE '=================================================================';
RAISE NOTICE 'ROLLBACK: ID-Based Application Code Schema Setup';
RAISE NOTICE '=================================================================';
RAISE NOTICE '';
RAISE NOTICE 'This will remove unique constraints and indexes added by migration 20260125000001';
RAISE NOTICE 'Existing data will be preserved';
RAISE NOTICE '';

-- ============================================================================
-- STEP 1: Remove Performance Indexes
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '=== Removing Performance Indexes ===';
    
    DROP INDEX IF EXISTS idx_supervisors_application_code;
    RAISE NOTICE '✓ Dropped index: idx_supervisors_application_code';
    
    DROP INDEX IF EXISTS idx_supervisors_id_number;
    RAISE NOTICE '✓ Dropped index: idx_supervisors_id_number';
    
    DROP INDEX IF EXISTS idx_field_agents_application_code;
    RAISE NOTICE '✓ Dropped index: idx_field_agents_application_code';
    
    DROP INDEX IF EXISTS idx_field_agents_id_number;
    RAISE NOTICE '✓ Dropped index: idx_field_agents_id_number';
    
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- STEP 2: Remove Unique Constraints
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '=== Removing Unique Constraints ===';
    
    -- Remove supervisors constraints
    ALTER TABLE supervisors DROP CONSTRAINT IF EXISTS unique_supervisor_application_code;
    RAISE NOTICE '✓ Dropped constraint: unique_supervisor_application_code';
    
    ALTER TABLE supervisors DROP CONSTRAINT IF EXISTS unique_supervisor_id_number;
    RAISE NOTICE '✓ Dropped constraint: unique_supervisor_id_number';
    
    -- Remove field_agents constraints
    ALTER TABLE field_agents DROP CONSTRAINT IF EXISTS unique_field_agent_application_code;
    RAISE NOTICE '✓ Dropped constraint: unique_field_agent_application_code';
    
    ALTER TABLE field_agents DROP CONSTRAINT IF EXISTS unique_field_agent_id_number;
    RAISE NOTICE '✓ Dropped constraint: unique_field_agent_id_number';
    
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- STEP 3: Verification
-- ============================================================================

DO $$
DECLARE
    v_constraint_count INTEGER;
    v_index_count INTEGER;
BEGIN
    RAISE NOTICE '=== Rollback Verification ===';
    
    -- Check that constraints were removed
    SELECT COUNT(*) INTO v_constraint_count
    FROM pg_constraint
    WHERE conname IN (
        'unique_field_agent_id_number',
        'unique_field_agent_application_code',
        'unique_supervisor_id_number',
        'unique_supervisor_application_code'
    );
    
    IF v_constraint_count = 0 THEN
        RAISE NOTICE '✓ All unique constraints removed successfully';
    ELSE
        RAISE WARNING '% constraint(s) still exist', v_constraint_count;
    END IF;
    
    -- Check that indexes were removed
    SELECT COUNT(*) INTO v_index_count
    FROM pg_indexes
    WHERE indexname IN (
        'idx_field_agents_id_number',
        'idx_field_agents_application_code',
        'idx_supervisors_id_number',
        'idx_supervisors_application_code'
    );
    
    IF v_index_count = 0 THEN
        RAISE NOTICE '✓ All indexes removed successfully';
    ELSE
        RAISE WARNING '% index(es) still exist', v_index_count;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== Rollback Complete ===';
    RAISE NOTICE '✓ Migration 20260125000001 has been rolled back';
    RAISE NOTICE '✓ Database schema restored to previous state';
    RAISE NOTICE '';
    RAISE NOTICE 'Note: Existing data in field_agents and supervisors tables was preserved';
END $$;

COMMIT;

-- ============================================================================
-- End of Rollback Script
-- ============================================================================
