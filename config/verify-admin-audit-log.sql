-- Verification Script for admin_audit_log table
-- Run this after deploying admin-audit-log-table.sql to verify the table structure

-- Check if table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public'
    AND table_name = 'admin_audit_log'
) AS table_exists;

-- Verify table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'admin_audit_log'
ORDER BY ordinal_position;

-- Verify indexes
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'admin_audit_log'
ORDER BY indexname;

-- Verify RLS is enabled
SELECT 
    tablename,
    rowsecurity AS rls_enabled
FROM pg_tables
WHERE tablename = 'admin_audit_log';

-- Verify RLS policies
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'admin_audit_log'
ORDER BY policyname;

-- Verify foreign key constraint to users table
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name = 'admin_audit_log';

-- Test insert (optional - remove after verification)
-- Note: This will only work if you have an admin user in the users table
/*
INSERT INTO admin_audit_log (admin_id, action, details)
VALUES (
    (SELECT id FROM users WHERE user_type = 'admin' LIMIT 1),
    'test_action',
    '{"test": "verification", "status": "success"}'::jsonb
)
RETURNING *;

-- Clean up test record
DELETE FROM admin_audit_log WHERE action = 'test_action';
*/
