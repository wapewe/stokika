-- Migration: Create Supplier Scores Table
-- Description: Creates supplier performance scoring table
-- Requirements: 16.4, 16.5, 16.6

-- ============================================================================
-- Supplier Scores Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS supplier_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    
    -- Score Components (0-100 each)
    fulfillment_score DECIMAL(5,2) CHECK (fulfillment_score BETWEEN 0 AND 100),
    delivery_score DECIMAL(5,2) CHECK (delivery_score BETWEEN 0 AND 100),
    availability_score DECIMAL(5,2) CHECK (availability_score BETWEEN 0 AND 100),
    quality_score DECIMAL(5,2) CHECK (quality_score BETWEEN 0 AND 100),
    price_score DECIMAL(5,2) CHECK (price_score BETWEEN 0 AND 100),
    
    -- Total weighted score
    score_value DECIMAL(5,2) NOT NULL CHECK (score_value BETWEEN 0 AND 100),
    
    -- Component breakdown for transparency
    components JSONB,
    
    -- Metadata
    calculation_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for supplier_scores
CREATE INDEX IF NOT EXISTS idx_supplier_scores_supplier ON supplier_scores(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_scores_value ON supplier_scores(score_value);
CREATE INDEX IF NOT EXISTS idx_supplier_scores_date ON supplier_scores(calculation_date DESC);

-- Apply updated_at trigger
CREATE TRIGGER update_supplier_scores_updated_at 
    BEFORE UPDATE ON supplier_scores
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Supplier Matches Table (for vendor-supplier matching)
-- ============================================================================

CREATE TABLE IF NOT EXISTS supplier_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    
    -- Match score and components
    match_score DECIMAL(5,2) NOT NULL CHECK (match_score BETWEEN 0 AND 100),
    components JSONB,
    
    -- Metadata
    calculation_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Ensure unique vendor-supplier pair
    UNIQUE(vendor_id, supplier_id)
);

-- Create indexes for supplier_matches
CREATE INDEX IF NOT EXISTS idx_supplier_matches_vendor ON supplier_matches(vendor_id);
CREATE INDEX IF NOT EXISTS idx_supplier_matches_supplier ON supplier_matches(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_matches_score ON supplier_matches(match_score DESC);
CREATE INDEX IF NOT EXISTS idx_supplier_matches_date ON supplier_matches(calculation_date DESC);

-- Apply updated_at trigger
CREATE TRIGGER update_supplier_matches_updated_at 
    BEFORE UPDATE ON supplier_matches
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE supplier_scores IS 'Supplier performance scoring metrics';
COMMENT ON COLUMN supplier_scores.fulfillment_score IS 'Order fulfillment rate score (0-100), weight: 25%';
COMMENT ON COLUMN supplier_scores.delivery_score IS 'Delivery timeliness score (0-100), weight: 25%';
COMMENT ON COLUMN supplier_scores.availability_score IS 'Product availability score (0-100), weight: 20%';
COMMENT ON COLUMN supplier_scores.quality_score IS 'Product quality/feedback score (0-100), weight: 15%';
COMMENT ON COLUMN supplier_scores.price_score IS 'Price competitiveness score (0-100), weight: 15%';
COMMENT ON COLUMN supplier_scores.score_value IS 'Weighted total score (0-100)';
COMMENT ON COLUMN supplier_scores.components IS 'Detailed component breakdown as JSON';

COMMENT ON TABLE supplier_matches IS 'Vendor-supplier matching scores';
COMMENT ON COLUMN supplier_matches.match_score IS 'Matching suitability score (0-100)';
COMMENT ON COLUMN supplier_matches.components IS 'Detailed component breakdown as JSON';
