-- Migration: Create RLS Policies for Payment Transactions
-- Description: Implements Row Level Security policies for payments and mpesa_transactions tables
-- Requirements: 3.1-3.5, 25.1-25.8

-- ============================================================================
-- Enable RLS on Payment Tables
-- ============================================================================

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE mpesa_transactions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Payments Table Policies
-- ============================================================================

-- Vendors can view their own payments
CREATE POLICY "Vendors can view own payments"
ON payments FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM vendors
        WHERE id = payments.vendor_id
        AND profile_id = auth.uid()
    )
);

-- Suppliers can view payments for their requests
CREATE POLICY "Suppliers can view assigned payments"
ON payments FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM suppliers
        WHERE id = payments.supplier_id
        AND profile_id = auth.uid()
    )
);

-- Finance and admin can view all payments
CREATE POLICY "Finance can view all payments"
ON payments FOR SELECT
USING (has_role(ARRAY['finance', 'operations', 'admin', 'super_admin']));

-- Finance can create and update payments
CREATE POLICY "Finance can manage payments"
ON payments FOR ALL
USING (has_role(ARRAY['finance', 'admin', 'super_admin']))
WITH CHECK (has_role(ARRAY['finance', 'admin', 'super_admin']));

-- ============================================================================
-- M-Pesa Transactions Table Policies
-- ============================================================================

-- Users can view their own M-Pesa transactions
CREATE POLICY "Users can view own mpesa transactions"
ON mpesa_transactions FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM payments p
        WHERE p.id = mpesa_transactions.payment_id
        AND (
            EXISTS (
                SELECT 1 FROM vendors
                WHERE id = p.vendor_id
                AND profile_id = auth.uid()
            )
            OR EXISTS (
                SELECT 1 FROM suppliers
                WHERE id = p.supplier_id
                AND profile_id = auth.uid()
            )
        )
    )
);

-- Finance can view all M-Pesa transactions
CREATE POLICY "Finance can view all mpesa transactions"
ON mpesa_transactions FOR SELECT
USING (has_role(ARRAY['finance', 'operations', 'admin', 'super_admin']));

-- Only system (finance) can create and update M-Pesa transactions
CREATE POLICY "Finance can manage mpesa transactions"
ON mpesa_transactions FOR ALL
USING (has_role(ARRAY['finance', 'admin', 'super_admin']))
WITH CHECK (has_role(ARRAY['finance', 'admin', 'super_admin']));

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON POLICY "Vendors can view own payments" ON payments IS 'Vendors can view payments related to their stock requests';
COMMENT ON POLICY "Suppliers can view assigned payments" ON payments IS 'Suppliers can view payments for requests assigned to them';
COMMENT ON POLICY "Finance can manage payments" ON payments IS 'Finance staff can create and update all payment records';