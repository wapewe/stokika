-- Create newsletter_subscribers table and policy
-- Run this in Supabase SQL Editor

-- Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Allow public insert
CREATE POLICY "Allow public newsletter subscription" ON newsletter_subscribers 
FOR INSERT TO anon 
WITH CHECK (true);