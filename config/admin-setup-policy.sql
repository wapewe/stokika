-- Temporary policy to allow admin user creation
-- Run this in Supabase SQL Editor BEFORE running setup-admin.html

-- Allow public insert for admin user creation (temporary)
CREATE POLICY "Allow admin user creation" ON users 
FOR INSERT TO anon 
WITH CHECK (role = 'admin' AND email = 'stokikakenya@gmail.com');

-- After admin is created, you can drop this policy:
-- DROP POLICY "Allow admin user creation" ON users;