-- Fix admin user creation and access
-- This allows admin to create users and view all users

-- 1. Drop ALL existing policies on users table
DROP POLICY IF EXISTS "Allow admin user creation" ON users;
DROP POLICY IF EXISTS "Allow user lookup" ON users;
DROP POLICY IF EXISTS "Allow admin user update" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can update all users" ON users;
DROP POLICY IF EXISTS "Admins can insert users" ON users;
DROP POLICY IF EXISTS "Admin can view all users" ON users;
DROP POLICY IF EXISTS "Admin can update all users" ON users;
DROP POLICY IF EXISTS "Admin can insert users" ON users;
DROP POLICY IF EXISTS "user_own_profile_select" ON users;
DROP POLICY IF EXISTS "user_own_profile_update" ON users;
DROP POLICY IF EXISTS "admin_select_all" ON users;
DROP POLICY IF EXISTS "admin_update_all" ON users;
DROP POLICY IF EXISTS "admin_insert_all" ON users;

-- 2. Create new policies with your admin UUID
CREATE POLICY "users_select_own" ON users 
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_update_own" ON users 
FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "admin_full_access_select" ON users 
FOR SELECT USING (auth.uid() = '108e6bf0-c199-4374-a61e-0652b4901de2'::uuid);

CREATE POLICY "admin_full_access_update" ON users 
FOR UPDATE USING (auth.uid() = '108e6bf0-c199-4374-a61e-0652b4901de2'::uuid);

CREATE POLICY "admin_full_access_insert" ON users 
FOR INSERT WITH CHECK (auth.uid() = '108e6bf0-c199-4374-a61e-0652b4901de2'::uuid);

CREATE POLICY "admin_full_access_delete" ON users 
FOR DELETE USING (auth.uid() = '108e6bf0-c199-4374-a61e-0652b4901de2'::uuid);

-- 3. Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;