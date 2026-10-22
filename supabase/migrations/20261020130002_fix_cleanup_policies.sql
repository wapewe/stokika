-- Migration: Fix Cleanup Admin Setup Policies
-- Description: Fixes the policy creation syntax error and properly sets up admin policies
-- Date: 2026-10-20
-- This fixes the IF NOT EXISTS error from the previous migration

-- ============================================================================
-- Step 1: Drop any existing policies (safe to run multiple times)
-- ============================================================================

DROP POLICY IF EXISTS "admin_read_all_profiles" ON profiles;
DROP POLICY IF EXISTS "users_read_own_profile" ON profiles;
DROP POLICY IF EXISTS "users_update_own_profile" ON profiles;
DROP POLICY IF EXISTS "admin_update_all_profiles" ON profiles;

-- ============================================================================
-- Step 2: Create proper admin RLS policies
-- ============================================================================

-- Admin users can read all profiles
CREATE POLICY "admin_read_all_profiles" 
ON profiles 
FOR SELECT 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles p
        INNER JOIN user_roles r ON p.role_id = r.id
        WHERE p.id = auth.uid()
        AND r.role_name IN ('admin', 'super_admin')
    )
);

-- Users can read their own profile
CREATE POLICY "users_read_own_profile" 
ON profiles 
FOR SELECT 
TO authenticated
USING (id = auth.uid());

-- Users can update their own profile (limited fields)
CREATE POLICY "users_update_own_profile" 
ON profiles 
FOR UPDATE 
TO authenticated
USING (id = auth.uid())
WITH CHECK (
    id = auth.uid() 
    AND role_id = (SELECT role_id FROM profiles WHERE id = auth.uid()) -- Cannot change role
);

-- Admin users can update any profile
CREATE POLICY "admin_update_all_profiles" 
ON profiles 
FOR UPDATE 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles p
        INNER JOIN user_roles r ON p.role_id = r.id
        WHERE p.id = auth.uid()
        AND r.role_name IN ('admin', 'super_admin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles p
        INNER JOIN user_roles r ON p.role_id = r.id
        WHERE p.id = auth.uid()
        AND r.role_name IN ('admin', 'super_admin')
    )
);

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON POLICY "admin_read_all_profiles" ON profiles IS 'Admins can read all user profiles';
COMMENT ON POLICY "users_read_own_profile" ON profiles IS 'Users can read their own profile';
COMMENT ON POLICY "users_update_own_profile" ON profiles IS 'Users can update their own profile (except role)';
COMMENT ON POLICY "admin_update_all_profiles" ON profiles IS 'Admins can update any user profile';
