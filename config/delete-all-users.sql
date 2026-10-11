-- Delete All Users Safely
-- Run this SQL in Supabase SQL Editor to delete all users including admin

-- Step 1: Temporarily disable RLS to allow deletion
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE field_agents DISABLE ROW LEVEL SECURITY;
ALTER TABLE supervisors DISABLE ROW LEVEL SECURITY;
ALTER TABLE vendors DISABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS admin_users DISABLE ROW LEVEL SECURITY;

-- Step 2: Delete from all related tables first
DELETE FROM field_agents;
DELETE FROM supervisors;
DELETE FROM vendors;
DELETE FROM suppliers;

-- Delete from admin_users if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'admin_users') THEN
        DELETE FROM admin_users;
    END IF;
END $$;

-- Step 3: Delete from users table
DELETE FROM users;

-- Step 4: Delete from auth.users (this is the source of truth)
DELETE FROM auth.users;

-- Step 5: Re-enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervisors ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS admin_users ENABLE ROW LEVEL SECURITY;

-- Success message
SELECT 'All users deleted successfully! You can now create a fresh admin user.' as status;
