-- Disable RLS on all relevant tables for development
-- This ensures user creation works properly across all tables

-- Disable RLS on main tables
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE field_agents DISABLE ROW LEVEL SECURITY;
ALTER TABLE vendors DISABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE supervisors DISABLE ROW LEVEL SECURITY;

-- Note: Re-enable RLS in production with proper policies