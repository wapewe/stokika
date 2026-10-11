-- Migration: Create Business Characteristics Tables
-- Description: Creates reference data tables for business categories, statuses, sizes, and models
-- Requirements: 2.2, 2.3, 2.4, 2.5, 24.5-24.8

-- ============================================================================
-- Business Categories Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS business_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_name TEXT UNIQUE NOT NULL,
    description TEXT,
    display_order INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for business_categories
CREATE INDEX IF NOT EXISTS idx_business_categories_name ON business_categories(category_name);
CREATE INDEX IF NOT EXISTS idx_business_categories_display_order ON business_categories(display_order);

-- ============================================================================
-- Business Statuses Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS business_statuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status_name TEXT UNIQUE NOT NULL CHECK (status_name IN (
        'Planning', 'Newly Started', 'Operating', 'Growing', 'Expanding'
    )),
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for business_statuses
CREATE INDEX IF NOT EXISTS idx_business_statuses_name ON business_statuses(status_name);

-- ============================================================================
-- Business Sizes Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS business_sizes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    size_name TEXT UNIQUE NOT NULL CHECK (size_name IN (
        'Pre-Launch', 'Micro', 'Small', 'Growing', 'Medium', 'Large'
    )),
    employee_range TEXT,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for business_sizes
CREATE INDEX IF NOT EXISTS idx_business_sizes_name ON business_sizes(size_name);

-- ============================================================================
-- Business Models Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS business_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_name TEXT UNIQUE NOT NULL CHECK (model_name IN (
        'Retail', 'Wholesale', 'Distribution', 'Manufacturing',
        'Service Provider', 'Agriculture', 'Mixed'
    )),
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for business_models
CREATE INDEX IF NOT EXISTS idx_business_models_name ON business_models(model_name);

-- ============================================================================
-- Seed Business Statuses
-- ============================================================================

INSERT INTO business_statuses (status_name, description) VALUES
    ('Planning', 'Business is in planning phase'),
    ('Newly Started', 'Business recently started operations'),
    ('Operating', 'Business is actively operating'),
    ('Growing', 'Business is in growth phase'),
    ('Expanding', 'Business is expanding operations')
ON CONFLICT (status_name) DO NOTHING;

-- ============================================================================
-- Seed Business Sizes
-- ============================================================================

INSERT INTO business_sizes (size_name, employee_range, description) VALUES
    ('Pre-Launch', '0', 'Business not yet launched'),
    ('Micro', '1-5', 'Micro business with 1-5 employees'),
    ('Small', '6-20', 'Small business with 6-20 employees'),
    ('Growing', '21-50', 'Growing business with 21-50 employees'),
    ('Medium', '51-100', 'Medium business with 51-100 employees'),
    ('Large', '100+', 'Large business with 100+ employees')
ON CONFLICT (size_name) DO NOTHING;

-- ============================================================================
-- Seed Business Models
-- ============================================================================

INSERT INTO business_models (model_name, description) VALUES
    ('Retail', 'Sells products directly to consumers'),
    ('Wholesale', 'Sells products in bulk to other businesses'),
    ('Distribution', 'Distributes products from manufacturers to retailers'),
    ('Manufacturing', 'Produces goods for sale'),
    ('Service Provider', 'Provides services rather than physical goods'),
    ('Agriculture', 'Engages in agricultural production'),
    ('Mixed', 'Operates using multiple business models')
ON CONFLICT (model_name) DO NOTHING;

-- ============================================================================
-- Seed Business Categories
-- ============================================================================

INSERT INTO business_categories (category_name, description, display_order) VALUES
    ('Retail', 'General retail business', 1),
    ('Food & Beverage', 'Food and beverage services', 2),
    ('Fashion & Apparel', 'Clothing and fashion items', 3),
    ('Electronics', 'Electronic goods and devices', 4),
    ('Home & Garden', 'Home improvement and garden supplies', 5),
    ('Health & Beauty', 'Health and beauty products', 6),
    ('Automotive', 'Automotive parts and services', 7),
    ('Construction', 'Construction materials and services', 8),
    ('Agriculture', 'Agricultural products and services', 9),
    ('Professional Services', 'Professional and business services', 10),
    ('Other', 'Other business categories', 11)
ON CONFLICT (category_name) DO NOTHING;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE business_categories IS 'Categories defining primary business industries';
COMMENT ON TABLE business_statuses IS 'Lifecycle stages of businesses';
COMMENT ON TABLE business_sizes IS 'Business size classifications';
COMMENT ON TABLE business_models IS 'Business operational models';