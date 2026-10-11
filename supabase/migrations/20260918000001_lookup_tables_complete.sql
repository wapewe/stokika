-- Migration: Complete Lookup Tables with Display Names and RLS
-- Description: Updates lookup tables with display_name, is_active fields and proper RLS policies
-- Task: 2.5 - Create lookup data access for vendor registration
-- Requirements: 3.1-3.16, 5.1-5.5, 6.1-6.6, 7.1-7.8

-- ============================================================================
-- Step 1: Update business_categories table structure
-- ============================================================================

-- Add missing columns if they don't exist
ALTER TABLE business_categories 
  ADD COLUMN IF NOT EXISTS display_name TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Rename category_name to name if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'business_categories' 
               AND column_name = 'category_name') THEN
        ALTER TABLE business_categories RENAME COLUMN category_name TO name;
    END IF;
END $$;

-- Make display_order NOT NULL if it isn't already
ALTER TABLE business_categories 
  ALTER COLUMN display_order SET NOT NULL,
  ALTER COLUMN display_order SET DEFAULT 0;

-- Update existing data with kebab-case names and display names
TRUNCATE TABLE business_categories CASCADE;

INSERT INTO business_categories (name, display_name, description, display_order, is_active) VALUES
    ('retail-shop', 'Retail & Shop', 'General retail store or shop', 1, true),
    ('food-beverage', 'Food & Beverage', 'Restaurants, cafes, food vendors, bakeries, butcheries', 2, true),
    ('fresh-produce-agriculture', 'Fresh Produce & Agriculture', 'Fresh fruits, vegetables, farm products', 3, true),
    ('fashion-apparel', 'Fashion & Apparel', 'Clothing, shoes, textiles, tailoring', 4, true),
    ('beauty-personal-care', 'Beauty & Personal Care', 'Salons, barbershops, beauty products', 5, true),
    ('electronics-technology', 'Electronics & Technology', 'Electronics, mobile phones, computer accessories', 6, true),
    ('hardware-building-supplies', 'Hardware & Building Supplies', 'Construction materials, tools, hardware', 7, true),
    ('automotive-transport', 'Automotive & Transport', 'Car parts, motorcycle accessories, transport services', 8, true),
    ('professional-business-services', 'Professional & Business Services', 'Business services, consultancy, professional services', 9, true),
    ('home-household', 'Home & Household', 'Furniture, home decor, household goods', 10, true),
    ('health-wellness', 'Health & Wellness', 'Pharmacies, health products, medical supplies', 11, true),
    ('agriculture-livestock', 'Agriculture & Livestock', 'Farming, livestock, agricultural supplies', 12, true),
    ('manufacturing-production', 'Manufacturing & Production', 'Production, manufacturing, assembly', 13, true),
    ('wholesale-distribution', 'Wholesale & Distribution', 'Wholesale trade, distribution services', 14, true),
    ('creative-media', 'Creative & Media', 'Photography, design, media services', 15, true),
    ('other', 'Other', 'Other business categories not listed above', 16, true);

-- ============================================================================
-- Step 2: Update business_statuses table structure
-- ============================================================================

ALTER TABLE business_statuses 
  ADD COLUMN IF NOT EXISTS display_name TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE business_statuses 
  ALTER COLUMN display_order SET NOT NULL,
  ALTER COLUMN display_order SET DEFAULT 0;

TRUNCATE TABLE business_statuses CASCADE;

INSERT INTO business_statuses (name, display_name, description, display_order, is_active) VALUES
    ('planning-to-start', 'Planning to Start', 'Business is in planning phase, not yet operating', 1, true),
    ('newly-started', 'Newly Started', 'Business recently started operations (less than 6 months)', 2, true),
    ('operating', 'Operating', 'Business is actively operating with established customers', 3, true),
    ('growing', 'Growing', 'Business is expanding customer base and operations', 4, true),
    ('expanding', 'Expanding', 'Business is opening new locations or significantly scaling', 5, true);

-- ============================================================================
-- Step 3: Update business_sizes table structure
-- ============================================================================

ALTER TABLE business_sizes 
  ADD COLUMN IF NOT EXISTS display_name TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE business_sizes 
  ALTER COLUMN display_order SET NOT NULL,
  ALTER COLUMN display_order SET DEFAULT 0;

TRUNCATE TABLE business_sizes CASCADE;

INSERT INTO business_sizes (name, display_name, description, display_order, is_active) VALUES
    ('starting', 'Starting', 'Not yet operating / preparing to start', 1, true),
    ('micro', 'Micro', 'Owner-operated or very small team', 2, true),
    ('small', 'Small', 'Established business with regular operations', 3, true),
    ('growing', 'Growing', 'Business expanding customers, stock or operations', 4, true),
    ('medium', 'Medium', 'Larger established business', 5, true),
    ('large', 'Large', 'Large-scale operation / multiple branches', 6, true);

-- ============================================================================
-- Step 4: Update business_models table structure
-- ============================================================================

ALTER TABLE business_models 
  ADD COLUMN IF NOT EXISTS display_name TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS display_order INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

TRUNCATE TABLE business_models CASCADE;

INSERT INTO business_models (name, display_name, description, display_order, is_active) VALUES
    ('retail', 'Retail', 'Sell directly to consumers', 1, true),
    ('wholesale', 'Wholesale', 'Sell in bulk to businesses', 2, true),
    ('distribution', 'Distribution', 'Supply products to businesses', 3, true),
    ('manufacturing', 'Manufacturing', 'Produce/make products', 4, true),
    ('service', 'Service', 'Provide services', 5, true),
    ('agriculture', 'Agriculture', 'Produce or trade agricultural products', 6, true),
    ('mixed', 'Mixed', 'Combine products and services', 7, true),
    ('other', 'Other', 'Other business model', 8, true);

-- ============================================================================
-- Step 5: Create RLS Policies for Lookup Tables
-- ============================================================================

-- Enable RLS on all lookup tables
ALTER TABLE business_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_models ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can view active categories" ON business_categories;
DROP POLICY IF EXISTS "Authenticated users can view active statuses" ON business_statuses;
DROP POLICY IF EXISTS "Authenticated users can view active sizes" ON business_sizes;
DROP POLICY IF EXISTS "Authenticated users can view active models" ON business_models;

DROP POLICY IF EXISTS "Service role can manage categories" ON business_categories;
DROP POLICY IF EXISTS "Service role can manage statuses" ON business_statuses;
DROP POLICY IF EXISTS "Service role can manage sizes" ON business_sizes;
DROP POLICY IF EXISTS "Service role can manage models" ON business_models;

-- business_categories policies
CREATE POLICY "Authenticated users can view active categories"
  ON business_categories
  FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Service role can manage categories"
  ON business_categories
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- business_statuses policies
CREATE POLICY "Authenticated users can view active statuses"
  ON business_statuses
  FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Service role can manage statuses"
  ON business_statuses
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- business_sizes policies
CREATE POLICY "Authenticated users can view active sizes"
  ON business_sizes
  FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Service role can manage sizes"
  ON business_sizes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- business_models policies
CREATE POLICY "Authenticated users can view active models"
  ON business_models
  FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Service role can manage models"
  ON business_models
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- Step 6: Add Triggers for updated_at
-- ============================================================================

-- Create trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_business_categories_updated_at ON business_categories;
DROP TRIGGER IF EXISTS update_business_statuses_updated_at ON business_statuses;
DROP TRIGGER IF EXISTS update_business_sizes_updated_at ON business_sizes;
DROP TRIGGER IF EXISTS update_business_models_updated_at ON business_models;

-- Create triggers
CREATE TRIGGER update_business_categories_updated_at
    BEFORE UPDATE ON business_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_business_statuses_updated_at
    BEFORE UPDATE ON business_statuses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_business_sizes_updated_at
    BEFORE UPDATE ON business_sizes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_business_models_updated_at
    BEFORE UPDATE ON business_models
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Step 7: Verification Queries
-- ============================================================================

DO $$
DECLARE
    category_count INTEGER;
    status_count INTEGER;
    size_count INTEGER;
    model_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO category_count FROM business_categories WHERE is_active = true;
    SELECT COUNT(*) INTO status_count FROM business_statuses WHERE is_active = true;
    SELECT COUNT(*) INTO size_count FROM business_sizes WHERE is_active = true;
    SELECT COUNT(*) INTO model_count FROM business_models WHERE is_active = true;
    
    IF category_count != 16 THEN
        RAISE WARNING 'Expected 16 active business_categories, found %', category_count;
    ELSE
        RAISE NOTICE '✓ Successfully created 16 active business_categories';
    END IF;
    
    IF status_count != 5 THEN
        RAISE WARNING 'Expected 5 active business_statuses, found %', status_count;
    ELSE
        RAISE NOTICE '✓ Successfully created 5 active business_statuses';
    END IF;
    
    IF size_count != 6 THEN
        RAISE WARNING 'Expected 6 active business_sizes, found %', size_count;
    ELSE
        RAISE NOTICE '✓ Successfully created 6 active business_sizes';
    END IF;
    
    IF model_count != 8 THEN
        RAISE WARNING 'Expected 8 active business_models, found %', model_count;
    ELSE
        RAISE NOTICE '✓ Successfully created 8 active business_models';
    END IF;
    
    RAISE NOTICE '✓ Lookup tables migration completed successfully';
END $$;
