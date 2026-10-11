-- Migration: Add ID Number to Vendors Table
-- Description: Adds id_number column to vendors table for government ID storage and payment matching
-- Date: 2026-01-17
-- Migration Number: 20260117000002
-- Requirements: 6.2, 6.3, 6.6 from vendor-id-manual-payment spec

-- ============================================================================
-- Add id_number Column to vendors Table
-- ============================================================================

-- Add id_number column with CHECK constraint for exactly 8 digits
ALTER TABLE vendors 
ADD COLUMN IF NOT EXISTS id_number TEXT 
CHECK (id_number ~ '^[0-9]{8}$');

-- Add column comment explaining denormalization for performance
COMMENT ON COLUMN vendors.id_number IS 'Eight-digit Kenyan government ID number - copied from profile for denormalization and fast C2B lookup during manual paybill payment matching. Provides stable payment identifier independent of phone number changes.';

-- ============================================================================
-- Create Unique Index with WHERE Clause for Non-NULL Values
-- ============================================================================

-- Create unique index to prevent duplicate ID numbers (allows NULL values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_vendors_id_number 
ON vendors(id_number) 
WHERE id_number IS NOT NULL;

-- ============================================================================
-- Create Lookup Index for C2B Payment Matching
-- ============================================================================

-- Create lookup index for fast C2B callback payment matching
-- This index optimizes queries that match incoming manual paybill payments
-- to vendors using their ID number as the account reference
CREATE INDEX IF NOT EXISTS idx_vendors_id_number_lookup 
ON vendors(id_number);

-- ============================================================================
-- Verification
-- ============================================================================

DO $$
DECLARE
    id_number_exists BOOLEAN;
    unique_index_exists BOOLEAN;
    lookup_index_exists BOOLEAN;
    check_constraint_exists BOOLEAN;
BEGIN
    -- Check if id_number column exists
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns
        WHERE table_name = 'vendors'
        AND column_name = 'id_number'
    ) INTO id_number_exists;
    
    -- Check if unique index exists
    SELECT EXISTS (
        SELECT 1 
        FROM pg_indexes
        WHERE tablename = 'vendors'
        AND indexname = 'idx_vendors_id_number'
    ) INTO unique_index_exists;
    
    -- Check if lookup index exists
    SELECT EXISTS (
        SELECT 1 
        FROM pg_indexes
        WHERE tablename = 'vendors'
        AND indexname = 'idx_vendors_id_number_lookup'
    ) INTO lookup_index_exists;
    
    -- Check if CHECK constraint exists
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.check_constraints
        WHERE constraint_name LIKE 'vendors_id_number%'
    ) INTO check_constraint_exists;
    
    RAISE NOTICE '✅ Migration Complete!';
    RAISE NOTICE '   id_number column: %', CASE WHEN id_number_exists THEN '✓ Created' ELSE '✗ Failed' END;
    RAISE NOTICE '   Unique index: %', CASE WHEN unique_index_exists THEN '✓ Created' ELSE '✗ Failed' END;
    RAISE NOTICE '   Lookup index: %', CASE WHEN lookup_index_exists THEN '✓ Created' ELSE '✗ Failed' END;
    RAISE NOTICE '   CHECK constraint: %', CASE WHEN check_constraint_exists THEN '✓ Created' ELSE '✗ Failed' END;
    
    IF id_number_exists AND unique_index_exists AND lookup_index_exists AND check_constraint_exists THEN
        RAISE NOTICE '🎉 All components successfully created!';
    ELSE
        RAISE WARNING '⚠️  Some components may be missing. Please verify manually.';
    END IF;
END $$;

-- ============================================================================
-- Rollback Instructions
-- ============================================================================

-- To rollback this migration, execute:
-- DROP INDEX IF EXISTS idx_vendors_id_number_lookup;
-- DROP INDEX IF EXISTS idx_vendors_id_number;
-- ALTER TABLE vendors DROP COLUMN IF EXISTS id_number;
