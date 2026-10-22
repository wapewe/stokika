-- Migration: Create Admin Setup Function
-- Description: Creates function and temporary policies to set up the first admin user
-- Date: 2026-10-20

-- ============================================================================
-- Step 1: Create temporary RLS policies for admin setup
-- ============================================================================

-- Enable RLS if not already enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing admin setup policies if they exist
DROP POLICY IF EXISTS "temp_admin_setup_insert" ON profiles;
DROP POLICY IF EXISTS "temp_admin_setup_select" ON profiles;

-- Create temporary policies for initial admin setup
-- These allow anonymous users to create and query the first admin profile
CREATE POLICY "temp_admin_setup_insert" 
ON profiles 
FOR INSERT 
TO anon, authenticated
WITH CHECK (
    -- Only allow insert if no admin exists yet
    NOT EXISTS (
        SELECT 1 FROM profiles p
        INNER JOIN user_roles r ON p.role_id = r.id
        WHERE r.role_name IN ('admin', 'super_admin')
    )
);

CREATE POLICY "temp_admin_setup_select" 
ON profiles 
FOR SELECT 
TO anon, authenticated
USING (true);

-- ============================================================================
-- Step 2: Create admin setup function
-- ============================================================================

CREATE OR REPLACE FUNCTION setup_first_admin(
    admin_email TEXT,
    admin_password TEXT,
    admin_name TEXT DEFAULT 'System Administrator'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_admin_role_id UUID;
    v_result JSON;
    v_error TEXT;
BEGIN
    -- Check if admin already exists
    IF EXISTS (
        SELECT 1 FROM profiles p
        INNER JOIN user_roles r ON p.role_id = r.id
        WHERE r.role_name IN ('admin', 'super_admin')
    ) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Admin user already exists',
            'code', 'ADMIN_EXISTS'
        );
    END IF;

    -- Get admin role ID
    SELECT id INTO v_admin_role_id
    FROM user_roles
    WHERE role_name = 'admin';

    IF v_admin_role_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Admin role not found in user_roles table',
            'code', 'ROLE_NOT_FOUND'
        );
    END IF;

    -- Note: Auth user creation must be done via Supabase Auth API
    -- This function only handles the profile creation
    -- The calling code should:
    -- 1. First create auth user via supabase.auth.signUp()
    -- 2. Then call this function with the resulting user_id

    RETURN json_build_object(
        'success', true,
        'admin_role_id', v_admin_role_id,
        'message', 'Ready to create admin profile'
    );

EXCEPTION
    WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_error = MESSAGE_TEXT;
        RETURN json_build_object(
            'success', false,
            'error', v_error,
            'code', 'FUNCTION_ERROR'
        );
END;
$$;

-- ============================================================================
-- Step 3: Create function to insert admin profile
-- ============================================================================

CREATE OR REPLACE FUNCTION insert_admin_profile(
    p_user_id UUID,
    p_email TEXT,
    p_full_name TEXT,
    p_phone_number TEXT DEFAULT '254700000000'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_admin_role_id UUID;
    v_result JSON;
    v_error TEXT;
BEGIN
    -- Check if admin already exists
    IF EXISTS (
        SELECT 1 FROM profiles p
        INNER JOIN user_roles r ON p.role_id = r.id
        WHERE r.role_name IN ('admin', 'super_admin')
    ) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Admin user already exists',
            'code', 'ADMIN_EXISTS'
        );
    END IF;

    -- Get admin role ID
    SELECT id INTO v_admin_role_id
    FROM user_roles
    WHERE role_name = 'admin';

    IF v_admin_role_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Admin role not found',
            'code', 'ROLE_NOT_FOUND'
        );
    END IF;

    -- Insert admin profile
    INSERT INTO profiles (
        id,
        email,
        full_name,
        phone_number,
        role_id,
        is_active,
        email_verified,
        phone_verified
    ) VALUES (
        p_user_id,
        p_email,
        p_full_name,
        p_phone_number,
        v_admin_role_id,
        true,
        true,
        false
    );

    RETURN json_build_object(
        'success', true,
        'user_id', p_user_id,
        'role_id', v_admin_role_id,
        'message', 'Admin profile created successfully'
    );

EXCEPTION
    WHEN unique_violation THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Profile already exists for this user',
            'code', 'DUPLICATE_PROFILE'
        );
    WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_error = MESSAGE_TEXT;
        RETURN json_build_object(
            'success', false,
            'error', v_error,
            'code', 'INSERT_ERROR'
        );
END;
$$;

-- ============================================================================
-- Step 4: Grant execute permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION setup_first_admin(TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION insert_admin_profile(UUID, TEXT, TEXT, TEXT) TO anon, authenticated;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON FUNCTION setup_first_admin IS 'Checks if admin can be created and returns admin role ID';
COMMENT ON FUNCTION insert_admin_profile IS 'Inserts admin profile into profiles table (call after auth.signUp)';
COMMENT ON POLICY "temp_admin_setup_insert" ON profiles IS 'TEMPORARY: Allows first admin creation - remove after setup';
COMMENT ON POLICY "temp_admin_setup_select" ON profiles IS 'TEMPORARY: Allows admin verification - remove after setup';

-- ============================================================================
-- IMPORTANT: Cleanup Instructions
-- ============================================================================

-- After successfully creating the first admin user, run this cleanup:
/*
DROP POLICY IF EXISTS "temp_admin_setup_insert" ON profiles;
DROP POLICY IF EXISTS "temp_admin_setup_select" ON profiles;
DROP FUNCTION IF EXISTS setup_first_admin(TEXT, TEXT, TEXT);
-- Keep insert_admin_profile function but revoke anon access:
REVOKE EXECUTE ON FUNCTION insert_admin_profile(UUID, TEXT, TEXT, TEXT) FROM anon;
*/
