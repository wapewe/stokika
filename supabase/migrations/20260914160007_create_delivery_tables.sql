-- Migration: Create Delivery Tables
-- Description: Creates deliveries and delivery status history tables
-- Requirements: 2.21-2.22, 24.20-24.21

-- ============================================================================
-- Deliveries Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_number TEXT UNIQUE NOT NULL,
    stock_request_id UUID NOT NULL REFERENCES stock_requests(id),
    delivery_status TEXT NOT NULL CHECK (delivery_status IN (
        'pending', 'assigned', 'in_transit', 'delivered', 'failed', 'cancelled'
    )),
    delivery_address TEXT NOT NULL,
    delivery_contact_name TEXT,
    delivery_contact_phone TEXT CHECK (delivery_contact_phone ~ '^254[0-9]{9}$'),
    driver_name TEXT,
    driver_phone TEXT CHECK (driver_phone ~ '^254[0-9]{9}$'),
    vehicle_number TEXT,
    scheduled_delivery_date DATE,
    actual_delivery_date DATE,
    delivery_notes TEXT,
    proof_of_delivery_url TEXT,
    received_by_name TEXT,
    received_by_signature_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for deliveries
CREATE INDEX IF NOT EXISTS idx_deliveries_stock_request ON deliveries(stock_request_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(delivery_status);
CREATE INDEX IF NOT EXISTS idx_deliveries_number ON deliveries(delivery_number);
CREATE INDEX IF NOT EXISTS idx_deliveries_scheduled_date ON deliveries(scheduled_delivery_date);

-- Apply updated_at trigger
CREATE TRIGGER update_deliveries_updated_at 
    BEFORE UPDATE ON deliveries
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Delivery Status History Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS delivery_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_id UUID NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
    previous_status TEXT NOT NULL,
    new_status TEXT NOT NULL,
    changed_by UUID NOT NULL REFERENCES profiles(id),
    change_reason TEXT,
    location_latitude DECIMAL(10,7),
    location_longitude DECIMAL(10,7),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for delivery_status_history
CREATE INDEX IF NOT EXISTS idx_delivery_status_history_delivery ON delivery_status_history(delivery_id);
CREATE INDEX IF NOT EXISTS idx_delivery_status_history_created_at ON delivery_status_history(created_at);

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE deliveries IS 'Delivery tracking for stock requests';
COMMENT ON TABLE delivery_status_history IS 'Audit trail of delivery status changes';
COMMENT ON COLUMN deliveries.delivery_number IS 'Unique human-readable delivery identifier';
COMMENT ON COLUMN deliveries.delivery_status IS 'Current status of delivery';
COMMENT ON COLUMN deliveries.proof_of_delivery_url IS 'URL to photo/document proving delivery';
COMMENT ON COLUMN deliveries.received_by_signature_url IS 'URL to recipient signature image';
COMMENT ON COLUMN delivery_status_history.location_latitude IS 'GPS latitude when status changed';
COMMENT ON COLUMN delivery_status_history.location_longitude IS 'GPS longitude when status changed';