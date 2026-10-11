-- Fix RLS Policies for All Tables
-- Run this SQL in Supabase SQL Editor to allow admin to see all users

-- 1. VENDORS TABLE
-- Drop existing policies
DROP POLICY IF EXISTS "Admin can view all vendors" ON vendors;
DROP POLICY IF EXISTS "Admin can insert vendors" ON vendors;
DROP POLICY IF EXISTS "Admin can update vendors" ON vendors;
DROP POLICY IF EXISTS "Admin can delete vendors" ON vendors;
DROP POLICY IF EXISTS "Allow public insert for vendors" ON vendors;
DROP POLICY IF EXISTS "Public can insert vendors" ON vendors;

-- Create admin policies for vendors
CREATE POLICY "Admin can view all vendors"
ON vendors FOR SELECT
TO authenticated
USING (auth.uid() = '108e6bf0-c199-4374-a61e-0652b4901de2'::uuid);

CREATE POLICY "Admin can insert vendors"
ON vendors FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = '108e6bf0-c199-4374-a61e-0652b4901de2'::uuid);

CREATE POLICY "Admin can update vendors"
ON vendors FOR UPDATE
TO authenticated
USING (auth.uid() = '108e6bf0-c199-4374-a61e-0652b4901de2'::uuid);

CREATE POLICY "Admin can delete vendors"
ON vendors FOR DELETE
TO authenticated
USING (auth.uid() = '108e6bf0-c199-4374-a61e-0652b4901de2'::uuid);

-- Allow public to insert vendors (for recruitment forms)
CREATE POLICY "Public can insert vendors"
ON vendors FOR INSERT
TO anon
WITH CHECK (true);

-- 2. SUPPLIERS TABLE
-- Drop existing policies
DROP POLICY IF EXISTS "Admin can view all suppliers" ON suppliers;
DROP POLICY IF EXISTS "Admin can insert suppliers" ON suppliers;
DROP POLICY IF EXISTS "Admin can update suppliers" ON suppliers;
DROP POLICY IF EXISTS "Admin can delete suppliers" ON suppliers;
DROP POLICY IF EXISTS "Allow public insert for suppliers" ON suppliers;
DROP POLICY IF EXISTS "Public can insert suppliers" ON suppliers;

-- Create admin policies for suppliers
CREATE POLICY "Admin can view all suppliers"
ON suppliers FOR SELECT
TO authenticated
USING (auth.uid() = '108e6bf0-c199-4374-a61e-0652b4901de2'::uuid);

CREATE POLICY "Admin can insert suppliers"
ON suppliers FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = '108e6bf0-c199-4374-a61e-0652b4901de2'::uuid);

CREATE POLICY "Admin can update suppliers"
ON suppliers FOR UPDATE
TO authenticated
USING (auth.uid() = '108e6bf0-c199-4374-a61e-0652b4901de2'::uuid);

CREATE POLICY "Admin can delete suppliers"
ON suppliers FOR DELETE
TO authenticated
USING (auth.uid() = '108e6bf0-c199-4374-a61e-0652b4901de2'::uuid);

-- Allow public to insert suppliers (for recruitment forms)
CREATE POLICY "Public can insert suppliers"
ON suppliers FOR INSERT
TO anon
WITH CHECK (true);

-- 3. FIELD_AGENTS TABLE
-- Drop existing policies
DROP POLICY IF EXISTS "Admin can view all field_agents" ON field_agents;
DROP POLICY IF EXISTS "Admin can insert field_agents" ON field_agents;
DROP POLICY IF EXISTS "Admin can update field_agents" ON field_agents;
DROP POLICY IF EXISTS "Admin can delete field_agents" ON field_agents;
DROP POLICY IF EXISTS "Allow public insert for field_agents" ON field_agents;
DROP POLICY IF EXISTS "Public can insert field_agents" ON field_agents;

-- Create admin policies for field_agents
CREATE POLICY "Admin can view all field_agents"
ON field_agents FOR SELECT
TO authenticated
USING (auth.uid() = '108e6bf0-c199-4374-a61e-0652b4901de2'::uuid);

CREATE POLICY "Admin can insert field_agents"
ON field_agents FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = '108e6bf0-c199-4374-a61e-0652b4901de2'::uuid);

CREATE POLICY "Admin can update field_agents"
ON field_agents FOR UPDATE
TO authenticated
USING (auth.uid() = '108e6bf0-c199-4374-a61e-0652b4901de2'::uuid);

CREATE POLICY "Admin can delete field_agents"
ON field_agents FOR DELETE
TO authenticated
USING (auth.uid() = '108e6bf0-c199-4374-a61e-0652b4901de2'::uuid);

-- Allow public to insert field_agents (for recruitment forms)
CREATE POLICY "Public can insert field_agents"
ON field_agents FOR INSERT
TO anon
WITH CHECK (true);

-- 4. SUPERVISORS TABLE
-- Drop existing policies
DROP POLICY IF EXISTS "Admin can view all supervisors" ON supervisors;
DROP POLICY IF EXISTS "Admin can insert supervisors" ON supervisors;
DROP POLICY IF EXISTS "Admin can update supervisors" ON supervisors;
DROP POLICY IF EXISTS "Admin can delete supervisors" ON supervisors;
DROP POLICY IF EXISTS "Allow public insert for supervisors" ON supervisors;
DROP POLICY IF EXISTS "Public can insert supervisors" ON supervisors;

-- Create admin policies for supervisors
CREATE POLICY "Admin can view all supervisors"
ON supervisors FOR SELECT
TO authenticated
USING (auth.uid() = '108e6bf0-c199-4374-a61e-0652b4901de2'::uuid);

CREATE POLICY "Admin can insert supervisors"
ON supervisors FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = '108e6bf0-c199-4374-a61e-0652b4901de2'::uuid);

CREATE POLICY "Admin can update supervisors"
ON supervisors FOR UPDATE
TO authenticated
USING (auth.uid() = '108e6bf0-c199-4374-a61e-0652b4901de2'::uuid);

CREATE POLICY "Admin can delete supervisors"
ON supervisors FOR DELETE
TO authenticated
USING (auth.uid() = '108e6bf0-c199-4374-a61e-0652b4901de2'::uuid);

-- Allow public to insert supervisors (for recruitment forms)
CREATE POLICY "Public can insert supervisors"
ON supervisors FOR INSERT
TO anon
WITH CHECK (true);

-- 5. Enable RLS on all tables
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervisors ENABLE ROW LEVEL SECURITY;

-- Success message
SELECT 'RLS policies fixed successfully! Admin can now view all records.' as status;
