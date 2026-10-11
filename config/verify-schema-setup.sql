-- Schema Verification Script
-- Run this after executing all schema files to verify setup

-- ============================================
-- 1. CHECK ALL TABLES EXIST
-- ============================================
DO $$
DECLARE
    expected_tables TEXT[] := ARRAY[
        'users', 'field_agents', 'agent_documents', 'vendors', 'vendor_registrations',
        'suppliers', 'supervisors', 'supervisor_applications', 'products', 'orders',
        'order_items', 'payments', 'inventory', 'contacts', 'newsletter_subscribers',
        'email_logs', 'website_settings', 'audit_logs', 'supplier_ratings',
        'loyalty_points', 'loyalty_transactions', 'favorite_suppliers', 'tasks',
        'saved_searches', 'user_preferences', 'rate_limits', 'otp_verifications',
        'security_audit_log', 'user_sessions', 'notifications', 'activity_log',
        'system_settings', 'user_locations', 'vendor_visits', 'performance_metrics',
        'predictions', 'vendor_locations', 'onboarding_steps', 'training_modules',
        'training_progress', 'onboarding_documents', 'onboarding_metrics',
        'onboarding_notifications', 'first_assignments', 'deliveries',
        'product_categories', 'shopping_carts', 'cart_items', 'loyalty_programs',
        'sms_templates', 'sms_logs', 'conversations', 'messages',
        'financial_summaries', 'bulk_operations'
    ];
    table_name TEXT;
    missing_tables TEXT[] := ARRAY[]::TEXT[];
    table_exists BOOLEAN;
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'CHECKING TABLES...';
    RAISE NOTICE '============================================';
    
    FOREACH table_name IN ARRAY expected_tables
    LOOP
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = table_name
        ) INTO table_exists;
        
        IF NOT table_exists THEN
            missing_tables := array_append(missing_tables, table_name);
        END IF;
    END LOOP;
    
    IF array_length(missing_tables, 1) IS NULL THEN
        RAISE NOTICE '✅ All % expected tables exist!', array_length(expected_tables, 1);
    ELSE
        RAISE NOTICE '❌ Missing tables: %', array_to_string(missing_tables, ', ');
    END IF;
END $$;

-- ============================================
-- 2. CHECK CRITICAL FUNCTIONS EXIST
-- ============================================
DO $$
DECLARE
    expected_functions TEXT[] := ARRAY[
        'update_updated_at_column',
        'check_rate_limit',
        'generate_otp',
        'verify_otp',
        'calculate_distance',
        'log_audit',
        'initialize_onboarding',
        'update_onboarding_progress',
        'check_training_completion'
    ];
    function_name TEXT;
    missing_functions TEXT[] := ARRAY[]::TEXT[];
    function_exists BOOLEAN;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'CHECKING FUNCTIONS...';
    RAISE NOTICE '============================================';
    
    FOREACH function_name IN ARRAY expected_functions
    LOOP
        SELECT EXISTS (
            SELECT FROM pg_proc 
            WHERE proname = function_name
        ) INTO function_exists;
        
        IF NOT function_exists THEN
            missing_functions := array_append(missing_functions, function_name);
        END IF;
    END LOOP;
    
    IF array_length(missing_functions, 1) IS NULL THEN
        RAISE NOTICE '✅ All % expected functions exist!', array_length(expected_functions, 1);
    ELSE
        RAISE NOTICE '❌ Missing functions: %', array_to_string(missing_functions, ', ');
    END IF;
END $$;

-- ============================================
-- 3. CHECK RLS IS ENABLED
-- ============================================
SELECT 
    '============================================' as separator
UNION ALL
SELECT 'CHECKING ROW LEVEL SECURITY...'
UNION ALL
SELECT '============================================';

SELECT 
    schemaname,
    tablename,
    CASE WHEN rowsecurity THEN '✅ Enabled' ELSE '❌ Disabled' END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
    'users', 'vendors', 'suppliers', 'field_agents', 'supervisors',
    'orders', 'payments', 'onboarding_steps', 'training_progress',
    'deliveries', 'products', 'shopping_carts', 'messages'
)
ORDER BY tablename;

-- ============================================
-- 4. COUNT POLICIES PER TABLE
-- ============================================
SELECT 
    '============================================' as separator
UNION ALL
SELECT 'POLICY COUNT BY TABLE...'
UNION ALL
SELECT '============================================';

SELECT 
    tablename,
    COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY policy_count DESC, tablename
LIMIT 20;

-- ============================================
-- 5. CHECK TRIGGERS
-- ============================================
SELECT 
    '============================================' as separator
UNION ALL
SELECT 'CHECKING TRIGGERS...'
UNION ALL
SELECT '============================================';

SELECT 
    event_object_table as table_name,
    trigger_name,
    event_manipulation as trigger_event
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name LIKE '%updated_at%'
ORDER BY event_object_table;

-- ============================================
-- 6. CHECK INDEXES
-- ============================================
SELECT 
    '============================================' as separator
UNION ALL
SELECT 'SAMPLE INDEXES...'
UNION ALL
SELECT '============================================';

SELECT 
    tablename,
    indexname
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('users', 'vendors', 'orders', 'field_agents', 'onboarding_steps')
ORDER BY tablename, indexname
LIMIT 20;

-- ============================================
-- 7. FINAL SUMMARY
-- ============================================
DO $$
DECLARE
    table_count INTEGER;
    policy_count INTEGER;
    trigger_count INTEGER;
    function_count INTEGER;
    index_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count FROM information_schema.tables WHERE table_schema = 'public';
    SELECT COUNT(*) INTO policy_count FROM pg_policies WHERE schemaname = 'public';
    SELECT COUNT(*) INTO trigger_count FROM information_schema.triggers WHERE trigger_schema = 'public';
    SELECT COUNT(*) INTO function_count FROM pg_proc WHERE pronamespace = 'public'::regnamespace;
    SELECT COUNT(*) INTO index_count FROM pg_indexes WHERE schemaname = 'public';
    
    RAISE NOTICE '';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'FINAL SUMMARY';
    RAISE NOTICE '============================================';
    RAISE NOTICE '📊 Total Tables: %', table_count;
    RAISE NOTICE '🔐 Total Policies: %', policy_count;
    RAISE NOTICE '⚡ Total Triggers: %', trigger_count;
    RAISE NOTICE '🔧 Total Functions: %', function_count;
    RAISE NOTICE '📈 Total Indexes: %', index_count;
    RAISE NOTICE '============================================';
    RAISE NOTICE '✅ Schema verification complete!';
    RAISE NOTICE '============================================';
END $$;
