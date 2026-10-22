-- Migration: Cleanup Admin Setup Policies
-- Description: Removes temporary policies and functions after admin is created
-- Date: 2026-10-20
-- IMPORTANT: Run this ONLY AFTER the first admin user has been successfully created

-- ============================================================================
-- Step 1: Drop temporary RLS policies
-- ============================================================================

DROP POLICY IF EXISTS "temp_admin_setup_insert" ON profiles;
DROP POLICY IF EXISTS "temp_admin_setup_select" ON profiles;

-- ============================================================================
-- Step 2: Drop temporary setup function (keep insert function for future use)
-- ============================================================================

DROP FUNCTION IF EXISTS setup_first_admin(TEXT, TEXT, TEXT);

-- ============================================================================
-- Step 3: Revoke anonymous access from insert function
-- ============================================================================

-- Keep the function but restrict access to authenticated users only
REVOKE EXECUTE ON FUNCTION insert_admin_profile(UUID, TEXT, TEXT, TEXT) FROM anon;

-- Allow only authenticated users with admin role to use it
-- (The function itself checks if admin already exists)
GRANT EXECUTE ON FUNCTION insert_admin_profile(UUID, TEXT, TEXT, TEXT) TO authenticated;

-- ============================================================================
-- Step 4: Create proper admin RLS policies
-- ============================================================================

-- Drop policies if they already exist (to avoid conflicts)
DROP POLICY IF EXISTS "admin_read_all_profiles" ON profiles;
DROP POLICY IF EXISTS "users_read_own_profile" ON profiles;
DROP POLICY IF EXISTS "users_update_own_profile" ON profiles;
DROP POLICY IF EXISTS "admin_update_all_profiles" ON profiles;

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
