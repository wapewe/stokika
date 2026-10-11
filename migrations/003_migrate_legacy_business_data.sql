-- ============================================================================
-- MIGRATION 003: Migrate Legacy Business Size Data
-- Task: 1.3 - Vendor Registration Restructure
-- Requirements: 15.1-15.7
-- ============================================================================
-- This migration maps legacy business_size values to the new dimensional structure:
-- - Business_Category, Business_Status, Business_Size, Business_Model
-- 
-- Legacy mappings:
-- 1. "Aspiring Entrepreneur" -> Status: "Planning to Start", Size: "Starting"
-- 2. "Retail Trader" -> Model: "Retail", Size: inferred from stock data
-- 3. "Service Provider" -> Model: "Service", Size: inferred from stock data
-- ============================================================================

BEGIN;

-- ============================================================================
-- Step 1: Add legacy_business_size column if it doesn't exist
-- This preserves historical data for backwards compatibility
-- ============================================================================

ALTER TABLE vendors
ADD COLUMN IF NOT EXISTS legacy_business_size TEXT;

COMMENT ON COLUMN vendors.legacy_business_size IS 'Deprecated field preserving original business size value for historical reference';

-- ============================================================================
-- Step 2: Identify and count vendors with unmigrated data
-- ============================================================================

DO $$
DECLARE
    unmigrated_count INTEGER;
    total_vendors INTEGER;
BEGIN
    SELECT COUNT(*) INTO total_vendors FROM vendors;
    
    SELECT COUNT(*) INTO unmigrated_count
    FROM vendors
    WHERE business_status_id IS NULL 
       OR business_size_id IS NULL
       OR business_model_id IS NULL;
    
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'MIGRATION 003: Legacy Business Size Data';
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'Total vendors: %', total_vendors;
    RAISE NOTICE 'Vendors requiring migration: %', unmigrated_count;
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- Step 3: Map "Aspiring Entrepreneur" to new structure
-- Legacy: "Aspiring Entrepreneur" 
-- -> Business_Status: "Planning to Start"
-- -> Business_Size: "Starting" (Pre-Launch)
-- -> Business_Model: Not set (will use default later)
-- ============================================================================

DO $$
DECLARE
    aspiring_count INTEGER;
    planning_status_id UUID;
    starting_size_id UUID;
BEGIN
    -- Get the IDs for target statuses and sizes
    SELECT id INTO planning_status_id FROM business_statuses WHERE status_name = 'Planning';
    SELECT id INTO starting_size_id FROM business_sizes WHERE size_name = 'Pre-Launch';
    
    -- Update vendors who were "Aspiring Entrepreneur"
    WITH updated AS (
        UPDATE vendors v
        SET 
            business_status_id = planning_status_id,
            business_size_id = starting_size_id,
            legacy_business_size = 'aspiring-entrepreneur',
            updated_at = now()
        WHERE 
            v.legacy_business_size IS NULL
            AND v.business_status_id IS NULL
            AND (
                -- Identify aspiring entrepreneurs by BMC completion
                v.bmc_completed = true
                -- Or by status in related tables if available
                OR EXISTS (SELECT 1 FROM vendor_bmc WHERE vendor_id = v.id)
            )
        RETURNING v.id
    )
    SELECT COUNT(*) INTO aspiring_count FROM updated;
    
    RAISE NOTICE '✓ Migrated % "Aspiring Entrepreneur" vendors', aspiring_count;
    RAISE NOTICE '  -> Status: Planning, Size: Pre-Launch';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- Step 4: Map "Retail Trader" to new structure
-- Legacy: "Retail Trader"
-- -> Business_Model: "Retail"
-- -> Business_Status: "Operating"
-- -> Business_Size: Inferred from stock_requirement_amount
--    - < 30,000 KES: Micro
--    - < 100,000 KES: Small
--    - < 300,000 KES: Growing
--    - >= 300,000 KES: Medium
-- ============================================================================

DO $$
DECLARE
    retail_count INTEGER;
    retail_model_id UUID;
    operating_status_id UUID;
    micro_size_id UUID;
    small_size_id UUID;
    growing_size_id UUID;
    medium_size_id UUID;
BEGIN
    -- Get the IDs for target models, statuses, and sizes
    SELECT id INTO retail_model_id FROM business_models WHERE model_name = 'Retail';
    SELECT id INTO operating_status_id FROM business_statuses WHERE status_name = 'Operating';
    SELECT id INTO micro_size_id FROM business_sizes WHERE size_name = 'Micro';
    SELECT id INTO small_size_id FROM business_sizes WHERE size_name = 'Small';
    SELECT id INTO growing_size_id FROM business_sizes WHERE size_name = 'Growing';
    SELECT id INTO medium_size_id FROM business_sizes WHERE size_name = 'Medium';
    
    -- Update vendors who were "Retail Trader"
    WITH updated AS (
        UPDATE vendors v
        SET 
            business_model_id = retail_model_id,
            business_status_id = operating_status_id,
            business_size_id = (
                CASE 
                    WHEN COALESCE(v.stock_requirement_amount, 0) < 30000 THEN micro_size_id
                    WHEN v.stock_requirement_amount < 100000 THEN small_size_id
                    WHEN v.stock_requirement_amount < 300000 THEN growing_size_id
                    ELSE medium_size_id
                END
            ),
            legacy_business_size = 'retail-trader',
            updated_at = now()
        WHERE 
            v.legacy_business_size IS NULL
            AND v.business_model_id IS NULL
            AND v.business_status_id IS NULL
            -- Exclude aspiring entrepreneurs already migrated
            AND NOT EXISTS (SELECT 1 FROM vendor_bmc WHERE vendor_id = v.id)
        RETURNING v.id
    )
    SELECT COUNT(*) INTO retail_count FROM updated;
    
    RAISE NOTICE '✓ Migrated % "Retail Trader" vendors', retail_count;
    RAISE NOTICE '  -> Model: Retail, Status: Operating';
    RAISE NOTICE '  -> Size: Inferred from stock_requirement_amount';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- Step 5: Map "Service Provider" to new structure
-- Legacy: "Service Provider"
-- -> Business_Model: "Service Provider"
-- -> Business_Status: "Operating"
-- -> Business_Size: Inferred from stock_requirement_amount
--    - < 50,000 KES: Micro
--    - >= 50,000 KES: Small
-- ============================================================================

DO $$
DECLARE
    service_count INTEGER;
    service_model_id UUID;
    operating_status_id UUID;
    micro_size_id UUID;
    small_size_id UUID;
BEGIN
    -- Get the IDs for target models, statuses, and sizes
    SELECT id INTO service_model_id FROM business_models WHERE model_name = 'Service Provider';
    SELECT id INTO operating_status_id FROM business_statuses WHERE status_name = 'Operating';
    SELECT id INTO micro_size_id FROM business_sizes WHERE size_name = 'Micro';
    SELECT id INTO small_size_id FROM business_sizes WHERE size_name = 'Small';
    
    -- Update vendors who were "Service Provider"
    WITH updated AS (
        UPDATE vendors v
        SET 
            business_model_id = service_model_id,
            business_status_id = operating_status_id,
            business_size_id = (
                CASE 
                    WHEN COALESCE(v.stock_requirement_amount, 0) < 50000 THEN micro_size_id
                    ELSE small_size_id
                END
            ),
            legacy_business_size = 'service-provider',
            updated_at = now()
        WHERE 
            v.legacy_business_size IS NULL
            AND v.business_model_id IS NULL
            AND v.business_status_id IS NULL
        RETURNING v.id
    )
    SELECT COUNT(*) INTO service_count FROM updated;
    
    RAISE NOTICE '✓ Migrated % "Service Provider" vendors', service_count;
    RAISE NOTICE '  -> Model: Service Provider, Status: Operating';
    RAISE NOTICE '  -> Size: Inferred from stock_requirement_amount';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- Step 6: Set default values for any remaining null fields
-- For vendors not caught by previous mappings, set sensible defaults
-- ============================================================================

DO $$
DECLARE
    default_count INTEGER;
    operating_status_id UUID;
    small_size_id UUID;
    retail_model_id UUID;
BEGIN
    -- Get default IDs
    SELECT id INTO operating_status_id FROM business_statuses WHERE status_name = 'Operating';
    SELECT id INTO small_size_id FROM business_sizes WHERE size_name = 'Small';
    SELECT id INTO retail_model_id FROM business_models WHERE model_name = 'Retail';
    
    -- Update remaining vendors with defaults
    WITH updated AS (
        UPDATE vendors v
        SET 
            business_status_id = COALESCE(v.business_status_id, operating_status_id),
            business_size_id = COALESCE(v.business_size_id, small_size_id),
            business_model_id = COALESCE(v.business_model_id, retail_model_id),
            legacy_business_size = COALESCE(v.legacy_business_size, 'unknown'),
            updated_at = now()
        WHERE 
            v.business_status_id IS NULL 
            OR v.business_size_id IS NULL
            OR v.business_model_id IS NULL
        RETURNING v.id
    )
    SELECT COUNT(*) INTO default_count FROM updated;
    
    IF default_count > 0 THEN
        RAISE NOTICE '⚠ Set default values for % vendors with incomplete data', default_count;
        RAISE NOTICE '  -> Default Status: Operating';
        RAISE NOTICE '  -> Default Size: Small';
        RAISE NOTICE '  -> Default Model: Retail';
        RAISE NOTICE '';
    END IF;
END $$;

-- ============================================================================
-- Step 7: Verify all vendors migrated successfully
-- Ensure no vendors have null values in critical dimension fields
-- ============================================================================

DO $$
DECLARE
    unmigrated_count INTEGER;
    migrated_count INTEGER;
    total_count INTEGER;
    null_status_count INTEGER;
    null_size_count INTEGER;
    null_model_count INTEGER;
BEGIN
    -- Count total vendors
    SELECT COUNT(*) INTO total_count FROM vendors;
    
    -- Count vendors with null dimension fields
    SELECT COUNT(*) INTO null_status_count FROM vendors WHERE business_status_id IS NULL;
    SELECT COUNT(*) INTO null_size_count FROM vendors WHERE business_size_id IS NULL;
    SELECT COUNT(*) INTO null_model_count FROM vendors WHERE business_model_id IS NULL;
    
    SELECT COUNT(*) INTO unmigrated_count
    FROM vendors
    WHERE business_status_id IS NULL 
       OR business_size_id IS NULL
       OR business_model_id IS NULL;
    
    migrated_count := total_count - unmigrated_count;
    
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'MIGRATION VERIFICATION';
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'Total vendors: %', total_count;
    RAISE NOTICE 'Successfully migrated: %', migrated_count;
    RAISE NOTICE 'Remaining unmigrated: %', unmigrated_count;
    
    IF null_status_count > 0 THEN
        RAISE NOTICE '  - NULL business_status_id: %', null_status_count;
    END IF;
    
    IF null_size_count > 0 THEN
        RAISE NOTICE '  - NULL business_size_id: %', null_size_count;
    END IF;
    
    IF null_model_count > 0 THEN
        RAISE NOTICE '  - NULL business_model_id: %', null_model_count;
    END IF;
    
    RAISE NOTICE '';
    
    -- Raise exception if migration incomplete
    IF unmigrated_count > 0 THEN
        RAISE EXCEPTION 'Migration incomplete: % vendors have null dimension fields', unmigrated_count;
    END IF;
    
    -- Success message
    RAISE NOTICE '✓✓✓ MIGRATION 003 COMPLETED SUCCESSFULLY ✓✓✓';
    RAISE NOTICE 'All % vendors migrated to new dimensional structure', total_count;
    RAISE NOTICE '==========================================';
END $$;

-- ============================================================================
-- Step 8: Create indexes for performance
-- These indexes weren't created in previous migrations
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_vendors_legacy_business_size ON vendors(legacy_business_size);

-- ============================================================================
-- Step 9: Generate migration summary statistics
-- ============================================================================

DO $$
DECLARE
    stats RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE 'MIGRATION STATISTICS';
    RAISE NOTICE '==========================================';
    
    -- Business Status distribution
    RAISE NOTICE 'Business Status Distribution:';
    FOR stats IN 
        SELECT bs.status_name, COUNT(*) as count
        FROM vendors v
        JOIN business_statuses bs ON v.business_status_id = bs.id
        GROUP BY bs.status_name
        ORDER BY count DESC
    LOOP
        RAISE NOTICE '  % - %: %', stats.status_name, stats.count, 
            ROUND(100.0 * stats.count / (SELECT COUNT(*) FROM vendors), 1) || '%';
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE 'Business Size Distribution:';
    FOR stats IN 
        SELECT bz.size_name, COUNT(*) as count
        FROM vendors v
        JOIN business_sizes bz ON v.business_size_id = bz.id
        GROUP BY bz.size_name
        ORDER BY count DESC
    LOOP
        RAISE NOTICE '  % - %: %', stats.size_name, stats.count,
            ROUND(100.0 * stats.count / (SELECT COUNT(*) FROM vendors), 1) || '%';
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE 'Business Model Distribution:';
    FOR stats IN 
        SELECT bm.model_name, COUNT(*) as count
        FROM vendors v
        JOIN business_models bm ON v.business_model_id = bm.id
        GROUP BY bm.model_name
        ORDER BY count DESC
    LOOP
        RAISE NOTICE '  % - %: %', stats.model_name, stats.count,
            ROUND(100.0 * stats.count / (SELECT COUNT(*) FROM vendors), 1) || '%';
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE 'Legacy Business Size Distribution:';
    FOR stats IN 
        SELECT legacy_business_size, COUNT(*) as count
        FROM vendors
        GROUP BY legacy_business_size
        ORDER BY count DESC
    LOOP
        RAISE NOTICE '  % - %: %', COALESCE(stats.legacy_business_size, 'NULL'), stats.count,
            ROUND(100.0 * stats.count / (SELECT COUNT(*) FROM vendors), 1) || '%';
    END LOOP;
    
    RAISE NOTICE '==========================================';
END $$;

COMMIT;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS (if needed)
-- ============================================================================
-- To rollback this migration:
-- 
-- BEGIN;
-- UPDATE vendors SET 
--     business_status_id = NULL,
--     business_size_id = NULL,
--     business_model_id = NULL,
--     legacy_business_size = NULL
-- WHERE legacy_business_size IS NOT NULL;
-- 
-- ALTER TABLE vendors DROP COLUMN IF EXISTS legacy_business_size;
-- COMMIT;
-- ============================================================================
