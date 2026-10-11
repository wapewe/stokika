-- Fixed Admin Policies - No Recursion
-- This fixes the infinite recursion error

-- 1. Drop ALL existing policies on users table
DROP POLICY IF EXISTS "Allow admin user creation" ON users;
DROP POLICY IF EXISTS "Allow user lookup" ON users;
DROP POLICY IF EXISTS "Allow admin user update" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can update all users" ON users;

-- 2. Create simple policies without recursion
-- Allow users to view their own profile
CREATE POLICY "Users can view own profile" ON users 
FOR SELECT USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile" ON users 
FOR UPDATE USING (auth.uid() = id);

-- Allow admin user (specific UUID) to view all users
CREATE POLICY "Admin can view all users" ON users 
FOR SELECT USING (auth.uid() = 'YOUR_ADMIN_UUID_HERE'::uuid);

-- Allow admin user to update all users
CREATE POLICY "Admin can update all users" ON users 
FOR UPDATE USING (auth.uid() = 'YOUR_ADMIN_UUID_HERE'::uuid);

-- Allow admin user to insert new users
CREATE POLICY "Admin can insert users" ON users 
FOR INSERT WITH CHECK (auth.uid() = 'YOUR_ADMIN_UUID_HERE'::uuid);

-- 3. Ensure RLS is enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;