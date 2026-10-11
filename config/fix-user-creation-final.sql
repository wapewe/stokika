-- Final fix for user creation and viewing
-- Allows both admin user and service role access

-- 1. Drop ALL existing policies
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
DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "admin_full_access_select" ON users;
DROP POLICY IF EXISTS "admin_full_access_update" ON users;
DROP POLICY IF EXISTS "admin_full_access_insert" ON users;
DROP POLICY IF EXISTS "admin_full_access_delete" ON users;

-- 2. Create simple policies that work
-- Allow users to see their own profile
CREATE POLICY "users_own_profile" ON users 
FOR ALL USING (auth.uid() = id);

-- Allow admin full access using your UUID
CREATE POLICY "admin_all_access" ON users 
FOR ALL USING (auth.uid() = '108e6bf0-c199-4374-a61e-0652b4901de2'::uuid);

-- Allow service role (for user creation via admin dashboard)
CREATE POLICY "service_role_access" ON users 
FOR ALL USING (auth.role() = 'service_role');

-- 3. Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;