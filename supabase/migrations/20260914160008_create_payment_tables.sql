-- Migration: Create Payment Tables
-- Description: Creates payments and M-Pesa transactions tables
-- Requirements: 2.23-2.24, 24.22-24.23

-- ============================================================================
-- Payments Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_reference TEXT UNIQUE NOT NULL,
    stock_request_id UUID NOT NULL REFERENCES stock_requests(id),
    vendor_id UUID NOT NULL REFERENCES vendors(id),
    supplier_id UUID NOT NULL REFERENCES suppliers(id),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('mpesa', 'bank_transfer', 'cash', 'other')),
    amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
    payment_status TEXT NOT NULL CHECK (payment_status IN (
        'pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'
    )),
    transaction_date TIMESTAMPTZ,
    due_date DATE,
    paid_date DATE,
    payment_terms TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for payments
CREATE INDEX IF NOT EXISTS idx_payments_stock_request ON payments(stock_request_id);
CREATE INDEX IF NOT EXISTS idx_payments_vendor ON payments(vendor_id);
CREATE INDEX IF NOT EXISTS idx_payments_supplier ON payments(supplier_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_reference ON payments(payment_reference);
CREATE INDEX IF NOT EXISTS idx_payments_due_date ON payments(due_date);

-- Apply updated_at trigger
CREATE TRIGGER update_payments_updated_at 
    BEFORE UPDATE ON payments
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- M-Pesa Transactions Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS mpesa_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
    merchant_request_id TEXT,
    checkout_request_id TEXT UNIQUE,
    mpesa_receipt_number TEXT UNIQUE,
    phone_number TEXT NOT NULL CHECK (phone_number ~ '^254[0-9]{9}$'),
    amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('STK_PUSH', 'B2C', 'B2B', 'C2B')),
    transaction_status TEXT NOT NULL CHECK (transaction_status IN (
        'initiated', 'pending', 'completed', 'failed', 'cancelled', 'timeout'
    )),
    result_code INTEGER,
    result_description TEXT,
    transaction_date TIMESTAMPTZ,
    callback_received_at TIMESTAMPTZ,
    raw_callback_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for mpesa_transactions
CREATE INDEX IF NOT EXISTS idx_mpesa_transactions_payment ON mpesa_transactions(payment_id);
CREATE INDEX IF NOT EXISTS idx_mpesa_transactions_checkout_request ON mpesa_transactions(checkout_request_id);
CREATE INDEX IF NOT EXISTS idx_mpesa_transactions_receipt ON mpesa_transactions(mpesa_receipt_number);
CREATE INDEX IF NOT EXISTS idx_mpesa_transactions_phone ON mpesa_transactions(phone_number);
CREATE INDEX IF NOT EXISTS idx_mpesa_transactions_status ON mpesa_transactions(transaction_status);
CREATE INDEX IF NOT EXISTS idx_mpesa_transactions_date ON mpesa_transactions(transaction_date);

-- Apply updated_at trigger
CREATE TRIGGER update_mpesa_transactions_updated_at 
    BEFORE UPDATE ON mpesa_transactions
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE payments IS 'Payment records for stock requests';
COMMENT ON TABLE mpesa_transactions IS 'M-Pesa transaction records and callbacks';
COMMENT ON COLUMN payments.payment_reference IS 'Unique human-readable payment identifier';
COMMENT ON COLUMN payments.payment_status IS 'Current status of payment';
COMMENT ON COLUMN payments.payment_terms IS 'Payment terms and conditions';
COMMENT ON COLUMN mpesa_transactions.merchant_request_id IS 'M-Pesa merchant request ID';
COMMENT ON COLUMN mpesa_transactions.checkout_request_id IS 'M-Pesa STK push checkout request ID';
COMMENT ON COLUMN mpesa_transactions.mpesa_receipt_number IS 'M-Pesa transaction receipt number';
COMMENT ON COLUMN mpesa_transactions.transaction_type IS 'Type of M-Pesa transaction';
COMMENT ON COLUMN mpesa_transactions.raw_callback_data IS 'Raw JSON callback data from M-Pesa API';