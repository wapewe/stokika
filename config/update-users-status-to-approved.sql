-- Update users table status constraint and values
-- Run this in Supabase SQL Editor

-- Step 1: Drop the existing check constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check;

-- Step 2: Add new check constraint that includes 'approved'
ALTER TABLE users ADD CONSTRAINT users_status_check 
CHECK (status IN ('approved', 'pending', 'suspended', 'inactive', 'active'));

-- Step 3: Update all users with status 'active' to 'approved'
UPDATE users 
SET status = 'approved' 
WHERE status = 'active';

-- Step 4: Remove 'active' from allowed values (optional - only if you want to prevent future 'active' values)
-- ALTER TABLE users DROP CONSTRAINT users_status_check;
-- ALTER TABLE users ADD CONSTRAINT users_status_check 
-- CHECK (status IN ('approved', 'pending', 'suspended', 'inactive'));

-- Verify the update
SELECT id, name, email, user_type, status, created_at 
FROM users 
ORDER BY created_at DESC;
