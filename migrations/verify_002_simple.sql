-- ============================================================================
-- SIMPLE VERIFICATION: Migration 002 - Add Vendor Columns
-- ============================================================================
-- Copy and paste this entire script into Supabase SQL Editor to verify
-- ============================================================================

-- Check 1: All columns exist
SELECT 
    'Columns Check' as test,
    CASE 
        WHEN COUNT(*) = 5 THEN '✓ PASS: All 5 columns exist'
        ELSE '✗ FAIL: Expected 5 columns, found ' || COUNT(*)::TEXT
    END as result
FROM information_schema.columns
WHERE table_name = 'vendors'
AND column_name IN (
    'business_category_other',
    'stock_cycle',
    'stock_requirement_amount',
    'stock_justification',
    'bmc_completed'
);

-- Check 2: All indexes exist
SELECT 
    'Indexes Check' as test,
    CASE 
        WHEN COUNT(*) >= 6 THEN '✓ PASS: All 6 indexes exist'
        ELSE '✗ FAIL: Expected 6 indexes, found ' || COUNT(*)::TEXT
    END as result
FROM pg_indexes
WHERE tablename = 'vendors'
AND indexname IN (
    'idx_vendors_business_category',
    'idx_vendors_business_status',
    'idx_vendors_business_size',
    'idx_vendors_business_model',
    'idx_vendors_bmc_completed',
    'idx_vendors_stock_cycle'
);

-- Check 3: All constraints exist
SELECT 
    'Constraints Check' as test,
    CASE 
        WHEN COUNT(*) >= 3 THEN '✓ PASS: All 3 CHECK constraints exist'
        ELSE '✗ FAIL: Expected 3 constraints, found ' || COUNT(*)::TEXT
    END as result
FROM pg_constraint
WHERE conrelid = 'vendors'::regclass
AND conname IN (
    'vendors_stock_cycle_check',
    'vendors_stock_requirement_amount_check',
    'vendors_stock_justification_check'
);

-- Detailed column information
SELECT 
    '--- Column Details ---' as info;
    
SELECT 
    column_name,
    data_type,
    is_nullable,
    COALESCE(column_default, 'NULL') as default_value
FROM information_schema.columns
WHERE table_name = 'vendors'
AND column_name IN (
    'business_category_other',
    'stock_cycle',
    'stock_requirement_amount',
    'stock_justification',
    'bmc_completed'
)
ORDER BY column_name;

-- Detailed index information
SELECT 
    '--- Index Details ---' as info;
    
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'vendors'
AND indexname IN (
    'idx_vendors_business_category',
    'idx_vendors_business_status',
    'idx_vendors_business_size',
    'idx_vendors_business_model',
    'idx_vendors_bmc_completed',
    'idx_vendors_stock_cycle'
)
ORDER BY indexname;

-- Detailed constraint information
SELECT 
    '--- Constraint Details ---' as info;
    
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'vendors'::regclass
AND conname IN (
    'vendors_stock_cycle_check',
    'vendors_stock_requirement_amount_check',
    'vendors_stock_justification_check'
)
ORDER BY conname;
