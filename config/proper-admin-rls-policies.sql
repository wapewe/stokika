-- Proper Admin RLS Policies - Secure Solution
-- This creates proper policies instead of disabling RLS

-- 1. Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervisors ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies
DROP POLICY IF EXISTS "admin_full_access" ON users;
DROP POLICY IF EXISTS "users_own_access" ON users;
DROP POLICY IF EXISTS "admin_agents_access" ON field_agents;
DROP POLICY IF EXISTS "admin_vendors_access" ON vendors;
DROP POLICY IF EXISTS "admin_suppliers_access" ON suppliers;
DROP POLICY IF EXISTS "admin_supervisors_access" ON supervisors;

-- 3. Create secure admin policies using your specific admin UUID
-- Users table policies
CREATE POLICY "admin_full_access" ON users 
FOR ALL USING (auth.uid() = '108e6bf0-c199-4374-a61e-0652b4901de2'::uuid);

CREATE POLICY "users_own_access" ON users 
FOR ALL USING (auth.uid() = id);

-- Field agents table policies
CREATE POLICY "admin_agents_access" ON field_agents 
FOR ALL USING (auth.uid() = '108e6bf0-c199-4374-a61e-0652b4901de2'::uuid);

-- Vendors table policies
CREATE POLICY "admin_vendors_access" ON vendors 
FOR ALL USING (auth.uid() = '108e6bf0-c199-4374-a61e-0652b4901de2'::uuid);

-- Suppliers table policies
CREATE POLICY "admin_suppliers_access" ON suppliers 
FOR ALL USING (auth.uid() = '108e6bf0-c199-4374-a61e-0652b4901de2'::uuid);

-- Supervisors table policies
CREATE POLICY "admin_supervisors_access" ON supervisors 
FOR ALL USING (auth.uid() = '108e6bf0-c199-4374-a61e-0652b4901de2'::uuid);