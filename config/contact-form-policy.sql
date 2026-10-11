-- Fix contact form RLS policy
-- Run this in Supabase SQL Editor

-- Allow public insert on contacts table
CREATE POLICY "Allow public contact submissions" ON contacts 
FOR INSERT TO anon 
WITH CHECK (true);

-- Allow public insert on newsletter_subscribers table  
CREATE POLICY "Allow public newsletter subscriptions" ON newsletter_subscribers 
FOR INSERT TO anon 
WITH CHECK (true);