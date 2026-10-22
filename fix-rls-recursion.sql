-- Emergency fix for infinite recursion in profiles RLS policies
-- This removes the recursion by using a simpler approach

-- Step 1: Drop ALL existing policies on profiles
DROP POLICY IF EXISTS "temp_admin_setup_insert" ON profiles;
DROP POLICY IF EXISTS "temp_admin_setup_select" ON profiles;
DROP POLICY IF EXISTS "admin_read_all_profiles" ON profiles;
DROP POLICY IF EXISTS "users_read_own_profile" ON profiles;
DROP POLICY IF EXISTS "users_update_own_profile" ON profiles;
DROP POLICY IF EXISTS "admin_update_all_profiles" ON profiles;
DROP POLICY IF EXISTS "users_insert_own_profile" ON profiles;

-- Step 2: Create simple, non-recursive policies

-- Users can always read their own profile
CREATE POLICY "users_read_own_profile" 
ON profiles 
FOR SELECT 
TO authenticated
USING (id = auth.uid());

-- Users can update their own profile
CREATE POLICY "users_update_own_profile" 
ON profiles 
FOR UPDATE 
TO authenticated
USING (id = auth.uid());

-- Users can insert their own profile
CREATE POLICY "users_insert_own_profile"
ON profiles
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- Admins can read all profiles (using a subquery that doesn't cause recursion)
CREATE POLICY "admin_read_all_profiles" 
ON profiles 
FOR SELECT 
TO authenticated
USING (
    EXISTS (
        SELECT 1 
        FROM user_roles r
        WHERE r.id = (SELECT role_id FROM profiles WHERE id = auth.uid())
        AND r.role_name IN ('admin', 'super_admin')
    )
);

-- Admins can update any profile (using same non-recursive approach)
CREATE POLICY "admin_update_all_profiles" 
ON profiles 
FOR UPDATE 
TO authenticated
USING (
    EXISTS (
        SELECT 1 
        FROM user_roles r
        WHERE r.id = (SELECT role_id FROM profiles WHERE id = auth.uid())
        AND r.role_name IN ('admin', 'super_admin')
    )
);

-- Step 3: Grant permissions for anon users (for initial setup only)
-- These allow the first admin to be created
CREATE POLICY "anon_can_read_for_setup"
ON profiles
FOR SELECT
TO anon
USING (
    NOT EXISTS (
        SELECT 1 FROM profiles p
        INNER JOIN user_roles r ON p.role_id = r.id
        WHERE r.role_name IN ('admin', 'super_admin')
    )
);

CREATE POLICY "anon_can_insert_first_admin"
ON profiles
FOR INSERT
TO anon
WITH CHECK (
    NOT EXISTS (
        SELECT 1 FROM profiles p
        INNER JOIN user_roles r ON p.role_id = r.id
        WHERE r.role_name IN ('admin', 'super_admin')
    )
);
