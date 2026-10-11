-- Quick Fix for Admin Access
-- Run this in Supabase SQL Editor

-- Step 1: Update your existing user to be admin
UPDATE users 
SET 
    user_type = 'admin',
    role = 'admin',
    status = 'active'
WHERE email = 'stokikakenya@gmail.com';

-- Step 2: Sync metadata to auth.users
UPDATE auth.users
SET raw_user_meta_data = jsonb_build_object(
    'user_type', 'admin',
    'role', 'admin',
    'email', 'stokikakenya@gmail.com'
)
WHERE email = 'stokikakenya@gmail.com';

-- Step 3: Verify it worked
SELECT 
    au.email,
    au.raw_user_meta_data->>'user_type' as metadata_user_type,
    au.raw_user_meta_data->>'role' as metadata_role,
    u.user_type as table_user_type,
    u.role as table_role,
    u.status
FROM auth.users au
LEFT JOIN public.users u ON au.id = u.id
WHERE au.email = 'stokikakenya@gmail.com';
