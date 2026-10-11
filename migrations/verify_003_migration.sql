-- ============================================================================
-- VERIFICATION SCRIPT FOR MIGRATION 003
-- Checks that all vendors have been successfully migrated to new structure
-- ============================================================================

\echo '=========================================='
\echo 'MIGRATION 003 VERIFICATION'
\echo '=========================================='
\echo ''

-- Check 1: Verify no NULL dimension fields
\echo 'CHECK 1: Verify no NULL dimension fields'
\echo '------------------------------------------'

SELECT 
    COUNT(*) as total_vendors,
    COUNT(business_status_id) as has_status,
    COUNT(business_size_id) as has_size,
    COUNT(business_model_id) as has_model,
    COUNT(*) - COUNT(business_status_id) as missing_status,
    COUNT(*) - COUNT(business_size_id) as missing_size,
    COUNT(*) - COUNT(business_model_id) as missing_model
FROM vendors;

\echo ''
\echo 'Expected: missing_* columns should all be 0'
\echo ''

-- Check 2: Verify legacy_business_size column exists
\echo 'CHECK 2: Verify legacy_business_size column exists'
\echo '------------------------------------------'

SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'vendors' 
  AND column_name = 'legacy_business_size';

\echo ''
\echo 'Expected: One row showing column exists'
\echo ''

-- Check 3: Show distribution of legacy values
\echo 'CHECK 3: Distribution of legacy business size values'
\echo '------------------------------------------'

SELECT 
    legacy_business_size,
    COUNT(*) as count,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) as percentage
FROM vendors
GROUP BY legacy_business_size
ORDER BY count DESC;

\echo ''

-- Check 4: Show current dimensional distribution
\echo 'CHECK 4: Current dimensional distribution'
\echo '------------------------------------------'

SELECT 
    'Business Status' as dimension,
    bs.status_name as value,
    COUNT(*) as count,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) as percentage
FROM vendors v
JOIN business_statuses bs ON v.business_status_id = bs.id
GROUP BY bs.status_name

UNION ALL

SELECT 
    'Business Size' as dimension,
    bz.size_name as value,
    COUNT(*) as count,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) as percentage
FROM vendors v
JOIN business_sizes bz ON v.business_size_id = bz.id
GROUP BY bz.size_name

UNION ALL

SELECT 
    'Business Model' as dimension,
    bm.model_name as value,
    COUNT(*) as count,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) as percentage
FROM vendors v
JOIN business_models bm ON v.business_model_id = bm.id
GROUP BY bm.model_name

ORDER BY dimension, count DESC;

\echo ''

-- Check 5: Verify mapping accuracy for known patterns
\echo 'CHECK 5: Verify mapping accuracy'
\echo '------------------------------------------'
\echo 'Aspiring Entrepreneurs (should be Planning + Pre-Launch):'

SELECT 
    COUNT(*) as count,
    bs.status_name,
    bz.size_name
FROM vendors v
JOIN business_statuses bs ON v.business_status_id = bs.id
JOIN business_sizes bz ON v.business_size_id = bz.id
WHERE v.legacy_business_size = 'aspiring-entrepreneur'
GROUP BY bs.status_name, bz.size_name;

\echo ''
\echo 'Retail Traders (should be Operating + Retail model):'

SELECT 
    COUNT(*) as count,
    bs.status_name,
    bm.model_name,
    bz.size_name
FROM vendors v
JOIN business_statuses bs ON v.business_status_id = bs.id
JOIN business_models bm ON v.business_model_id = bm.id
JOIN business_sizes bz ON v.business_size_id = bz.id
WHERE v.legacy_business_size = 'retail-trader'
GROUP BY bs.status_name, bm.model_name, bz.size_name
ORDER BY count DESC;

\echo ''
\echo 'Service Providers (should be Operating + Service Provider model):'

SELECT 
    COUNT(*) as count,
    bs.status_name,
    bm.model_name,
    bz.size_name
FROM vendors v
JOIN business_statuses bs ON v.business_status_id = bs.id
JOIN business_models bm ON v.business_model_id = bm.id
JOIN business_sizes bz ON v.business_size_id = bz.id
WHERE v.legacy_business_size = 'service-provider'
GROUP BY bs.status_name, bm.model_name, bz.size_name
ORDER BY count DESC;

\echo ''

-- Check 6: Verify indexes exist
\echo 'CHECK 6: Verify indexes exist'
\echo '------------------------------------------'

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
    'idx_vendors_legacy_business_size'
  )
ORDER BY indexname;

\echo ''
\echo 'Expected: 5 indexes listed'
\echo ''

-- Check 7: Sample data verification
\echo 'CHECK 7: Sample vendor data (first 5 records)'
\echo '------------------------------------------'

SELECT 
    v.id,
    v.business_name,
    v.legacy_business_size,
    bs.status_name,
    bz.size_name,
    bm.model_name,
    v.stock_requirement_amount
FROM vendors v
JOIN business_statuses bs ON v.business_status_id = bs.id
JOIN business_sizes bz ON v.business_size_id = bz.id
JOIN business_models bm ON v.business_model_id = bm.id
ORDER BY v.created_at DESC
LIMIT 5;

\echo ''
\echo '=========================================='
\echo 'VERIFICATION COMPLETE'
\echo '=========================================='
\echo ''
\echo 'If all checks pass:'
\echo '  - No NULL dimension fields'
\echo '  - All legacy values mapped correctly'
\echo '  - All indexes created'
\echo ''
\echo 'Then migration 003 was successful!'
\echo ''
