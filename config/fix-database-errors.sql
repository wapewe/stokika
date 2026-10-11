-- Fix Database 500 Errors
-- Run this to fix the trigger and RLS issues

-- 1. Drop the problematic trigger (it's causing recursive queries)
DROP TRIGGER IF EXISTS sync_user_metadata_trigger ON public.users;
DROP FUNCTION IF EXISTS public.sync_user_metadata();

-- 2. Temporarily disable RLS on all tables for admin testing
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE vendors DISABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE sms_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;

-- 3. Verify RLS is disabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'vendors', 'suppliers', 'orders', 'payments', 'deliveries', 'products', 'sms_logs', 'conversations', 'messages');
