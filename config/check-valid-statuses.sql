-- Check what status values are allowed in each table

-- Check vendors table constraint
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'vendors'::regclass
AND conname LIKE '%status%';

-- Check suppliers table constraint
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'suppliers'::regclass
AND conname LIKE '%status%';

-- Check field_agents table constraint
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'field_agents'::regclass
AND conname LIKE '%status%';

-- Check what status values exist in vendors
SELECT DISTINCT status FROM vendors;

-- Check what status values exist in suppliers
SELECT DISTINCT status FROM suppliers;

-- Check what approval_status values exist in field_agents
SELECT DISTINCT approval_status FROM field_agents;
