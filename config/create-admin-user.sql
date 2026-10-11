-- Create Admin User in Supabase
-- Run this in your Supabase SQL Editor

-- Step 1: Insert admin user into users table
INSERT INTO users (name, email, role, user_type, created_at, updated_at)
VALUES (
    'Admin User',
    'reinherts@gmail.com',
    'admin',
    'admin',
    NOW(),
    NOW()
)
ON CONFLICT (email) DO UPDATE 
SET role = 'admin', user_type = 'admin', updated_at = NOW();

-- Step 2: Create auth user (this creates the authentication account)
-- Note: You need to do this in Supabase Dashboard > Authentication > Users > Add User
-- OR use the Supabase Dashboard to invite the user
-- Email: reinherts@gmail.com
-- Password: @123456789Rb!

-- Alternative: If you have access to Supabase service role key, you can use the API
-- But for security, it's better to create via Dashboard

-- Verify the user was created
SELECT * FROM users WHERE email = 'reinherts@gmail.com';
