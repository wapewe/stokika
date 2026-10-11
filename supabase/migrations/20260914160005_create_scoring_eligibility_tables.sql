-- Migration: Create Scoring and Eligibility Tables
-- Description: Creates vendor scoring and eligibility tracking tables
-- Requirements: 2.16-2.17, 24.15-24.16

-- ============================================================================
-- Vendor Scores Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS vendor_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    business_longevity_score DECIMAL(5,2) CHECK (business_longevity_score BETWEEN 0 AND 100),
    sales_consistency_score DECIMAL(5,2) CHECK (sales_consistency_score BETWEEN 0 AND 100),
    payment_history_score DECIMAL(5,2) CHECK (payment_history_score BETWEEN 0 AND 100),
    business_growth_score DECIMAL(5,2) CHECK (business_growth_score BETWEEN 0 AND 100),
    total_score DECIMAL(5,2) CHECK (total_score BETWEEN 0 AND 100),
    score_calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for vendor_scores
CREATE INDEX IF NOT EXISTS idx_vendor_scores_vendor ON vendor_scores(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_scores_total ON vendor_scores(total_score);
CREATE INDEX IF NOT EXISTS idx_vendor_scores_calculated_at ON vendor_scores(score_calculated_at);

-- Apply updated_at trigger
CREATE TRIGGER update_vendor_scores_updated_at 
    BEFORE UPDATE ON vendor_scores
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Vendor Eligibility Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS vendor_eligibility (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    is_eligible BOOLEAN NOT NULL DEFAULT false,
    eligibility_amount DECIMAL(10,2) CHECK (eligibility_amount >= 0),
    eligibility_tier TEXT CHECK (eligibility_tier IN ('Bronze', 'Silver', 'Gold', 'Platinum')),
    last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    next_review_date TIMESTAMPTZ,
    ineligibility_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for vendor_eligibility
CREATE INDEX IF NOT EXISTS idx_vendor_eligibility_vendor ON vendor_eligibility(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_eligibility_is_eligible ON vendor_eligibility(is_eligible);
CREATE INDEX IF NOT EXISTS idx_vendor_eligibility_tier ON vendor_eligibility(eligibility_tier);
CREATE INDEX IF NOT EXISTS idx_vendor_eligibility_next_review ON vendor_eligibility(next_review_date);

-- Apply updated_at trigger
CREATE TRIGGER update_vendor_eligibility_updated_at 
    BEFORE UPDATE ON vendor_eligibility
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE vendor_scores IS 'Vendor creditworthiness scoring metrics';
COMMENT ON TABLE vendor_eligibility IS 'Vendor stock request eligibility status and limits';
COMMENT ON COLUMN vendor_scores.business_longevity_score IS 'Score based on business age and stability (0-100)';
COMMENT ON COLUMN vendor_scores.sales_consistency_score IS 'Score based on sales patterns and consistency (0-100)';
COMMENT ON COLUMN vendor_scores.payment_history_score IS 'Score based on payment track record (0-100)';
COMMENT ON COLUMN vendor_scores.business_growth_score IS 'Score based on business growth trajectory (0-100)';
COMMENT ON COLUMN vendor_scores.total_score IS 'Weighted total score (0-100)';
COMMENT ON COLUMN vendor_eligibility.is_eligible IS 'Whether vendor is eligible for stock requests';
COMMENT ON COLUMN vendor_eligibility.eligibility_amount IS 'Maximum stock value vendor can request';
COMMENT ON COLUMN vendor_eligibility.eligibility_tier IS 'Vendor tier classification';
COMMENT ON COLUMN vendor_eligibility.ineligibility_reason IS 'Reason for ineligibility if applicable';