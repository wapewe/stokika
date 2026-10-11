-- Update Admin UUID in All RLS Policies
-- New Admin UUID: 3f6a23fc-5a40-480c-a98f-839861b3bd98
-- Run this SQL in Supabase SQL Editor

-- 1. USERS TABLE
DROP POLICY IF EXISTS "Admin can view all users" ON users;
DROP POLICY IF EXISTS "Admin can insert users" ON users;
DROP POLICY IF EXISTS "Admin can update users" ON users;
DROP POLICY IF EXISTS "Admin can delete users" ON users;

CREATE POLICY "Admin can view all users"
ON users FOR SELECT TO authenticated
USING (auth.uid() = '3f6a23fc-5a40-480c-a98f-839861b3bd98'::uuid);

CREATE POLICY "Admin can insert users"
ON users FOR INSERT TO authenticated
WITH CHECK (auth.uid() = '3f6a23fc-5a40-480c-a98f-839861b3bd98'::uuid);

CREATE POLICY "Admin can update users"
ON users FOR UPDATE TO authenticated
USING (auth.uid() = '3f6a23fc-5a40-480c-a98f-839861b3bd98'::uuid)
WITH CHECK (auth.uid() = '3f6a23fc-5a40-480c-a98f-839861b3bd98'::uuid);

CREATE POLICY "Admin can delete users"
ON users FOR DELETE TO authenticated
USING (auth.uid() = '3f6a23fc-5a40-480c-a98f-839861b3bd98'::uuid);

-- 2. VENDORS TABLE
DROP POLICY IF EXISTS "Admin can view all vendors" ON vendors;
DROP POLICY IF EXISTS "Admin can insert vendors" ON vendors;
DROP POLICY IF EXISTS "Admin can update vendors" ON vendors;
DROP POLICY IF EXISTS "Admin can delete vendors" ON vendors;
DROP POLICY IF EXISTS "Public can insert vendors" ON vendors;

CREATE POLICY "Admin can view all vendors"
ON vendors FOR SELECT TO authenticated
USING (auth.uid() = '3f6a23fc-5a40-480c-a98f-839861b3bd98'::uuid);

CREATE POLICY "Admin can insert vendors"
ON vendors FOR INSERT TO authenticated
WITH CHECK (auth.uid() = '3f6a23fc-5a40-480c-a98f-839861b3bd98'::uuid);

CREATE POLICY "Admin can update vendors"
ON vendors FOR UPDATE TO authenticated
USING (auth.uid() = '3f6a23fc-5a40-480c-a98f-839861b3bd98'::uuid);

CREATE POLICY "Admin can delete vendors"
ON vendors FOR DELETE TO authenticated
USING (auth.uid() = '3f6a23fc-5a40-480c-a98f-839861b3bd98'::uuid);

CREATE POLICY "Public can insert vendors"
ON vendors FOR INSERT TO anon
WITH CHECK (true);

-- 3. SUPPLIERS TABLE
DROP POLICY IF EXISTS "Admin can view all suppliers" ON suppliers;
DROP POLICY IF EXISTS "Admin can insert suppliers" ON suppliers;
DROP POLICY IF EXISTS "Admin can update suppliers" ON suppliers;
DROP POLICY IF EXISTS "Admin can delete suppliers" ON suppliers;
DROP POLICY IF EXISTS "Public can insert suppliers" ON suppliers;

CREATE POLICY "Admin can view all suppliers"
ON suppliers FOR SELECT TO authenticated
USING (auth.uid() = '3f6a23fc-5a40-480c-a98f-839861b3bd98'::uuid);

CREATE POLICY "Admin can insert suppliers"
ON suppliers FOR INSERT TO authenticated
WITH CHECK (auth.uid() = '3f6a23fc-5a40-480c-a98f-839861b3bd98'::uuid);

CREATE POLICY "Admin can update suppliers"
ON suppliers FOR UPDATE TO authenticated
USING (auth.uid() = '3f6a23fc-5a40-480c-a98f-839861b3bd98'::uuid);

CREATE POLICY "Admin can delete suppliers"
ON suppliers FOR DELETE TO authenticated
USING (auth.uid() = '3f6a23fc-5a40-480c-a98f-839861b3bd98'::uuid);

CREATE POLICY "Public can insert suppliers"
ON suppliers FOR INSERT TO anon
WITH CHECK (true);

-- 4. FIELD_AGENTS TABLE
DROP POLICY IF EXISTS "Admin can view all field_agents" ON field_agents;
DROP POLICY IF EXISTS "Admin can insert field_agents" ON field_agents;
DROP POLICY IF EXISTS "Admin can update field_agents" ON field_agents;
DROP POLICY IF EXISTS "Admin can delete field_agents" ON field_agents;
DROP POLICY IF EXISTS "Public can insert field_agents" ON field_agents;

CREATE POLICY "Admin can view all field_agents"
ON field_agents FOR SELECT TO authenticated
USING (auth.uid() = '3f6a23fc-5a40-480c-a98f-839861b3bd98'::uuid);

CREATE POLICY "Admin can insert field_agents"
ON field_agents FOR INSERT TO authenticated
WITH CHECK (auth.uid() = '3f6a23fc-5a40-480c-a98f-839861b3bd98'::uuid);

CREATE POLICY "Admin can update field_agents"
ON field_agents FOR UPDATE TO authenticated
USING (auth.uid() = '3f6a23fc-5a40-480c-a98f-839861b3bd98'::uuid);

CREATE POLICY "Admin can delete field_agents"
ON field_agents FOR DELETE TO authenticated
USING (auth.uid() = '3f6a23fc-5a40-480c-a98f-839861b3bd98'::uuid);

CREATE POLICY "Public can insert field_agents"
ON field_agents FOR INSERT TO anon
WITH CHECK (true);

-- 5. SUPERVISORS TABLE
DROP POLICY IF EXISTS "Admin can view all supervisors" ON supervisors;
DROP POLICY IF EXISTS "Admin can insert supervisors" ON supervisors;
DROP POLICY IF EXISTS "Admin can update supervisors" ON supervisors;
DROP POLICY IF EXISTS "Admin can delete supervisors" ON supervisors;
DROP POLICY IF EXISTS "Public can insert supervisors" ON supervisors;

CREATE POLICY "Admin can view all supervisors"
ON supervisors FOR SELECT TO authenticated
USING (auth.uid() = '3f6a23fc-5a40-480c-a98f-839861b3bd98'::uuid);

CREATE POLICY "Admin can insert supervisors"
ON supervisors FOR INSERT TO authenticated
WITH CHECK (auth.uid() = '3f6a23fc-5a40-480c-a98f-839861b3bd98'::uuid);

CREATE POLICY "Admin can update supervisors"
ON supervisors FOR UPDATE TO authenticated
USING (auth.uid() = '3f6a23fc-5a40-480c-a98f-839861b3bd98'::uuid);

CREATE POLICY "Admin can delete supervisors"
ON supervisors FOR DELETE TO authenticated
USING (auth.uid() = '3f6a23fc-5a40-480c-a98f-839861b3bd98'::uuid);

CREATE POLICY "Public can insert supervisors"
ON supervisors FOR INSERT TO anon
WITH CHECK (true);

-- 6. CONTACTS TABLE
DROP POLICY IF EXISTS "Admin can view all contacts" ON contacts;
DROP POLICY IF EXISTS "Admin can insert contacts" ON contacts;
DROP POLICY IF EXISTS "Admin can update contacts" ON contacts;
DROP POLICY IF EXISTS "Admin can delete contacts" ON contacts;
DROP POLICY IF EXISTS "Public can insert contacts" ON contacts;

CREATE POLICY "Admin can view all contacts"
ON contacts FOR SELECT TO authenticated
USING (auth.uid() = '3f6a23fc-5a40-480c-a98f-839861b3bd98'::uuid);

CREATE POLICY "Admin can insert contacts"
ON contacts FOR INSERT TO authenticated
WITH CHECK (auth.uid() = '3f6a23fc-5a40-480c-a98f-839861b3bd98'::uuid);

CREATE POLICY "Admin can update contacts"
ON contacts FOR UPDATE TO authenticated
USING (auth.uid() = '3f6a23fc-5a40-480c-a98f-839861b3bd98'::uuid);

CREATE POLICY "Admin can delete contacts"
ON contacts FOR DELETE TO authenticated
USING (auth.uid() = '3f6a23fc-5a40-480c-a98f-839861b3bd98'::uuid);

CREATE POLICY "Public can insert contacts"
ON contacts FOR INSERT TO anon
WITH CHECK (true);

-- 7. ORDERS TABLE
DROP POLICY IF EXISTS "Admin can view all orders" ON orders;
DROP POLICY IF EXISTS "Admin can insert orders" ON orders;
DROP POLICY IF EXISTS "Admin can update orders" ON orders;
DROP POLICY IF EXISTS "Admin can delete orders" ON orders;

CREATE POLICY "Admin can view all orders"
ON orders FOR SELECT TO authenticated
USING (auth.uid() = '3f6a23fc-5a40-480c-a98f-839861b3bd98'::uuid);

CREATE POLICY "Admin can insert orders"
ON orders FOR INSERT TO authenticated
WITH CHECK (auth.uid() = '3f6a23fc-5a40-480c-a98f-839861b3bd98'::uuid);

CREATE POLICY "Admin can update orders"
ON orders FOR UPDATE TO authenticated
USING (auth.uid() = '3f6a23fc-5a40-480c-a98f-839861b3bd98'::uuid);

CREATE POLICY "Admin can delete orders"
ON orders FOR DELETE TO authenticated
USING (auth.uid() = '3f6a23fc-5a40-480c-a98f-839861b3bd98'::uuid);

-- 8. PAYMENTS TABLE
DROP POLICY IF EXISTS "Admin can view all payments" ON payments;
DROP POLICY IF EXISTS "Admin can insert payments" ON payments;
DROP POLICY IF EXISTS "Admin can update payments" ON payments;
DROP POLICY IF EXISTS "Admin can delete payments" ON payments;

CREATE POLICY "Admin can view all payments"
ON payments FOR SELECT TO authenticated
USING (auth.uid() = '3f6a23fc-5a40-480c-a98f-839861b3bd98'::uuid);

CREATE POLICY "Admin can insert payments"
ON payments FOR INSERT TO authenticated
WITH CHECK (auth.uid() = '3f6a23fc-5a40-480c-a98f-839861b3bd98'::uuid);

CREATE POLICY "Admin can update payments"
ON payments FOR UPDATE TO authenticated
USING (auth.uid() = '3f6a23fc-5a40-480c-a98f-839861b3bd98'::uuid);

CREATE POLICY "Admin can delete payments"
ON payments FOR DELETE TO authenticated
USING (auth.uid() = '3f6a23fc-5a40-480c-a98f-839861b3bd98'::uuid);

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervisors ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Success message
SELECT 'All RLS policies updated with new admin UUID: 3f6a23fc-5a40-480c-a98f-839861b3bd98' as status;
