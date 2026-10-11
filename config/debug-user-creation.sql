-- Debug user creation issue
-- Check current policies and test admin access

-- 1. Check current policies on users table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'users';

-- 2. Test admin user access
SELECT auth.uid() as current_user_id;

-- 3. Check if admin can select from users table
SELECT COUNT(*) as user_count FROM users;

-- 4. Test if admin UUID matches policy
SELECT '108e6bf0-c199-4374-a61e-0652b4901de2'::uuid = auth.uid() as admin_match;