-- Run this SQL to fix all issues
-- This enables proper RLS policies and allows form submissions

-- 1. Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervisors ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervisor_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- 2. Drop all existing policies
DROP POLICY IF EXISTS "admin_full_access" ON users;
DROP POLICY IF EXISTS "users_own_access" ON users;
DROP POLICY IF EXISTS "admin_agents_access" ON field_agents;
DROP POLICY IF EXISTS "admin_vendors_access" ON vendors;
DROP POLICY IF EXISTS "admin_suppliers_access" ON suppliers;
DROP POLICY IF EXISTS "admin_supervisors_access" ON supervisors;
DROP POLICY IF EXISTS "admin_supervisor_applications_access" ON supervisor_applications;
DROP POLICY IF EXISTS "admin_contacts_access" ON contacts;
DROP POLICY IF EXISTS "admin_newsletter_access" ON newsletter_subscribers;
DROP POLICY IF EXISTS "public_field_agent_insert" ON field_agents;
DROP POLICY IF EXISTS "public_supervisor_applications_insert" ON supervisor_applications;
DROP POLICY IF EXISTS "public_contacts_insert" ON contacts;
DROP POLICY IF EXISTS "public_newsletter_insert" ON newsletter_subscribers;

-- 3. Create admin policies (Current Admin UUID: 3f6a23fc-5a40-480c-a98f-839861b3bd98)
CREATE POLICY "admin_full_access" ON users 
FOR ALL USING (auth.uid() = '3f6a23fc-5a40-480c-a98f-839861b3bd98'::uuid);

CREATE POLICY "users_own_access" ON users 
FOR ALL USING (auth.uid() = id);

CREATE POLICY "admin_agents_access" ON field_agents 
FOR ALL USING (auth.uid() = '3f6a23fc-5a40-480c-a98f-839861b3bd98'::uuid);

CREATE POLICY "admin_vendors_access" ON vendors 
FOR ALL USING (auth.uid() = '3f6a23fc-5a40-480c-a98f-839861b3bd98'::uuid);

CREATE POLICY "admin_suppliers_access" ON suppliers 
FOR ALL USING (auth.uid() = '3f6a23fc-5a40-480c-a98f-839861b3bd98'::uuid);

CREATE POLICY "admin_supervisors_access" ON supervisors 
FOR ALL USING (auth.uid() = '3f6a23fc-5a40-480c-a98f-839861b3bd98'::uuid);

CREATE POLICY "admin_supervisor_applications_access" ON supervisor_applications 
FOR ALL USING (auth.uid() = '3f6a23fc-5a40-480c-a98f-839861b3bd98'::uuid);

CREATE POLICY "admin_contacts_access" ON contacts 
FOR ALL USING (auth.uid() = '3f6a23fc-5a40-480c-a98f-839861b3bd98'::uuid);

CREATE POLICY "admin_newsletter_access" ON newsletter_subscribers 
FOR ALL USING (auth.uid() = '3f6a23fc-5a40-480c-a98f-839861b3bd98'::uuid);

-- 4. Allow public form submissions (for recruitment forms)
CREATE POLICY "public_field_agent_insert" ON field_agents 
FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "public_supervisor_applications_insert" ON supervisor_applications 
FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "public_contacts_insert" ON contacts 
FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "public_newsletter_insert" ON newsletter_subscribers 
FOR INSERT TO anon WITH CHECK (true);