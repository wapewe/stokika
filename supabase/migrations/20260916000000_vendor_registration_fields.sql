-- Migration: Add Vendor Registration Fields
-- Description: Adds required fields for vendor registration restructure
-- Requirements: Task 2.4, Requirements 11.1-11.10

-- ============================================================================
-- Add new columns to vendors table
-- ============================================================================

-- Basic Information
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS county TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS town TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS center TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS email TEXT;

-- Business Category Other
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS business_category_other TEXT;

-- Stock Needs
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS stock_cycle TEXT;
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS stock_requirement_amount DECIMAL(10,2);
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS stock_justification TEXT;

-- BMC Completion Flag
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS bmc_completed BOOLEAN NOT NULL DEFAULT false;

-- ============================================================================
-- Add constraints
-- ============================================================================

-- Phone constraint (Kenyan format: 254XXXXXXXXX)
ALTER TABLE vendors DROP CONSTRAINT IF EXISTS vendors_phone_check;
ALTER TABLE vendors ADD CONSTRAINT vendors_phone_check 
  CHECK (phone IS NULL OR phone ~ '^254[17][0-9]{8}$');

-- Email constraint
ALTER TABLE vendors DROP CONSTRAINT IF EXISTS vendors_email_check;
ALTER TABLE vendors ADD CONSTRAINT vendors_email_check 
  CHECK (email IS NULL OR email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Stock cycle constraint
ALTER TABLE vendors DROP CONSTRAINT IF EXISTS vendors_stock_cycle_check;
ALTER TABLE vendors ADD CONSTRAINT vendors_stock_cycle_check 
  CHECK (stock_cycle IS NULL OR stock_cycle IN ('daily', 'weekly', 'fortnightly', 'monthly'));

-- Stock requirement constraint
ALTER TABLE vendors DROP CONSTRAINT IF EXISTS vendors_stock_requirement_check;
ALTER TABLE vendors ADD CONSTRAINT vendors_stock_requirement_check 
  CHECK (stock_requirement_amount IS NULL OR stock_requirement_amount > 0);

-- Stock justification minimum length constraint
ALTER TABLE vendors DROP CONSTRAINT IF EXISTS vendors_stock_justification_check;
ALTER TABLE vendors ADD CONSTRAINT vendors_stock_justification_check 
  CHECK (stock_justification IS NULL OR char_length(stock_justification) >= 20);

-- ============================================================================
-- Create vendor_bmc table
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

-- Create index
CREATE INDEX IF NOT EXISTS idx_vendor_bmc_vendor ON vendor_bmc(vendor_id);

-- Apply updated_at trigger
DROP TRIGGER IF EXISTS update_vendor_bmc_updated_at ON vendor_bmc;
CREATE TRIGGER update_vendor_bmc_updated_at 
    BEFORE UPDATE ON vendor_bmc
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE vendor_bmc IS 'Business Model Canvas data for vendors who completed the planning exercise';
COMMENT ON COLUMN vendor_bmc.completed_at IS 'When the vendor completed the BMC';
COMMENT ON COLUMN vendors.full_name IS 'Vendor full name from registration';
COMMENT ON COLUMN vendors.county IS 'County where business is located';
COMMENT ON COLUMN vendors.town IS 'Town where business is located';
COMMENT ON COLUMN vendors.center IS 'Business center or area within town';
COMMENT ON COLUMN vendors.phone IS 'Contact phone number in E.164 format (254XXXXXXXXX)';
COMMENT ON COLUMN vendors.email IS 'Contact email address';
COMMENT ON COLUMN vendors.business_category_other IS 'Custom business category when "Other" is selected';
COMMENT ON COLUMN vendors.stock_cycle IS 'Frequency of stock replenishment (daily, weekly, fortnightly, monthly)';
COMMENT ON COLUMN vendors.stock_requirement_amount IS 'Estimated stock requirement amount per cycle (KES)';
COMMENT ON COLUMN vendors.stock_justification IS 'Justification for stock cycle and amount';
COMMENT ON COLUMN vendors.bmc_completed IS 'Whether vendor completed Business Model Canvas';

-- ============================================================================
-- RLS Policies for vendor_bmc
-- ============================================================================

-- Enable RLS
ALTER TABLE vendor_bmc ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own BMC data
CREATE POLICY "Users can view own vendor BMC"
    ON vendor_bmc
    FOR SELECT
    USING (
        vendor_id IN (
            SELECT id FROM vendors WHERE profile_id = auth.uid()
        )
    );

-- Policy: Users can insert their own BMC data (via Edge Function)
CREATE POLICY "Users can insert own vendor BMC"
    ON vendor_bmc
    FOR INSERT
    WITH CHECK (
        vendor_id IN (
            SELECT id FROM vendors WHERE profile_id = auth.uid()
        )
    );

-- Policy: Users can update their own BMC data
CREATE POLICY "Users can update own vendor BMC"
    ON vendor_bmc
    FOR UPDATE
    USING (
        vendor_id IN (
            SELECT id FROM vendors WHERE profile_id = auth.uid()
        )
    );

-- Policy: Service role has full access (for Edge Functions)
CREATE POLICY "Service role has full access to vendor_bmc"
    ON vendor_bmc
    FOR ALL
    USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- Grant permissions
-- ============================================================================

GRANT SELECT, INSERT, UPDATE ON vendor_bmc TO authenticated;
GRANT SELECT, INSERT, UPDATE ON vendors TO authenticated;
