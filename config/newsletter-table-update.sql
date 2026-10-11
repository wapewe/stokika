-- Add name column to newsletter_subscribers table
-- Run this in Supabase SQL Editor

ALTER TABLE newsletter_subscribers 
ADD COLUMN IF NOT EXISTS name VARCHAR(255);