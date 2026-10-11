-- Fix Admin User Access
-- Run this in Supabase SQL Editor to ensure admin user has correct permissions

-- 1. Check current admin users
SELECT id, email, user_type, role, status 
FROM users 
WHERE user_type = 'admin' OR role = 'admin';

-- 2. If your admin user exists but doesn't have admin role, update it
-- Replace 'your-admin-email@example.com' with your actual admin email
UPDATE users 
SET 
    user_type = 'admin',
    role = 'admin',
    status = 'active'
WHERE email = 'your-admin-email@example.com';

-- 3. Verify the update
SELECT id, email, user_type, role, status 
FROM users 
WHERE email = 'your-admin-email@example.com';

-- 4. If admin user doesn't exist, create one
-- Replace with your actual admin details
INSERT INTO users (email, user_type, role, status, created_at)
VALUES ('admin@stokika.com', 'admin', 'admin', 'active', NOW())
ON CONFLICT (email) 
DO UPDATE SET 
    user_type = 'admin',
    role = 'admin',
    status = 'active';
