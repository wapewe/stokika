-- Diagnostic script to check account statuses
-- Run this in Supabase SQL Editor to see what's in your database

-- Check field agents
SELECT 
    'FIELD AGENTS' as table_name,
    id,
    full_name,
    email,
    user_id,
    approval_status,
    CASE WHEN user_id IS NOT NULL THEN 'HAS USER_ID' ELSE 'NO USER_ID' END as has_account
FROM field_agents
ORDER BY created_at DESC;

-- Check supervisors
SELECT 
    'SUPERVISORS' as table_name,
    id,
    full_name,
    email,
    user_id,
    approval_status,
    CASE WHEN user_id IS NOT NULL THEN 'HAS USER_ID' ELSE 'NO USER_ID' END as has_account
FROM supervisors
ORDER BY created_at DESC;

-- Check vendors
SELECT 
    'VENDORS' as table_name,
    id,
    business_name as name,
    email,
    user_id,
    status,
    CASE WHEN user_id IS NOT NULL THEN 'HAS USER_ID' ELSE 'NO USER_ID' END as has_account
FROM vendors
ORDER BY created_at DESC;

-- Check suppliers
SELECT 
    'SUPPLIERS' as table_name,
    id,
    company_name as name,
    email,
    user_id,
    status,
    CASE WHEN user_id IS NOT NULL THEN 'HAS USER_ID' ELSE 'NO USER_ID' END as has_account
FROM suppliers
ORDER BY created_at DESC;

-- Summary counts
SELECT 
    'Field Agents with user_id AND approved' as category,
    COUNT(*) as count
FROM field_agents 
WHERE user_id IS NOT NULL AND approval_status = 'approved'
UNION ALL
SELECT 
    'Supervisors with user_id AND approved',
    COUNT(*)
FROM supervisors 
WHERE user_id IS NOT NULL AND approval_status = 'approved'
UNION ALL
SELECT 
    'Vendors with user_id AND approved',
    COUNT(*)
FROM vendors 
WHERE user_id IS NOT NULL AND status = 'approved'
UNION ALL
SELECT 
    'Suppliers with user_id AND approved',
    COUNT(*)
FROM suppliers 
WHERE user_id IS NOT NULL AND status = 'approved';
