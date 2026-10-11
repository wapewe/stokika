-- Fix existing accounts that were created but not showing in tabs
-- Run this in Supabase SQL Editor

-- First, let's see what we have
SELECT 'Users with field_agent type' as info, COUNT(*) FROM users WHERE user_type = 'field_agent';
SELECT 'Users with vendor type' as info, COUNT(*) FROM users WHERE user_type = 'vendor';
SELECT 'Users with supplier type' as info, COUNT(*) FROM users WHERE user_type = 'supplier';

-- Update field_agents that have user_id but wrong status
UPDATE field_agents 
SET approval_status = 'approved', status = 'approved'
WHERE user_id IS NOT NULL;

-- Update vendors that have user_id but wrong status  
UPDATE vendors 
SET status = 'approved'
WHERE user_id IS NOT NULL;

-- Update suppliers that have user_id but wrong status
UPDATE suppliers 
SET status = 'approved'
WHERE user_id IS NOT NULL;

-- Verify the fix
SELECT 
    'Field Agents NOW' as info,
    COUNT(*) as count
FROM field_agents 
WHERE user_id IS NOT NULL AND approval_status = 'approved'
UNION ALL
SELECT 
    'Vendors NOW',
    COUNT(*)
FROM vendors 
WHERE user_id IS NOT NULL AND status = 'approved'
UNION ALL
SELECT 
    'Suppliers NOW',
    COUNT(*)
FROM suppliers 
WHERE user_id IS NOT NULL AND status = 'approved';
