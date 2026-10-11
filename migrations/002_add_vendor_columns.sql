-- ============================================================================
-- MIGRATION 002: Add New Columns to Vendors Table
-- Task: 1.2 - Vendor Registration Restructure
-- Requirements: 11.1-11.10
-- ============================================================================

BEGIN;

-- Step 1: Add business_category_other column for "Other" category specification
ALTER TABLE vendors
ADD COLUMN IF NOT EXISTS business_category_other TEXT;

COMMENT ON COLUMN vendors.business_category_other IS 'Stores custom category text when user selects "Other" in Business Category dropdown';

-- Step 2: Add stock_cycle column with enum constraint
ALTER TABLE vendors
ADD COLUMN IF NOT EXISTS stock_cycle TEXT;

-- Add CHECK constraint for stock_cycle enum values
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'vendors_stock_cycle_check'
    ) THEN
        ALTER TABLE vendors
        ADD CONSTRAINT vendors_stock_cycle_check 
        CHECK (stock_cycle IN ('daily', 'weekly', 'fortnightly', 'monthly'));
    END IF;
END $$;

COMMENT ON COLUMN vendors.stock_cycle IS 'Frequency of inventory replenishment: daily, weekly, fortnightly, or monthly';

-- Step 3: Add stock_requirement_amount column with numeric constraint
ALTER TABLE vendors
ADD COLUMN IF NOT EXISTS stock_requirement_amount DECIMAL(10,2);

-- Add CHECK constraint for positive values
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'vendors_stock_requirement_amount_check'
    ) THEN
        ALTER TABLE vendors
        ADD CONSTRAINT vendors_stock_requirement_amount_check 
        CHECK (stock_requirement_amount > 0);
    END IF;
END $$;

COMMENT ON COLUMN vendors.stock_requirement_amount IS 'Estimated stock requirement per cycle in KES (must be positive)';

-- Step 4: Add stock_justification column with minimum length constraint
ALTER TABLE vendors
ADD COLUMN IF NOT EXISTS stock_justification TEXT;

-- Add CHECK constraint for minimum 20 characters
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'vendors_stock_justification_check'
    ) THEN
        ALTER TABLE vendors
        ADD CONSTRAINT vendors_stock_justification_check 
        CHECK (char_length(stock_justification) >= 20);
    END IF;
END $$;

COMMENT ON COLUMN vendors.stock_justification IS 'Explanation of stock needs (minimum 20 characters required)';

-- Step 5: Add bmc_completed boolean column
ALTER TABLE vendors
ADD COLUMN IF NOT EXISTS bmc_completed BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN vendors.bmc_completed IS 'Indicates whether vendor completed Business Model Canvas during registration';

-- Step 6: Create indexes on new foreign key columns (from task 1.1)
-- These indexes improve query performance for filtering and joining

CREATE INDEX IF NOT EXISTS idx_vendors_business_category ON vendors(business_category_id);
CREATE INDEX IF NOT EXISTS idx_vendors_business_status ON vendors(business_status_id);
CREATE INDEX IF NOT EXISTS idx_vendors_business_size ON vendors(business_size_id);
CREATE INDEX IF NOT EXISTS idx_vendors_business_model ON vendors(business_model_id);

-- Additional indexes for new columns to optimize queries
CREATE INDEX IF NOT EXISTS idx_vendors_bmc_completed ON vendors(bmc_completed);
CREATE INDEX IF NOT EXISTS idx_vendors_stock_cycle ON vendors(stock_cycle);

-- Step 7: Verify column additions
DO $$
DECLARE
    missing_columns TEXT[] := ARRAY[]::TEXT[];
    column_name TEXT;
BEGIN
    -- Check for all required columns
    FOR column_name IN 
        SELECT unnest(ARRAY[
            'business_category_other',
            'stock_cycle',
            'stock_requirement_amount',
            'stock_justification',
            'bmc_completed'
        ])
    LOOP
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'vendors' 
            AND column_name = column_name
        ) THEN
            missing_columns := array_append(missing_columns, column_name);
        END IF;
    END LOOP;
    
    -- Raise exception if any columns are missing
    IF array_length(missing_columns, 1) > 0 THEN
        RAISE EXCEPTION 'Migration incomplete: missing columns: %', array_to_string(missing_columns, ', ');
    END IF;
    
    -- Success message
    RAISE NOTICE '✓ Migration 002 successful: All vendor table columns added';
    RAISE NOTICE '  - business_category_other (TEXT)';
    RAISE NOTICE '  - stock_cycle (TEXT with enum constraint)';
    RAISE NOTICE '  - stock_requirement_amount (DECIMAL with positive constraint)';
    RAISE NOTICE '  - stock_justification (TEXT with min 20 chars constraint)';
    RAISE NOTICE '  - bmc_completed (BOOLEAN default false)';
    RAISE NOTICE '✓ Indexes created on foreign key columns';
END $$;

COMMIT;
