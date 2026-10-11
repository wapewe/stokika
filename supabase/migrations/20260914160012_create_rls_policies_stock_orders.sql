-- Migration: Create RLS Policies for Stock Orders
-- Description: Implements Row Level Security policies for stock_requests, stock_request_items, and related tables
-- Requirements: 3.1-3.5, 25.1-25.8

-- ============================================================================
-- Enable RLS on Stock Order Tables
-- ============================================================================

ALTER TABLE stock_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_request_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_status_history ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to check if user owns the vendor for a stock request
CREATE OR REPLACE FUNCTION owns_stock_request_as_vendor(request_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM stock_requests sr
        JOIN vendors v ON sr.vendor_id = v.id
        WHERE sr.id = request_uuid
        AND v.profile_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user owns the supplier for a stock request
CREATE OR REPLACE FUNCTION owns_stock_request_as_supplier(request_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM stock_requests sr
        JOIN suppliers s ON sr.supplier_id = s.id
        WHERE sr.id = request_uuid
        AND s.profile_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Stock Requests Table Policies
-- ============================================================================

-- Vendors can view their own stock requests
CREATE POLICY "Vendors can view own requests"
ON stock_requests FOR SELECT
USING (owns_stock_request_as_vendor(id));

-- Vendors can create stock requests
CREATE POLICY "Vendors can create requests"
ON stock_requests FOR INSERT
WITH CHECK (
    owns_stock_request_as_vendor(id)
    AND has_role(ARRAY['vendor'])
);

-- Vendors can update their draft requests
CREATE POLICY "Vendors can update draft requests"
ON stock_requests FOR UPDATE
USING (
    owns_stock_request_as_vendor(id)
    AND request_status = 'draft'
)
WITH CHECK (
    owns_stock_request_as_vendor(id)
);

-- Suppliers can view requests assigned to them
CREATE POLICY "Suppliers can view assigned requests"
ON stock_requests FOR SELECT
USING (owns_stock_request_as_supplier(id));

-- Suppliers can update request status
CREATE POLICY "Suppliers can update request status"
ON stock_requests FOR UPDATE
USING (
    owns_stock_request_as_supplier(id)
    AND request_status IN ('submitted', 'approved', 'preparing', 'ready_for_delivery')
)
WITH CHECK (owns_stock_request_as_supplier(id));

-- Staff can view and manage all requests
CREATE POLICY "Staff can manage all requests"
ON stock_requests FOR ALL
USING (has_role(ARRAY['operations', 'finance', 'admin', 'super_admin']))
WITH CHECK (has_role(ARRAY['operations', 'finance', 'admin', 'super_admin']));

-- ============================================================================
-- Stock Request Items Table Policies
-- ============================================================================

-- Vendors can manage items in their draft requests
CREATE POLICY "Vendors can manage own request items"
ON stock_request_items FOR ALL
USING (
    owns_stock_request_as_vendor(stock_request_id)
    AND EXISTS (
        SELECT 1 FROM stock_requests
        WHERE id = stock_request_id
        AND request_status = 'draft'
    )
)
WITH CHECK (owns_stock_request_as_vendor(stock_request_id));

-- Vendors and suppliers can view items in their requests
CREATE POLICY "Parties can view request items"
ON stock_request_items FOR SELECT
USING (
    owns_stock_request_as_vendor(stock_request_id)
    OR owns_stock_request_as_supplier(stock_request_id)
);

-- Staff can manage all request items
CREATE POLICY "Staff can manage all request items"
ON stock_request_items FOR ALL
USING (has_role(ARRAY['operations', 'finance', 'admin', 'super_admin']))
WITH CHECK (has_role(ARRAY['operations', 'finance', 'admin', 'super_admin']));

-- ============================================================================
-- Stock Request Status History Policies
-- ============================================================================

-- Parties can view status history of their requests
CREATE POLICY "Parties can view request status history"
ON stock_request_status_history FOR SELECT
USING (
    owns_stock_request_as_vendor(stock_request_id)
    OR owns_stock_request_as_supplier(stock_request_id)
);

-- Only authenticated users can insert status history (via triggers)
CREATE POLICY "System can insert status history"
ON stock_request_status_history FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Staff can view all status history
CREATE POLICY "Staff can view all status history"
ON stock_request_status_history FOR SELECT
USING (has_role(ARRAY['operations', 'finance', 'admin', 'super_admin']));

-- ============================================================================
-- Deliveries Table Policies
-- ============================================================================

-- Vendors can view deliveries for their requests
CREATE POLICY "Vendors can view own deliveries"
ON deliveries FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM stock_requests
        WHERE id = deliveries.stock_request_id
        AND owns_stock_request_as_vendor(id)
    )
);

-- Suppliers can view and manage deliveries for their requests
CREATE POLICY "Suppliers can manage deliveries"
ON deliveries FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM stock_requests
        WHERE id = deliveries.stock_request_id
        AND owns_stock_request_as_supplier(id)
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM stock_requests
        WHERE id = deliveries.stock_request_id
        AND owns_stock_request_as_supplier(id)
    )
);

-- Staff can manage all deliveries
CREATE POLICY "Staff can manage all deliveries"
ON deliveries FOR ALL
USING (has_role(ARRAY['operations', 'finance', 'admin', 'super_admin']))
WITH CHECK (has_role(ARRAY['operations', 'finance', 'admin', 'super_admin']));

-- ============================================================================
-- Delivery Status History Policies
-- ============================================================================

-- Parties can view delivery status history
CREATE POLICY "Parties can view delivery history"
ON delivery_status_history FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM deliveries d
        JOIN stock_requests sr ON d.stock_request_id = sr.id
        WHERE d.id = delivery_status_history.delivery_id
        AND (owns_stock_request_as_vendor(sr.id) OR owns_stock_request_as_supplier(sr.id))
    )
);

-- Authenticated users can insert delivery history
CREATE POLICY "System can insert delivery history"
ON delivery_status_history FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Staff can view all delivery history
CREATE POLICY "Staff can view all delivery history"
ON delivery_status_history FOR SELECT
USING (has_role(ARRAY['operations', 'finance', 'admin', 'super_admin']));

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON POLICY "Vendors can view own requests" ON stock_requests IS 'Vendors can view stock requests they created';
COMMENT ON POLICY "Suppliers can view assigned requests" ON stock_requests IS 'Suppliers can view requests assigned to them';
COMMENT ON FUNCTION owns_stock_request_as_vendor(UUID) IS 'Check if current user owns the vendor for specified stock request';
COMMENT ON FUNCTION owns_stock_request_as_supplier(UUID) IS 'Check if current user owns the supplier for specified stock request';