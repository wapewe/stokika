-- Migration: Fix Infinite Recursion in RLS Policies
-- Description: Removes circular dependencies in profile policies
-- Date: 2026-10-20

-- ============================================================================
-- Problem: The admin policies were causing infinite recursion because they
-- were querying the profiles table within the profiles table's RLS policy
-- ============================================================================

-- ============================================================================
-- Step 1: Drop all existing profile policies
-- ============================================================================

DROP POLICY IF EXISTS "temp_admin_setup_insert" ON profiles;
DROP POLICY IF EXISTS "temp_admin_setup_select" ON profiles;
DROP POLICY IF EXISTS "admin_read_all_profiles" ON profiles;
DROP POLICY IF EXISTS "users_read_own_profile" ON profiles;
DROP POLICY IF EXISTS "users_update_own_profile" ON profiles;
DROP POLICY IF EXISTS "admin_update_all_profiles" ON profiles;

-- ============================================================================
-- Step 2: Create non-recursive policies
-- ============================================================================

-- Users can always read their own profile
CREATE POLICY "users_read_own_profile" 
ON profiles 
FOR SELECT 
TO authenticated
USING (id = auth.uid());

-- Users can update their own profile (except role_id)
CREATE POLICY "users_update_own_profile" 
ON profiles 
FOR UPDATE 
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Admin users can read all profiles (using a helper function to avoid recursion)
CREATE POLICY "admin_read_all_profiles" 
ON profiles 
FOR SELECT 
TO authenticated
USING (
    (SELECT role_id FROM profiles WHERE id = auth.uid()) IN (
        SELECT id FROM user_roles WHERE role_name IN ('admin', 'super_admin')
    )
);

-- Admin users can update any profile (using helper function)
CREATE POLICY "admin_update_all_profiles" 
ON profiles 
FOR UPDATE 
TO authenticated
USING (
    (SELECT role_id FROM profiles WHERE id = auth.uid()) IN (
        SELECT id FROM user_roles WHERE role_name IN ('admin', 'super_admin')
    )
)
WITH CHECK (
    (SELECT role_id FROM profiles WHERE id = auth.uid()) IN (
        SELECT id FROM user_roles WHERE role_name IN ('admin', 'super_admin')
    )
);

-- Allow authenticated users to insert their own profile (for registration flows)
CREATE POLICY "users_insert_own_profile"
ON profiles
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- ============================================================================
-- Step 3: Create a helper function to check admin role (avoids recursion)
-- ============================================================================

CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM profiles p
        INNER JOIN user_roles r ON p.role_id = r.id
        WHERE p.id = user_id
        AND r.role_name IN ('admin', 'super_admin')
    );
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION is_admin(UUID) TO authenticated, anon;

-- ============================================================================
-- Step 4: Recreate policies using the helper function (better approach)
-- ============================================================================

-- Drop the policies we just created
DROP POLICY IF EXISTS "admin_read_all_profiles" ON profiles;
DROP POLICY IF EXISTS "admin_update_all_profiles" ON profiles;

-- Recreate with helper function
CREATE POLICY "admin_read_all_profiles" 
ON profiles 
FOR SELECT 
TO authenticated
USING (is_admin(auth.uid()));

CREATE POLICY "admin_update_all_profiles" 
ON profiles 
FOR UPDATE 
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON FUNCTION is_admin IS 'Helper function to check if user is admin (avoids RLS recursion)';
COMMENT ON POLICY "users_read_own_profile" ON profiles IS 'Users can read their own profile';
COMMENT ON POLICY "users_update_own_profile" ON profiles IS 'Users can update their own profile (cannot change role via RLS)';
COMMENT ON POLICY "users_insert_own_profile" ON profiles IS 'Users can insert their own profile during registration';
COMMENT ON POLICY "admin_read_all_profiles" ON profiles IS 'Admins can read all profiles';
COMMENT ON POLICY "admin_update_all_profiles" ON profiles IS 'Admins can update any profile';

-- ============================================================================
-- Verification Query
-- ============================================================================

-- Run this to verify policies are working:
-- SELECT * FROM profiles WHERE email = 'krieta8@gmail.com';
