-- Admin User Policies and Cascading Deletes
-- Run this SQL in Supabase SQL Editor

-- 1. Ensure cascading deletes are set up properly
-- Drop existing foreign keys and recreate with CASCADE

-- Field Agents
ALTER TABLE field_agents DROP CONSTRAINT IF EXISTS field_agents_user_id_fkey;
ALTER TABLE field_agents 
ADD CONSTRAINT field_agents_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Supervisors
ALTER TABLE supervisors DROP CONSTRAINT IF EXISTS supervisors_user_id_fkey;
ALTER TABLE supervisors 
ADD CONSTRAINT supervisors_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Vendors
ALTER TABLE vendors DROP CONSTRAINT IF EXISTS vendors_user_id_fkey;
ALTER TABLE vendors 
ADD CONSTRAINT vendors_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Suppliers
ALTER TABLE suppliers DROP CONSTRAINT IF EXISTS suppliers_user_id_fkey;
ALTER TABLE suppliers 
ADD CONSTRAINT suppliers_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Admin Users table cascade (if exists)
ALTER TABLE IF EXISTS admin_users DROP CONSTRAINT IF EXISTS admin_users_user_id_fkey;
ALTER TABLE IF EXISTS admin_users 
ADD CONSTRAINT admin_users_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Drop all existing policies on users table
DROP POLICY IF EXISTS "Admin full access to users" ON users;
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Allow public insert for new users" ON users;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON users;
DROP POLICY IF EXISTS "Admin can view all users" ON users;
DROP POLICY IF EXISTS "Admin can insert users" ON users;
DROP POLICY IF EXISTS "Admin can update users" ON users;
DROP POLICY IF EXISTS "Admin can delete users" ON users;

-- 3. Create strict admin-only policies for users table
-- Only admin with specific UUID can access users table
-- Current Admin UUID: 3f6a23fc-5a40-480c-a98f-839861b3bd98

-- Admin can select all users
CREATE POLICY "Admin can view all users"
ON users FOR SELECT
TO authenticated
USING (
  auth.uid() = '3f6a23fc-5a40-480c-a98f-839861b3bd98'::uuid
);

-- Admin can insert users
CREATE POLICY "Admin can insert users"
ON users FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = '3f6a23fc-5a40-480c-a98f-839861b3bd98'::uuid
);

-- Admin can update users
CREATE POLICY "Admin can update users"
ON users FOR UPDATE
TO authenticated
USING (
  auth.uid() = '3f6a23fc-5a40-480c-a98f-839861b3bd98'::uuid
)
WITH CHECK (
  auth.uid() = '3f6a23fc-5a40-480c-a98f-839861b3bd98'::uuid
);

-- Admin can delete users
CREATE POLICY "Admin can delete users"
ON users FOR DELETE
TO authenticated
USING (
  auth.uid() = '3f6a23fc-5a40-480c-a98f-839861b3bd98'::uuid
);

-- 4. Create function to auto-delete user from users table when deleted from auth
CREATE OR REPLACE FUNCTION delete_user_on_auth_delete()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM users WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create trigger on auth.users to cascade delete to users table
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION delete_user_on_auth_delete();

-- 6. Verify RLS is enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Success message
SELECT 'Admin user policies and cascading deletes configured successfully!' as status;
