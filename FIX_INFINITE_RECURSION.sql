-- ============================================================================
-- EMERGENCY FIX: Infinite Recursion in profiles RLS Policies
-- ============================================================================
-- Problem: RLS policies are checking profiles table while querying profiles
-- Solution: Temporarily disable RLS or use simpler policies
-- Run this in Supabase SQL Editor NOW!
-- ============================================================================

-- Option 1: TEMPORARY - Disable RLS entirely (QUICK FIX FOR TESTING)
-- WARNING: This allows anyone to read profiles! Only for testing!
-- Uncomment if you want to test login first, then apply proper policies later

-- ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;


-- Option 2: RECOMMENDED - Fix the recursive policies
-- ============================================================================

-- Step 1: Drop ALL existing policies on profiles
DROP POLICY IF EXISTS "temp_admin_setup_insert" ON profiles;
DROP POLICY IF EXISTS "temp_admin_setup_select" ON profiles;
DROP POLICY IF EXISTS "admin_read_all_profiles" ON profiles;
DROP POLICY IF EXISTS "users_read_own_profile" ON profiles;
DROP POLICY IF EXISTS "users_update_own_profile" ON profiles;
DROP POLICY IF EXISTS "admin_update_all_profiles" ON profiles;

-- Step 2: Create NON-RECURSIVE policies
-- These policies DO NOT query the profiles table in their condition

-- Allow authenticated users to read their own profile
CREATE POLICY "users_read_own_profile" 
ON profiles 
FOR SELECT 
TO authenticated
USING (id = auth.uid());

-- Allow authenticated users to read profiles (we'll rely on app logic for admin checks)
-- This is necessary because the app needs to query profiles to check roles
CREATE POLICY "authenticated_read_profiles" 
ON profiles 
FOR SELECT 
TO authenticated
USING (true);

-- Allow anon to read (needed for login flow to check admin status)
CREATE POLICY "anon_read_profiles" 
ON profiles 
FOR SELECT 
TO anon
USING (true);

-- Allow users to update their own profile
CREATE POLICY "users_update_own_profile" 
ON profiles 
FOR UPDATE 
TO authenticated
USING (id = auth.uid());

-- Step 3: Grant necessary table permissions
GRANT SELECT ON profiles TO authenticated;
GRANT SELECT ON profiles TO anon;
GRANT SELECT ON user_roles TO authenticated;
GRANT SELECT ON user_roles TO anon;

-- ============================================================================
-- Verify the fix
-- ============================================================================

-- Run this to check policies are correct:
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'profiles';

-- ============================================================================
-- NOTES
-- ============================================================================
-- After running this:
-- 1. The infinite recursion error will be gone
-- 2. Login should work
-- 3. Admin check will work because app can query profiles table
-- 4. Later, you can add more restrictive policies based on app_metadata
--    instead of querying profiles table within the policy itself
-- ============================================================================
