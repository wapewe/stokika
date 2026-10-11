-- Migration: Vendor Registration Restructure - Lookup Tables and BMC Table
-- Description: Updates business lookup tables and creates vendor_bmc table for the vendor registration restructure
-- Task: 1.1 - Create lookup tables and vendor_bmc table
-- Requirements: 11.1, 11.2, 11.3, 11.4, 11.6, 14.1-14.5

-- ============================================================================
-- Step 1: Add missing columns to lookup tables FIRST
-- ============================================================================

-- Add display_order to business_categories if it doesn't exist
ALTER TABLE business_categories ADD COLUMN IF NOT EXISTS display_order INTEGER;

-- Add display_order to business_statuses if it doesn't exist
ALTER TABLE business_statuses ADD COLUMN IF NOT EXISTS display_order INTEGER;

-- Add display_order to business_sizes if it doesn't exist
ALTER TABLE business_sizes ADD COLUMN IF NOT EXISTS display_order INTEGER;

-- Rename columns for consistency with design
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'business_statuses' 
               AND column_name = 'status_name') THEN
        ALTER TABLE business_statuses RENAME COLUMN status_name TO name;
    END IF;
END $$;

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'business_sizes' 
               AND column_name = 'size_name') THEN
        ALTER TABLE business_sizes RENAME COLUMN size_name TO name;
    END IF;
END $$;

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'business_models' 
               AND column_name = 'model_name') THEN
        ALTER TABLE business_models RENAME COLUMN model_name TO name;
    END IF;
END $$;

-- Remove CHECK constraints if they exist
ALTER TABLE business_statuses DROP CONSTRAINT IF EXISTS business_statuses_status_name_check;
ALTER TABLE business_sizes DROP CONSTRAINT IF EXISTS business_sizes_size_name_check;
ALTER TABLE business_models DROP CONSTRAINT IF EXISTS business_models_model_name_check;

-- Remove employee_range column from business_sizes as it's not in the new design
ALTER TABLE business_sizes DROP COLUMN IF EXISTS employee_range;

-- ============================================================================
-- Step 2: Update Business Categories Table
-- ============================================================================

-- Clear existing categories and insert the 16 new categories from requirements
TRUNCATE TABLE business_categories CASCADE;

INSERT INTO business_categories (category_name, description, display_order) VALUES
    ('Retail & Shop', 'General retail store or shop', 1),
    ('Food & Beverage', 'Restaurants, cafes, food vendors, bakeries, butcheries', 2),
    ('Fresh Produce & Agriculture', 'Fresh fruits, vegetables, farm products', 3),
    ('Fashion & Apparel', 'Clothing, shoes, textiles, tailoring', 4),
    ('Beauty & Personal Care', 'Salons, barbershops, beauty products', 5),
    ('Electronics & Technology', 'Electronics, mobile phones, computer accessories', 6),
    ('Hardware & Building Supplies', 'Construction materials, tools, hardware', 7),
    ('Automotive & Transport', 'Car parts, motorcycle accessories, transport services', 8),
    ('Professional & Business Services', 'Business services, consultancy, professional services', 9),
    ('Home & Household', 'Furniture, home decor, household goods', 10),
    ('Health & Wellness', 'Pharmacies, health products, medical supplies', 11),
    ('Agriculture & Livestock', 'Farming, livestock, agricultural supplies', 12),
    ('Manufacturing & Production', 'Production, manufacturing, assembly', 13),
    ('Wholesale & Distribution', 'Wholesale trade, distribution services', 14),
    ('Creative & Media', 'Photography, design, media services', 15),
    ('Other', 'Other business categories not listed above', 16)
ON CONFLICT (category_name) DO UPDATE SET
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order;

-- ============================================================================
-- Step 3: Update Business Statuses Table
-- ============================================================================

-- Clear existing statuses and insert the 5 new statuses from requirements
TRUNCATE TABLE business_statuses CASCADE;

INSERT INTO business_statuses (name, description, display_order) VALUES
    ('Planning to Start', 'Business is in planning phase, not yet operating', 1),
    ('Newly Started', 'Business recently started operations (less than 6 months)', 2),
    ('Operating', 'Business is actively operating with established customers', 3),
    ('Growing', 'Business is expanding customer base and operations', 4),
    ('Expanding', 'Business is opening new locations or significantly scaling', 5)
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order;

-- ============================================================================
-- Step 4: Update Business Sizes Table
-- ============================================================================

-- Clear existing sizes and insert the 6 new sizes from requirements
TRUNCATE TABLE business_sizes CASCADE;

INSERT INTO business_sizes (name, description, display_order) VALUES
    ('Starting', 'Not yet operating / preparing to start', 1),
    ('Micro', 'Owner-operated or very small team', 2),
    ('Small', 'Established business with regular operations', 3),
    ('Growing', 'Business expanding customers, stock or operations', 4),
    ('Medium', 'Larger established business', 5),
    ('Large', 'Large-scale operation / multiple branches', 6)
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    display_order = EXCLUDED.display_order;

-- ============================================================================
-- Step 5: Update Business Models Table
-- ============================================================================

-- Clear existing models and insert the 8 new models from requirements
TRUNCATE TABLE business_models CASCADE;

INSERT INTO business_models (name, description) VALUES
    ('Retail', 'Sell directly to consumers'),
    ('Wholesale', 'Sell in bulk to businesses'),
    ('Distribution', 'Supply products to businesses'),
    ('Manufacturing', 'Produce/make products'),
    ('Service', 'Provide services'),
    ('Agriculture', 'Produce or trade agricultural products'),
    ('Mixed', 'Combine products and services'),
    ('Other', 'Other business model')
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description;

-- ============================================================================
-- Step 6: Create vendor_bmc Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS vendor_bmc (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    value_proposition TEXT NOT NULL CHECK (char_length(value_proposition) >= 30),
    customer_segments TEXT NOT NULL CHECK (char_length(customer_segments) >= 30),
    channels TEXT NOT NULL CHECK (char_length(channels) >= 30),
    customer_relationships TEXT NOT NULL CHECK (char_length(customer_relationships) >= 30),
    revenue_streams TEXT NOT NULL CHECK (char_length(revenue_streams) >= 30),
    key_resources TEXT NOT NULL CHECK (char_length(key_resources) >= 30),
    key_activities TEXT NOT NULL CHECK (char_length(key_activities) >= 30),
    key_partnerships TEXT NOT NULL CHECK (char_length(key_partnerships) >= 30),
    cost_structure TEXT NOT NULL CHECK (char_length(cost_structure) >= 30),
    completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_vendor_bmc UNIQUE (vendor_id)
);

-- ============================================================================
-- Step 7: Create Indexes for Performance Optimization
-- ============================================================================

-- vendor_bmc indexes
CREATE INDEX IF NOT EXISTS idx_vendor_bmc_vendor ON vendor_bmc(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_bmc_completed_at ON vendor_bmc(completed_at);

-- business_categories indexes
CREATE INDEX IF NOT EXISTS idx_business_categories_name ON business_categories(category_name);
CREATE INDEX IF NOT EXISTS idx_business_categories_display_order ON business_categories(display_order);

-- business_statuses indexes
CREATE INDEX IF NOT EXISTS idx_business_statuses_name ON business_statuses(name);
CREATE INDEX IF NOT EXISTS idx_business_statuses_display_order ON business_statuses(display_order);

-- business_sizes indexes  
CREATE INDEX IF NOT EXISTS idx_business_sizes_name ON business_sizes(name);
CREATE INDEX IF NOT EXISTS idx_business_sizes_display_order ON business_sizes(display_order);

-- business_models indexes
CREATE INDEX IF NOT EXISTS idx_business_models_name ON business_models(name);

-- ============================================================================
-- Step 8: Update Table Comments
-- ============================================================================

COMMENT ON TABLE vendor_bmc IS 'Business Model Canvas data for vendors who completed the planning exercise';
COMMENT ON COLUMN vendor_bmc.vendor_id IS 'Foreign key to vendors table';
COMMENT ON COLUMN vendor_bmc.value_proposition IS 'What unique value does the business offer to customers?';
COMMENT ON COLUMN vendor_bmc.customer_segments IS 'Who are the target customers?';
COMMENT ON COLUMN vendor_bmc.channels IS 'How will the business reach and communicate with customers?';
COMMENT ON COLUMN vendor_bmc.customer_relationships IS 'How will the business build and maintain customer relationships?';
COMMENT ON COLUMN vendor_bmc.revenue_streams IS 'How will the business generate revenue?';
COMMENT ON COLUMN vendor_bmc.key_resources IS 'What key resources are essential for the business?';
COMMENT ON COLUMN vendor_bmc.key_activities IS 'What key activities must the business perform?';
COMMENT ON COLUMN vendor_bmc.key_partnerships IS 'Who are the key partners and suppliers?';
COMMENT ON COLUMN vendor_bmc.cost_structure IS 'What are the main costs involved in running the business?';
COMMENT ON COLUMN vendor_bmc.completed_at IS 'When the vendor completed the BMC';

COMMENT ON TABLE business_categories IS 'Categories defining primary business industries (16 options)';
COMMENT ON TABLE business_statuses IS 'Lifecycle stages of businesses (5 stages from Planning to Expanding)';
COMMENT ON TABLE business_sizes IS 'Business scale classifications (6 sizes from Starting to Large)';
COMMENT ON TABLE business_models IS 'Business operational models (8 models including Retail, Wholesale, Service, etc.)';

-- ============================================================================
-- Step 9: Verification Queries
-- ============================================================================

-- Verify business_categories has 16 entries
DO $$
DECLARE
    category_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO category_count FROM business_categories;
    IF category_count != 16 THEN
        RAISE WARNING 'Expected 16 business_categories, found %', category_count;
    ELSE
        RAISE NOTICE 'Successfully created 16 business_categories';
    END IF;
END $$;

-- Verify business_statuses has 5 entries
DO $$
DECLARE
    status_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO status_count FROM business_statuses;
    IF status_count != 5 THEN
        RAISE WARNING 'Expected 5 business_statuses, found %', status_count;
    ELSE
        RAISE NOTICE 'Successfully created 5 business_statuses';
    END IF;
END $$;

-- Verify business_sizes has 6 entries
DO $$
DECLARE
    size_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO size_count FROM business_sizes;
    IF size_count != 6 THEN
        RAISE WARNING 'Expected 6 business_sizes, found %', size_count;
    ELSE
        RAISE NOTICE 'Successfully created 6 business_sizes';
    END IF;
END $$;

-- Verify business_models has 8 entries
DO $$
DECLARE
    model_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO model_count FROM business_models;
    IF model_count != 8 THEN
        RAISE WARNING 'Expected 8 business_models, found %', model_count;
    ELSE
        RAISE NOTICE 'Successfully created 8 business_models';
    END IF;
END $$;

-- Verify vendor_bmc table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vendor_bmc') THEN
        RAISE NOTICE 'Successfully created vendor_bmc table';
    ELSE
        RAISE WARNING 'vendor_bmc table was not created';
    END IF;
END $$;

-- ============================================================================
-- Migration Complete
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Migration 20260917000001_vendor_registration_restructure_lookup_tables.sql completed successfully';
END $$;
