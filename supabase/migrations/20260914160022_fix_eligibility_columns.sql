-- Migration: Fix Vendor Eligibility Schema
-- Description: Adds outstanding_balance column and creates aliases for StockService compatibility
-- Requirements: StockService eligibility checks

-- ============================================================================
-- Add Outstanding Balance Column
-- ============================================================================

-- Add outstanding_balance column to track vendor's current debt
ALTER TABLE vendor_eligibility ADD COLUMN IF NOT EXISTS outstanding_balance DECIMAL(10,2) DEFAULT 0 CHECK (outstanding_balance >= 0);

-- Create index on outstanding_balance
CREATE INDEX IF NOT EXISTS idx_vendor_eligibility_outstanding ON vendor_eligibility(outstanding_balance);

-- ============================================================================
-- Create View with Alias Column Names for Backward Compatibility
-- ============================================================================

-- Create a view that provides both column name formats
CREATE OR REPLACE VIEW vendor_eligibility_details AS
SELECT 
    id,
    vendor_id,
    is_eligible,
    eligibility_amount,
    eligibility_amount AS eligible_amount,  -- Alias for compatibility
    eligibility_tier,
    last_calculated_at,
    last_calculated_at AS calculated_at,  -- Alias for compatibility
    next_review_date,
    ineligibility_reason,
    outstanding_balance,
    created_at,
    updated_at
FROM vendor_eligibility;

-- ============================================================================
-- Function to Calculate Remaining Credit
-- ============================================================================

CREATE OR REPLACE FUNCTION get_vendor_remaining_credit(p_vendor_id UUID)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    v_eligible_amount DECIMAL(10,2);
    v_outstanding DECIMAL(10,2);
BEGIN
    SELECT 
        COALESCE(eligibility_amount, 0),
        COALESCE(outstanding_balance, 0)
    INTO v_eligible_amount, v_outstanding
    FROM vendor_eligibility
    WHERE vendor_id = p_vendor_id
    ORDER BY last_calculated_at DESC
    LIMIT 1;
    
    RETURN GREATEST(0, v_eligible_amount - v_outstanding);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON COLUMN vendor_eligibility.outstanding_balance IS 'Current outstanding balance owed by vendor';
COMMENT ON VIEW vendor_eligibility_details IS 'Vendor eligibility with alias columns for backward compatibility';
COMMENT ON FUNCTION get_vendor_remaining_credit IS 'Calculate vendor remaining credit (eligible_amount - outstanding_balance)';
