-- Migration: Create Stock Workflow Tables
-- Description: Creates stock requests, request items, and request status history tables
-- Requirements: 2.18-2.20, 24.17-24.19

-- ============================================================================
-- Stock Requests Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS stock_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_number TEXT UNIQUE NOT NULL,
    vendor_id UUID NOT NULL REFERENCES vendors(id),
    supplier_id UUID NOT NULL REFERENCES suppliers(id),
    request_status TEXT NOT NULL CHECK (request_status IN (
        'draft', 'submitted', 'under_review', 'approved', 
        'rejected', 'preparing', 'ready_for_delivery', 
        'in_transit', 'delivered', 'cancelled'
    )),
    total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
    requested_delivery_date DATE,
    notes TEXT,
    submitted_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES profiles(id),
    rejected_at TIMESTAMPTZ,
    rejected_by UUID REFERENCES profiles(id),
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for stock_requests
CREATE INDEX IF NOT EXISTS idx_stock_requests_vendor ON stock_requests(vendor_id);
CREATE INDEX IF NOT EXISTS idx_stock_requests_supplier ON stock_requests(supplier_id);
CREATE INDEX IF NOT EXISTS idx_stock_requests_status ON stock_requests(request_status);
CREATE INDEX IF NOT EXISTS idx_stock_requests_number ON stock_requests(request_number);
CREATE INDEX IF NOT EXISTS idx_stock_requests_submitted_at ON stock_requests(submitted_at);

-- Apply updated_at trigger
CREATE TRIGGER update_stock_requests_updated_at 
    BEFORE UPDATE ON stock_requests
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Stock Request Items Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS stock_request_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stock_request_id UUID NOT NULL REFERENCES stock_requests(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
    subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for stock_request_items
CREATE INDEX IF NOT EXISTS idx_stock_request_items_request ON stock_request_items(stock_request_id);
CREATE INDEX IF NOT EXISTS idx_stock_request_items_product ON stock_request_items(product_id);

-- Apply updated_at trigger
CREATE TRIGGER update_stock_request_items_updated_at 
    BEFORE UPDATE ON stock_request_items
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Stock Request Status History Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS stock_request_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stock_request_id UUID NOT NULL REFERENCES stock_requests(id) ON DELETE CASCADE,
    previous_status TEXT NOT NULL,
    new_status TEXT NOT NULL,
    changed_by UUID NOT NULL REFERENCES profiles(id),
    change_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for stock_request_status_history
CREATE INDEX IF NOT EXISTS idx_status_history_request ON stock_request_status_history(stock_request_id);
CREATE INDEX IF NOT EXISTS idx_status_history_created_at ON stock_request_status_history(created_at);

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE stock_requests IS 'Stock requests from vendors to suppliers';
COMMENT ON TABLE stock_request_items IS 'Line items for stock requests';
COMMENT ON TABLE stock_request_status_history IS 'Audit trail of stock request status changes';
COMMENT ON COLUMN stock_requests.request_number IS 'Unique human-readable request identifier';
COMMENT ON COLUMN stock_requests.request_status IS 'Current status of stock request';
COMMENT ON COLUMN stock_requests.total_amount IS 'Total value of stock request';
COMMENT ON COLUMN stock_request_items.subtotal IS 'Line item subtotal (quantity * unit_price)';