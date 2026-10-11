-- Migration: Create Business Entities Tables
-- Description: Creates vendors and suppliers tables
-- Requirements: 2.6, 2.7, 24.9-24.10

-- ============================================================================
-- Vendors Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    business_name TEXT NOT NULL,
    business_category_id UUID REFERENCES business_categories(id),
    business_status_id UUID REFERENCES business_statuses(id),
    business_size_id UUID REFERENCES business_sizes(id),
    business_model_id UUID REFERENCES business_models(id),
    location TEXT,
    registration_number TEXT,
    tax_pin TEXT,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    verification_date TIMESTAMPTZ,
    field_agent_id UUID REFERENCES profiles(id),
    onboarding_completed BOOLEAN NOT NULL DEFAULT false,
    onboarding_completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for vendors
CREATE INDEX IF NOT EXISTS idx_vendors_profile ON vendors(profile_id);
CREATE INDEX IF NOT EXISTS idx_vendors_business_name ON vendors(business_name);
CREATE INDEX IF NOT EXISTS idx_vendors_category ON vendors(business_category_id);
CREATE INDEX IF NOT EXISTS idx_vendors_is_verified ON vendors(is_verified);
CREATE INDEX IF NOT EXISTS idx_vendors_field_agent ON vendors(field_agent_id);

-- Apply updated_at trigger
CREATE TRIGGER update_vendors_updated_at 
    BEFORE UPDATE ON vendors
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Suppliers Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    business_name TEXT NOT NULL,
    business_category_id UUID REFERENCES business_categories(id),
    location TEXT,
    contact_person TEXT,
    contact_phone TEXT CHECK (contact_phone ~ '^254[0-9]{9}$'),
    contact_email TEXT,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    verification_date TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for suppliers
CREATE INDEX IF NOT EXISTS idx_suppliers_profile ON suppliers(profile_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_business_name ON suppliers(business_name);
CREATE INDEX IF NOT EXISTS idx_suppliers_category ON suppliers(business_category_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_is_verified ON suppliers(is_verified);
CREATE INDEX IF NOT EXISTS idx_suppliers_is_active ON suppliers(is_active);

-- Apply updated_at trigger
CREATE TRIGGER update_suppliers_updated_at 
    BEFORE UPDATE ON suppliers
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE vendors IS 'Retail businesses requesting stock from suppliers';
COMMENT ON TABLE suppliers IS 'Product providers fulfilling stock orders';
COMMENT ON COLUMN vendors.is_verified IS 'Whether the vendor has been verified by field agent';
COMMENT ON COLUMN vendors.onboarding_completed IS 'Whether vendor has completed onboarding process';
COMMENT ON COLUMN suppliers.is_verified IS 'Whether the supplier has been verified';
COMMENT ON COLUMN suppliers.is_active IS 'Whether the supplier is currently active';