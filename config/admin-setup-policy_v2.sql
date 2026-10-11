-- Comprehensive Admin Setup Policy
-- Run this in Supabase SQL Editor BEFORE creating admin user

-- 1. Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow admin user creation" ON users;
DROP POLICY IF EXISTS "Allow user lookup" ON users;
DROP POLICY IF EXISTS "Allow admin user update" ON users;

-- 2. Create new policies
CREATE POLICY "Allow admin user creation" ON users 
FOR INSERT TO anon, authenticated 
WITH CHECK (true);

CREATE POLICY "Allow user lookup" ON users 
FOR SELECT TO anon, authenticated 
USING (true);

CREATE POLICY "Allow admin user update" ON users 
FOR UPDATE TO anon, authenticated 
USING (true)
WITH CHECK (true);

-- Note: After admin is successfully created, run the cleanup script:
-- admin-cleanup-policy.sql to restore proper security