-- Admin RLS Solution - No Recursion
-- Creates separate admin tracking to avoid infinite recursion

-- 1. Drop ALL existing policies on users table
DROP POLICY IF EXISTS "Allow admin user creation" ON users;
DROP POLICY IF EXISTS "Allow user lookup" ON users;
DROP POLICY IF EXISTS "Allow admin user update" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can update all users" ON users;

-- 2. Create admin_users table for role tracking (if not exists)
CREATE TABLE IF NOT EXISTS admin_users (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Insert your admin user ID (replace with actual UUID from get-admin-uuid.sql)
INSERT INTO admin_users (user_id) 
SELECT id FROM users WHERE email = 'stokikakenya@gmail.com'
ON CONFLICT (user_id) DO NOTHING;

-- 4. Create RLS policies using admin_users table
CREATE POLICY "Users can view own profile" ON users 
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users 
FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON users 
FOR SELECT USING (
  EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
);

CREATE POLICY "Admins can update all users" ON users 
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
);

CREATE POLICY "Admins can insert users" ON users 
FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
);

-- 5. Enable RLS on both tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- 6. Allow admins to read admin_users table
CREATE POLICY "Admins can read admin_users" ON admin_users
FOR SELECT USING (user_id = auth.uid());