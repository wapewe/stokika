-- Newsletter subscription policy
-- Run this in Supabase SQL Editor to allow public newsletter subscriptions

-- Allow public insert for newsletter subscriptions
CREATE POLICY "Allow public newsletter subscription" ON newsletter_subscribers 
FOR INSERT TO anon 
WITH CHECK (true);