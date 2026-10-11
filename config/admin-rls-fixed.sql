-- Admin RLS Fixed - Direct UUID approach
-- Uses your specific admin UUID to avoid any recursion issues

-- 1. Drop ALL existing policies on users table
DROP POLICY IF EXISTS "Allow admin user creation" ON users;
DROP POLICY IF EXISTS "Allow user lookup" ON users;
DROP POLICY IF EXISTS "Allow admin user update" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can update all users" ON users;
DROP POLICY IF EXISTS "Admins can insert users" ON users;

-- 2. Create RLS policies using your specific admin UUID
CREATE POLICY "Users can view own profile" ON users 
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users 
FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admin can view all users" ON users 
FOR SELECT USING (auth.uid() = '108e6bf0-c199-4374-a61e-0652b4901de2'::uuid);

CREATE POLICY "Admin can update all users" ON users 
FOR UPDATE USING (auth.uid() = '108e6bf0-c199-4374-a61e-0652b4901de2'::uuid);

CREATE POLICY "Admin can insert users" ON users 
FOR INSERT WITH CHECK (auth.uid() = '108e6bf0-c199-4374-a61e-0652b4901de2'::uuid);

-- 3. Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;