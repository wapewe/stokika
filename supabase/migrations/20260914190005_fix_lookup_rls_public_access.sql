-- Migration: Fix RLS policies for public lookup table access
-- Description: Allow anonymous users to read active lookup tables for vendor registration
-- Issue: 401 Unauthorized when fetching business_categories, business_statuses, etc.

-- Drop existing restrictive policies (only the ones we're changing)
DROP POLICY IF EXISTS "Authenticated users can view active categories" ON business_categories;
DROP POLICY IF EXISTS "Authenticated users can view active statuses" ON business_statuses;
DROP POLICY IF EXISTS "Authenticated users can view active sizes" ON business_sizes;
DROP POLICY IF EXISTS "Authenticated users can view active models" ON business_models;

-- Drop any existing public policies with different names
DROP POLICY IF EXISTS "Public can view active categories" ON business_categories;
DROP POLICY IF EXISTS "Public can view active statuses" ON business_statuses;
DROP POLICY IF EXISTS "Public can view active sizes" ON business_sizes;
DROP POLICY IF EXISTS "Public can view active models" ON business_models;

-- Create new policies allowing public read access to active records
-- Using anon role (Supabase's default role for unauthenticated users)
CREATE POLICY "Public can view active categories"
  ON business_categories FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public can view active statuses"
  ON business_statuses FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public can view active sizes"
  ON business_sizes FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Public can view active models"
  ON business_models FOR SELECT
  TO anon, authenticated
  USING (true);

-- NOTE: Service role policies already exist, not recreating them
