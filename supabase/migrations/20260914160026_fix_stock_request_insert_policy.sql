-- Migration: Fix Stock Request INSERT Policy
-- Description: Fixes the broken INSERT policy for vendors creating stock requests
-- The original policy checked owns_stock_request_as_vendor(id) which fails because the record doesn't exist yet during INSERT

-- ============================================================================
-- Drop the broken policy
-- ============================================================================

DROP POLICY IF EXISTS "Vendors can create requests" ON stock_requests;

-- ============================================================================
-- Create corrected policy
-- ============================================================================

-- Vendors can create stock requests for their own vendor account
CREATE POLICY "Vendors can create requests"
ON stock_requests FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM vendors v
        WHERE v.id = stock_requests.vendor_id
        AND v.profile_id = auth.uid()
    )
    AND has_role(ARRAY['vendor'])
);

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON POLICY "Vendors can create requests" ON stock_requests IS 'Vendors can create stock requests for their own vendor account';
