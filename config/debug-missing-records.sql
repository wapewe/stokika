-- Debug: Check what users exist vs what records exist in respective tables

-- Show all users
SELECT 'ALL USERS' as table_name, id, name, email, user_type FROM users ORDER BY created_at DESC;

-- Show field_agents (all records)
SELECT 'FIELD_AGENTS' as table_name, id, user_id, full_name, email, approval_status FROM field_agents ORDER BY created_at DESC;

-- Show vendors (all records)
SELECT 'VENDORS' as table_name, id, user_id, business_name, email, status FROM vendors ORDER BY created_at DESC;

-- Show suppliers (all records)
SELECT 'SUPPLIERS' as table_name, id, user_id, company_name, email, status FROM suppliers ORDER BY created_at DESC;

-- Show supervisors (all records)
SELECT 'SUPERVISORS' as table_name, id, user_id, full_name, email, approval_status FROM supervisors ORDER BY created_at DESC;

-- Find orphaned users (users without corresponding records)
SELECT 
    'ORPHANED FIELD AGENTS' as issue,
    u.id,
    u.name,
    u.email,
    u.user_type
FROM users u
LEFT JOIN field_agents fa ON u.id = fa.user_id
WHERE u.user_type = 'field_agent' AND fa.id IS NULL;

SELECT 
    'ORPHANED VENDORS' as issue,
    u.id,
    u.name,
    u.email,
    u.user_type
FROM users u
LEFT JOIN vendors v ON u.id = v.user_id
WHERE u.user_type = 'vendor' AND v.id IS NULL;

SELECT 
    'ORPHANED SUPPLIERS' as issue,
    u.id,
    u.name,
    u.email,
    u.user_type
FROM users u
LEFT JOIN suppliers s ON u.id = s.user_id
WHERE u.user_type = 'supplier' AND s.id IS NULL;
