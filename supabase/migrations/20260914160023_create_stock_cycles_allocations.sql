-- Migration: Create Stock Cycles and Payment Allocations Tables
-- Description: Creates tables for payment cycle tracking and allocation management
-- Requirements: Task 18.3 - Payment allocation and cycle management

-- ============================================================================
-- Stock Cycles Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS stock_cycles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stock_request_id UUID NOT NULL REFERENCES stock_requests(id) ON DELETE CASCADE,
    vendor_id UUID NOT NULL REFERENCES vendors(id),
    cycle_number INTEGER NOT NULL,
    cycle_amount DECIMAL(10,2) NOT NULL CHECK (cycle_amount >= 0),
    paid_amount DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
    balance DECIMAL(10,2) GENERATED ALWAYS AS (cycle_amount - paid_amount) STORED,
    cycle_status TEXT NOT NULL DEFAULT 'pending' CHECK (cycle_status IN (
        'pending', 'active', 'completed', 'overdue', 'cancelled'
    )),
    due_date DATE NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(stock_request_id, cycle_number)
);

-- Create indexes for stock_cycles
CREATE INDEX IF NOT EXISTS idx_stock_cycles_stock_request ON stock_cycles(stock_request_id);
CREATE INDEX IF NOT EXISTS idx_stock_cycles_vendor ON stock_cycles(vendor_id);
CREATE INDEX IF NOT EXISTS idx_stock_cycles_status ON stock_cycles(cycle_status);
CREATE INDEX IF NOT EXISTS idx_stock_cycles_due_date ON stock_cycles(due_date);
CREATE INDEX IF NOT EXISTS idx_stock_cycles_balance ON stock_cycles((cycle_amount - paid_amount));

-- Apply updated_at trigger
CREATE TRIGGER update_stock_cycles_updated_at 
    BEFORE UPDATE ON stock_cycles
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Payment Allocations Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    stock_cycle_id UUID NOT NULL REFERENCES stock_cycles(id) ON DELETE CASCADE,
    allocated_amount DECIMAL(10,2) NOT NULL CHECK (allocated_amount > 0),
    allocation_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for payment_allocations
CREATE INDEX IF NOT EXISTS idx_payment_allocations_payment ON payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_cycle ON payment_allocations(stock_cycle_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_date ON payment_allocations(allocation_date);

-- ============================================================================
-- Enable RLS
-- ============================================================================

ALTER TABLE stock_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_allocations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS Policies for Stock Cycles
-- ============================================================================

-- Vendors can view their own cycles
CREATE POLICY "Vendors can view own cycles"
ON stock_cycles FOR SELECT
USING (vendor_id IN (SELECT id FROM vendors WHERE profile_id = auth.uid()));

-- Finance and admin can view all cycles
CREATE POLICY "Staff can view all cycles"
ON stock_cycles FOR SELECT
USING (has_role(ARRAY['finance', 'operations', 'admin', 'super_admin']));

-- Finance and admin can manage cycles
CREATE POLICY "Staff can manage cycles"
ON stock_cycles FOR ALL
USING (has_role(ARRAY['finance', 'admin', 'super_admin']))
WITH CHECK (has_role(ARRAY['finance', 'admin', 'super_admin']));

-- ============================================================================
-- RLS Policies for Payment Allocations
-- ============================================================================

-- Vendors can view allocations for their cycles
CREATE POLICY "Vendors can view own allocations"
ON payment_allocations FOR SELECT
USING (
    stock_cycle_id IN (
        SELECT id FROM stock_cycles WHERE vendor_id IN (
            SELECT id FROM vendors WHERE profile_id = auth.uid()
        )
    )
);

-- Finance and admin can view all allocations
CREATE POLICY "Staff can view all allocations"
ON payment_allocations FOR SELECT
USING (has_role(ARRAY['finance', 'operations', 'admin', 'super_admin']));

-- Finance and admin can manage allocations
CREATE POLICY "Staff can manage allocations"
ON payment_allocations FOR ALL
USING (has_role(ARRAY['finance', 'admin', 'super_admin']))
WITH CHECK (has_role(ARRAY['finance', 'admin', 'super_admin']));

-- ============================================================================
-- Trigger to Auto-Complete Cycle When Balance is Zero
-- ============================================================================

CREATE OR REPLACE FUNCTION auto_complete_cycle()
RETURNS TRIGGER AS $$
BEGIN
    -- If paid_amount equals cycle_amount, mark as completed
    IF NEW.paid_amount >= NEW.cycle_amount AND NEW.cycle_status != 'completed' THEN
        NEW.cycle_status = 'completed';
        NEW.completed_at = now();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_complete_cycle
    BEFORE UPDATE ON stock_cycles
    FOR EACH ROW
    WHEN (NEW.paid_amount IS DISTINCT FROM OLD.paid_amount)
    EXECUTE FUNCTION auto_complete_cycle();

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE stock_cycles IS 'Repayment cycles for stock requests';
COMMENT ON TABLE payment_allocations IS 'Allocations of payments to specific stock cycles';
COMMENT ON COLUMN stock_cycles.cycle_number IS 'Sequential cycle number within a stock request (1, 2, 3, etc.)';
COMMENT ON COLUMN stock_cycles.cycle_amount IS 'Total amount due for this cycle';
COMMENT ON COLUMN stock_cycles.paid_amount IS 'Total amount paid towards this cycle';
COMMENT ON COLUMN stock_cycles.balance IS 'Computed: cycle_amount - paid_amount';
COMMENT ON COLUMN stock_cycles.cycle_status IS 'Current status of the payment cycle';
COMMENT ON COLUMN payment_allocations.allocated_amount IS 'Amount allocated from payment to this cycle';
COMMENT ON FUNCTION auto_complete_cycle IS 'Automatically marks cycle as completed when fully paid';
