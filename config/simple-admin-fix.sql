-- Simple admin fix - temporarily disable RLS for development
-- You can re-enable with proper policies later

-- 1. Drop all policies
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
DROP POLICY IF EXISTS "users_own_profile" ON users;
DROP POLICY IF EXISTS "admin_all_access" ON users;
DROP POLICY IF EXISTS "service_role_access" ON users;
DROP POLICY IF EXISTS "admin_full_access" ON users;

-- 2. Disable RLS temporarily for development
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Note: Re-enable RLS in production with proper policies