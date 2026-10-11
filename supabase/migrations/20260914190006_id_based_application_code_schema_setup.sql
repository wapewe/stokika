-- ============================================================================
-- MIGRATION: ID-Based Application Code Generation - Database Schema Setup
-- Date: 2026-01-25
-- Task: 1 - Database Schema Setup
-- Spec: id-based-application-code-generation
-- Requirements: 10.1, 10.2, 10.3, 7.7, 7.8
-- ============================================================================
-- 
-- PURPOSE:
-- This migration prepares the database for ID-based application code generation
-- by adding unique constraints and indexes for id_number and application_code
-- columns in both field_agents and supervisors tables.
--
-- CHANGES:
-- 1. Verify existing data has no duplicate ID numbers
-- 2. Add unique constraints on id_number columns
-- 3. Add unique constraints on application_code columns
-- 4. Add performance indexes for fast lookups
--
-- SAFETY:
-- - Checks for duplicates before applying constraints
-- - Uses IF NOT EXISTS to allow safe re-runs
-- - Provides detailed verification output
-- - Includes rollback instructions
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Pre-Migration Verification - Check for Duplicate ID Numbers
-- ============================================================================

DO $$
DECLARE
    v_field_agent_duplicates INTEGER;
    v_supervisor_duplicates INTEGER;
    v_duplicate_ids TEXT;
BEGIN
    RAISE NOTICE '=== Pre-Migration Verification ===';
    RAISE NOTICE 'Checking for duplicate ID numbers...';
    
    -- Check for duplicate ID numbers in field_agents table
    SELECT COUNT(*) INTO v_field_agent_duplicates
    FROM (
        SELECT id_number, COUNT(*) as cnt
        FROM field_agents
        WHERE id_number IS NOT NULL AND id_number != ''
        GROUP BY id_number
        HAVING COUNT(*) > 1
    ) duplicates;
    
    -- Check for duplicate ID numbers in supervisors table
    SELECT COUNT(*) INTO v_supervisor_duplicates
    FROM (
        SELECT id_number, COUNT(*) as cnt
        FROM supervisors
        WHERE id_number IS NOT NULL AND id_number != ''
        GROUP BY id_number
        HAVING COUNT(*) > 1
    ) duplicates;
    
    -- If duplicates found in field_agents, list them
    IF v_field_agent_duplicates > 0 THEN
        RAISE WARNING 'Found % duplicate ID number(s) in field_agents table:', v_field_agent_duplicates;
        
        FOR v_duplicate_ids IN
            SELECT id_number || ' (count: ' || COUNT(*) || ')'
            FROM field_agents
            WHERE id_number IS NOT NULL AND id_number != ''
            GROUP BY id_number
            HAVING COUNT(*) > 1
        LOOP
            RAISE WARNING '  - %', v_duplicate_ids;
        END LOOP;
        
        RAISE EXCEPTION 'Cannot proceed: field_agents table contains duplicate ID numbers. Please resolve duplicates before applying this migration.';
    END IF;
    
    -- If duplicates found in supervisors, list them
    IF v_supervisor_duplicates > 0 THEN
        RAISE WARNING 'Found % duplicate ID number(s) in supervisors table:', v_supervisor_duplicates;
        
        FOR v_duplicate_ids IN
            SELECT id_number || ' (count: ' || COUNT(*) || ')'
            FROM supervisors
            WHERE id_number IS NOT NULL AND id_number != ''
            GROUP BY id_number
            HAVING COUNT(*) > 1
        LOOP
            RAISE WARNING '  - %', v_duplicate_ids;
        END LOOP;
        
        RAISE EXCEPTION 'Cannot proceed: supervisors table contains duplicate ID numbers. Please resolve duplicates before applying this migration.';
    END IF;
    
    RAISE NOTICE '✓ No duplicate ID numbers found in field_agents table';
    RAISE NOTICE '✓ No duplicate ID numbers found in supervisors table';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- STEP 2: Add Unique Constraints for ID Numbers
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '=== Adding Unique Constraints for ID Numbers ===';
    
    -- Add unique constraint for field_agents.id_number
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_field_agent_id_number'
    ) THEN
        ALTER TABLE field_agents 
        ADD CONSTRAINT unique_field_agent_id_number UNIQUE (id_number);
        RAISE NOTICE '✓ Added unique constraint: unique_field_agent_id_number';
    ELSE
        RAISE NOTICE '  Constraint unique_field_agent_id_number already exists (skipping)';
    END IF;
    
    -- Add unique constraint for supervisors.id_number
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_supervisor_id_number'
    ) THEN
        ALTER TABLE supervisors 
        ADD CONSTRAINT unique_supervisor_id_number UNIQUE (id_number);
        RAISE NOTICE '✓ Added unique constraint: unique_supervisor_id_number';
    ELSE
        RAISE NOTICE '  Constraint unique_supervisor_id_number already exists (skipping)';
    END IF;
    
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- STEP 3: Add Unique Constraints for Application Codes
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '=== Adding Unique Constraints for Application Codes ===';
    
    -- Add unique constraint for field_agents.application_code
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_field_agent_application_code'
    ) THEN
        ALTER TABLE field_agents 
        ADD CONSTRAINT unique_field_agent_application_code UNIQUE (application_code);
        RAISE NOTICE '✓ Added unique constraint: unique_field_agent_application_code';
    ELSE
        RAISE NOTICE '  Constraint unique_field_agent_application_code already exists (skipping)';
    END IF;
    
    -- Add unique constraint for supervisors.application_code
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_supervisor_application_code'
    ) THEN
        ALTER TABLE supervisors 
        ADD CONSTRAINT unique_supervisor_application_code UNIQUE (application_code);
        RAISE NOTICE '✓ Added unique constraint: unique_supervisor_application_code';
    ELSE
        RAISE NOTICE '  Constraint unique_supervisor_application_code already exists (skipping)';
    END IF;
    
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- STEP 4: Add Performance Indexes
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '=== Adding Performance Indexes ===';
    
    -- Index for field_agents.id_number lookups (for uniqueness check during code generation)
    CREATE INDEX IF NOT EXISTS idx_field_agents_id_number 
    ON field_agents (id_number);
    RAISE NOTICE '✓ Created index: idx_field_agents_id_number';
    
    -- Index for field_agents.application_code lookups (for code uniqueness validation)
    CREATE INDEX IF NOT EXISTS idx_field_agents_application_code 
    ON field_agents (application_code);
    RAISE NOTICE '✓ Created index: idx_field_agents_application_code';
    
    -- Index for supervisors.id_number lookups (for uniqueness check during code generation)
    CREATE INDEX IF NOT EXISTS idx_supervisors_id_number 
    ON supervisors (id_number);
    RAISE NOTICE '✓ Created index: idx_supervisors_id_number';
    
    -- Index for supervisors.application_code lookups (for code uniqueness validation)
    CREATE INDEX IF NOT EXISTS idx_supervisors_application_code 
    ON supervisors (application_code);
    RAISE NOTICE '✓ Created index: idx_supervisors_application_code';
    
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- STEP 5: Add Column Comments for Documentation
-- ============================================================================

COMMENT ON COLUMN field_agents.id_number IS 
'Eight-digit Kenyan National ID number. Each ID can only be used once per application. Used as the basis for generating application codes with format SFA{first_4_digits}{4_random_digits}.';

COMMENT ON COLUMN field_agents.application_code IS 
'Unique application identifier generated from ID number. Format: SFA{first_4_id_digits}{4_random_digits}. Example: SFA12345678. Generated server-side via RPC function generate_field_agent_code().';

COMMENT ON COLUMN supervisors.id_number IS 
'Eight-digit Kenyan National ID number. Each ID can only be used once per application. Used as the basis for generating application codes with format SFS{first_4_digits}{4_random_digits}.';

COMMENT ON COLUMN supervisors.application_code IS 
'Unique application identifier generated from ID number. Format: SFS{first_4_id_digits}{4_random_digits}. Example: SFS12345678. Generated server-side via RPC function generate_supervisor_code().';

-- ============================================================================
-- STEP 6: Post-Migration Verification
-- ============================================================================

DO $$
DECLARE
    v_field_agents_count INTEGER;
    v_supervisors_count INTEGER;
    v_constraint_count INTEGER;
    v_index_count INTEGER;
BEGIN
    RAISE NOTICE '=== Post-Migration Verification ===';
    
    -- Count existing records
    SELECT COUNT(*) INTO v_field_agents_count FROM field_agents;
    SELECT COUNT(*) INTO v_supervisors_count FROM supervisors;
    RAISE NOTICE 'Existing records: % field_agents, % supervisors', v_field_agents_count, v_supervisors_count;
    RAISE NOTICE '';
    
    -- Verify constraints
    RAISE NOTICE 'Verifying constraints...';
    
    SELECT COUNT(*) INTO v_constraint_count
    FROM pg_constraint
    WHERE conname IN (
        'unique_field_agent_id_number',
        'unique_field_agent_application_code',
        'unique_supervisor_id_number',
        'unique_supervisor_application_code'
    );
    
    IF v_constraint_count = 4 THEN
        RAISE NOTICE '✓ All 4 unique constraints verified';
    ELSE
        RAISE WARNING 'Expected 4 constraints, found %', v_constraint_count;
    END IF;
    
    -- Verify indexes
    RAISE NOTICE 'Verifying indexes...';
    
    SELECT COUNT(*) INTO v_index_count
    FROM pg_indexes
    WHERE indexname IN (
        'idx_field_agents_id_number',
        'idx_field_agents_application_code',
        'idx_supervisors_id_number',
        'idx_supervisors_application_code'
    );
    
    IF v_index_count = 4 THEN
        RAISE NOTICE '✓ All 4 performance indexes verified';
    ELSE
        RAISE WARNING 'Expected 4 indexes, found %', v_index_count;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== Migration Complete ===';
    RAISE NOTICE '✓ Unique constraints added for id_number and application_code';
    RAISE NOTICE '✓ Performance indexes created for fast lookups';
    RAISE NOTICE '✓ Database schema ready for ID-based code generation';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '  1. Deploy generate_field_agent_code() RPC function';
    RAISE NOTICE '  2. Deploy generate_supervisor_code() RPC function';
    RAISE NOTICE '  3. Update frontend forms to use new validation';
END $$;

COMMIT;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================
-- 
-- To rollback this migration, execute:
--
-- BEGIN;
-- 
-- -- Remove indexes
-- DROP INDEX IF EXISTS idx_supervisors_application_code;
-- DROP INDEX IF EXISTS idx_supervisors_id_number;
-- DROP INDEX IF EXISTS idx_field_agents_application_code;
-- DROP INDEX IF EXISTS idx_field_agents_id_number;
-- 
-- -- Remove unique constraints
-- ALTER TABLE supervisors DROP CONSTRAINT IF EXISTS unique_supervisor_application_code;
-- ALTER TABLE supervisors DROP CONSTRAINT IF EXISTS unique_supervisor_id_number;
-- ALTER TABLE field_agents DROP CONSTRAINT IF EXISTS unique_field_agent_application_code;
-- ALTER TABLE field_agents DROP CONSTRAINT IF EXISTS unique_field_agent_id_number;
-- 
-- COMMIT;
-- 
-- ============================================================================
