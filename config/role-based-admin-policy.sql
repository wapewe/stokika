-- Role-based admin policy - secure and functional
-- Only users with role='admin' in the users table get full access

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
DROP POLICY IF EXISTS "users_own_profile" ON users;
DROP POLICY IF EXISTS "admin_all_access" ON users;
DROP POLICY IF EXISTS "service_role_access" ON users;

-- 2. Create a function to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create policies using the function
-- Users can view/update their own profile
CREATE POLICY "users_own_access" ON users 
FOR ALL USING (auth.uid() = id);

-- Admins can do everything (but avoid recursion by using function)
CREATE POLICY "admin_full_access" ON users 
FOR ALL USING (is_admin());

-- 4. Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;