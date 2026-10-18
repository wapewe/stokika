-- Supplier Registration V2 Schema Migration
-- Creates tables for product-level supplier data and operational metrics

-- ============================================================================
-- ALTER EXISTING suppliers TABLE
-- ============================================================================

-- Remove obsolete columns
ALTER TABLE suppliers DROP COLUMN IF EXISTS number_of_employees;
ALTER TABLE suppliers DROP COLUMN IF EXISTS certifications;

-- Add new operational columns
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS supplier_type VARCHAR(50);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS business_registration_status VARCHAR(50);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS registration_number VARCHAR(100);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS main_business_location TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS minimum_order_value DECIMAL(10,2);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS maximum_order_value DECIMAL(10,2);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS delivery_capability VARCHAR(30);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS delivery_method TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS delivery_lead_time VARCHAR(50);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS delivery_charge_method VARCHAR(100);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS minimum_order_for_delivery DECIMAL(10,2);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS accepts_deferred_payment BOOLEAN DEFAULT false;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS deferred_payment_terms TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS preferred_contact_method VARCHAR(50);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS verification_status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS stock_location_county VARCHAR(100);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS stock_location_town VARCHAR(255);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS warehouse_address TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS alternative_contact_name VARCHAR(255);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS alternative_contact_phone VARCHAR(20);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS fulfillment_lead_time VARCHAR(50);

-- ============================================================================
-- RENAME OLD supplier_products TABLE AND CREATE NEW ONE
-- ============================================================================

-- Check if old supplier_products exists and rename it
DO $$ 
BEGIN
    -- Rename old supplier_products to supplier_products_old if it exists
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'supplier_products'
    ) THEN
        -- Check if it has the old schema (product_id column exists)
        IF EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'supplier_products' 
            AND column_name = 'product_id'
        ) THEN
            -- Rename old table to preserve data
            ALTER TABLE supplier_products RENAME TO supplier_products_legacy;
        END IF;
    END IF;
END $$;

-- Create new supplier_products table with standalone product catalog schema
CREATE TABLE IF NOT EXISTS supplier_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    product_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    sku VARCHAR(100),
    unit_of_measure VARCHAR(50) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    moq INTEGER NOT NULL DEFAULT 1,
    available_quantity INTEGER,
    stock_status VARCHAR(50) NOT NULL DEFAULT 'in_stock' CHECK (stock_status IN ('in_stock','limited_stock','out_of_stock','made_to_order')),
    product_description TEXT,
    brand VARCHAR(100),
    has_volume_pricing BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for supplier_products
CREATE INDEX IF NOT EXISTS idx_supplier_products_supplier_id ON supplier_products(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_products_category ON supplier_products(category);
CREATE INDEX IF NOT EXISTS idx_supplier_products_stock_status ON supplier_products(stock_status);

-- ============================================================================
-- CREATE supplier_volume_pricing TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS supplier_volume_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES supplier_products(id) ON DELETE CASCADE,
    min_quantity INTEGER NOT NULL,
    max_quantity INTEGER,
    unit_price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for supplier_volume_pricing
CREATE INDEX IF NOT EXISTS idx_volume_pricing_product_id ON supplier_volume_pricing(product_id);

-- ============================================================================
-- CREATE supplier_certifications TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS supplier_certifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    certification_type VARCHAR(100) NOT NULL,
    certification_number VARCHAR(100),
    issuing_authority VARCHAR(255),
    issue_date DATE,
    expiry_date DATE,
    document_url VARCHAR(500),
    verification_status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for supplier_certifications
CREATE INDEX IF NOT EXISTS idx_supplier_certifications_supplier_id ON supplier_certifications(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_certifications_type ON supplier_certifications(certification_type);
CREATE INDEX IF NOT EXISTS idx_supplier_certifications_verification_status ON supplier_certifications(verification_status);

-- ============================================================================
-- CREATE supplier_locations TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS supplier_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    location_type VARCHAR(50) NOT NULL DEFAULT 'service_area',
    county VARCHAR(100) NOT NULL,
    town VARCHAR(255),
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for supplier_locations
CREATE INDEX IF NOT EXISTS idx_supplier_locations_supplier_id ON supplier_locations(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_locations_county ON supplier_locations(county);
CREATE INDEX IF NOT EXISTS idx_supplier_locations_type ON supplier_locations(location_type);

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE supplier_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_volume_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_locations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES FOR supplier_products
-- ============================================================================

-- Allow authenticated users to insert their own products
DROP POLICY IF EXISTS "Users can insert their own products" ON supplier_products;
CREATE POLICY "Users can insert their own products"
    ON supplier_products FOR INSERT
    TO authenticated
    WITH CHECK (supplier_id IN (
        SELECT s.id FROM suppliers s
        JOIN profiles p ON s.profile_id = p.id
        WHERE p.id = auth.uid()
    ));

-- Allow authenticated users to view their own products
DROP POLICY IF EXISTS "Users can view their own products" ON supplier_products;
CREATE POLICY "Users can view their own products"
    ON supplier_products FOR SELECT
    TO authenticated
    USING (supplier_id IN (
        SELECT s.id FROM suppliers s
        JOIN profiles p ON s.profile_id = p.id
        WHERE p.id = auth.uid()
    ));

-- Allow service role full access
DROP POLICY IF EXISTS "Service role full access to products" ON supplier_products;
CREATE POLICY "Service role full access to products"
    ON supplier_products FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- RLS POLICIES FOR supplier_volume_pricing
-- ============================================================================

DROP POLICY IF EXISTS "Service role full access to volume pricing" ON supplier_volume_pricing;
CREATE POLICY "Service role full access to volume pricing"
    ON supplier_volume_pricing FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- RLS POLICIES FOR supplier_certifications
-- ============================================================================

-- Allow authenticated users to insert their own certifications
DROP POLICY IF EXISTS "Users can insert their own certifications" ON supplier_certifications;
CREATE POLICY "Users can insert their own certifications"
    ON supplier_certifications FOR INSERT
    TO authenticated
    WITH CHECK (supplier_id IN (
        SELECT s.id FROM suppliers s
        JOIN profiles p ON s.profile_id = p.id
        WHERE p.id = auth.uid()
    ));

-- Allow authenticated users to view their own certifications
DROP POLICY IF EXISTS "Users can view their own certifications" ON supplier_certifications;
CREATE POLICY "Users can view their own certifications"
    ON supplier_certifications FOR SELECT
    TO authenticated
    USING (supplier_id IN (
        SELECT s.id FROM suppliers s
        JOIN profiles p ON s.profile_id = p.id
        WHERE p.id = auth.uid()
    ));

-- Allow service role full access
DROP POLICY IF EXISTS "Service role full access to certifications" ON supplier_certifications;
CREATE POLICY "Service role full access to certifications"
    ON supplier_certifications FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- RLS POLICIES FOR supplier_locations
-- ============================================================================

-- Allow public to read service areas (for vendor matching)
DROP POLICY IF EXISTS "Public can view service areas" ON supplier_locations;
CREATE POLICY "Public can view service areas"
    ON supplier_locations FOR SELECT
    TO public
    USING (location_type = 'service_area');

-- Allow authenticated users to insert their own locations
DROP POLICY IF EXISTS "Users can insert their own locations" ON supplier_locations;
CREATE POLICY "Users can insert their own locations"
    ON supplier_locations FOR INSERT
    TO authenticated
    WITH CHECK (supplier_id IN (
        SELECT s.id FROM suppliers s
        JOIN profiles p ON s.profile_id = p.id
        WHERE p.id = auth.uid()
    ));

-- Allow service role full access
DROP POLICY IF EXISTS "Service role full access to locations" ON supplier_locations;
CREATE POLICY "Service role full access to locations"
    ON supplier_locations FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ============================================================================
-- CREATE UPDATED_AT TRIGGERS
-- ============================================================================

-- Create trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to supplier_products
DROP TRIGGER IF EXISTS update_supplier_products_updated_at ON supplier_products;
CREATE TRIGGER update_supplier_products_updated_at
    BEFORE UPDATE ON supplier_products
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to supplier_certifications
DROP TRIGGER IF EXISTS update_supplier_certifications_updated_at ON supplier_certifications;
CREATE TRIGGER update_supplier_certifications_updated_at
    BEFORE UPDATE ON supplier_certifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
