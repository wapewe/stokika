-- Enable RLS with Admin Access Policies
-- This keeps security while allowing admin full access

-- 1. Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Admin full access" ON users;
DROP POLICY IF EXISTS "Admin full access" ON vendors;
DROP POLICY IF EXISTS "Admin full access" ON suppliers;
DROP POLICY IF EXISTS "Admin full access" ON orders;
DROP POLICY IF EXISTS "Admin full access" ON payments;
DROP POLICY IF EXISTS "Admin full access" ON deliveries;
DROP POLICY IF EXISTS "Admin full access" ON products;
DROP POLICY IF EXISTS "Admin full access" ON sms_logs;
DROP POLICY IF EXISTS "Admin full access" ON conversations;
DROP POLICY IF EXISTS "Admin full access" ON messages;
DROP POLICY IF EXISTS "Admin full access" ON field_agents;
DROP POLICY IF EXISTS "Admin full access" ON product_categories;

-- 3. Create helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (
        SELECT COALESCE(
            (SELECT user_type = 'admin' OR role = 'admin' 
             FROM public.users 
             WHERE id = auth.uid()),
            false
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create admin policies for all tables
CREATE POLICY "Admin full access" ON users FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin full access" ON vendors FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin full access" ON suppliers FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin full access" ON orders FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin full access" ON payments FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin full access" ON deliveries FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin full access" ON products FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin full access" ON sms_logs FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin full access" ON conversations FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin full access" ON messages FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin full access" ON field_agents FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "Admin full access" ON product_categories FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- 5. Verify policies are created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
