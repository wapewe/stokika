-- Migration: Fix Delivery Tables Schema
-- Description: Adds missing columns to deliveries table and fixes column names
-- Requirements: DeliveryService compatibility

-- ============================================================================
-- Add Missing Columns to Deliveries Table
-- ============================================================================

-- Add tracking_number column (alias for delivery_number for external tracking)
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS tracking_number TEXT;

-- Add carrier_name column
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS carrier_name TEXT;

-- Add estimated_delivery_date column  
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS estimated_delivery_date DATE;

-- Update tracking_number to match delivery_number for existing records
UPDATE deliveries SET tracking_number = delivery_number WHERE tracking_number IS NULL;

-- Create index on tracking_number
CREATE INDEX IF NOT EXISTS idx_deliveries_tracking_number ON deliveries(tracking_number);

-- ============================================================================
-- Add Missing Columns to Delivery Status History
-- ============================================================================

-- Add event_location as text field (combining lat/long or as address)
ALTER TABLE delivery_status_history ADD COLUMN IF NOT EXISTS event_location TEXT;

-- Add event_notes column
ALTER TABLE delivery_status_history ADD COLUMN IF NOT EXISTS event_notes TEXT;

-- Create index on event_location
CREATE INDEX IF NOT EXISTS idx_delivery_status_history_location ON delivery_status_history(event_location);

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON COLUMN deliveries.tracking_number IS 'External tracking number for carrier tracking (mirrors delivery_number)';
COMMENT ON COLUMN deliveries.carrier_name IS 'Name of delivery carrier/company';
COMMENT ON COLUMN deliveries.estimated_delivery_date IS 'Estimated delivery date provided by carrier';
COMMENT ON COLUMN delivery_status_history.event_location IS 'Location where status change occurred (address or GPS coordinates)';
COMMENT ON COLUMN delivery_status_history.event_notes IS 'Additional notes about the status change event';
