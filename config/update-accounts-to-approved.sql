-- Update all accounts with user_id to approved status
-- Run this in Supabase SQL Editor

-- Update field agents with user_id to approved
UPDATE field_agents 
SET approval_status = 'approved'
WHERE user_id IS NOT NULL;

-- Update supervisors with user_id to approved
UPDATE supervisors 
SET approval_status = 'approved'
WHERE user_id IS NOT NULL;

-- Update vendors with user_id to approved
UPDATE vendors 
SET status = 'approved'
WHERE user_id IS NOT NULL;

-- Update suppliers with user_id to approved
UPDATE suppliers 
SET status = 'approved'
WHERE user_id IS NOT NULL;

-- Update users table to active status (users table uses 'active' not 'approved')
UPDATE users 
SET status = 'active'
WHERE user_type IN ('field_agent', 'supervisor', 'vendor', 'supplier');

-- Verify updates
SELECT 'Field Agents Updated:' as info, COUNT(*) as count FROM field_agents WHERE user_id IS NOT NULL AND approval_status = 'approved'
UNION ALL
SELECT 'Supervisors Updated:', COUNT(*) FROM supervisors WHERE user_id IS NOT NULL AND approval_status = 'approved'
UNION ALL
SELECT 'Vendors Updated:', COUNT(*) FROM vendors WHERE user_id IS NOT NULL AND status = 'approved'
UNION ALL
SELECT 'Suppliers Updated:', COUNT(*) FROM suppliers WHERE user_id IS NOT NULL AND status = 'approved';
