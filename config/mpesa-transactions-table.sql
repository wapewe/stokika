-- M-Pesa Transactions Table
-- Store all M-Pesa callback data for auditing and reconciliation

CREATE TABLE IF NOT EXISTS mpesa_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_request_id VARCHAR(100) UNIQUE NOT NULL,
    checkout_request_id VARCHAR(100) UNIQUE NOT NULL,
    result_code INTEGER NOT NULL,
    result_description TEXT,
    transaction_details JSONB,
    raw_callback JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_mpesa_merchant_request ON mpesa_transactions(merchant_request_id);
CREATE INDEX IF NOT EXISTS idx_mpesa_checkout_request ON mpesa_transactions(checkout_request_id);
CREATE INDEX IF NOT EXISTS idx_mpesa_result_code ON mpesa_transactions(result_code);
CREATE INDEX IF NOT EXISTS idx_mpesa_created_at ON mpesa_transactions(created_at);

-- Add checkout_request_id to payments table for linking
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS checkout_request_id VARCHAR(100),
ADD COLUMN IF NOT EXISTS mpesa_receipt VARCHAR(100),
ADD COLUMN IF NOT EXISTS transaction_date TIMESTAMP WITH TIME ZONE;

-- Create index on payments
CREATE INDEX IF NOT EXISTS idx_payments_checkout_request ON payments(checkout_request_id);

-- Enable RLS
ALTER TABLE mpesa_transactions ENABLE ROW LEVEL SECURITY;

-- Admin-only access to M-Pesa transactions
CREATE POLICY "Admin can view M-Pesa transactions"
    ON mpesa_transactions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.user_type = 'admin'
        )
    );

-- Service role can insert (for callbacks)
CREATE POLICY "Service role can insert M-Pesa transactions"
    ON mpesa_transactions FOR INSERT
    WITH CHECK (true);

-- Comments
COMMENT ON TABLE mpesa_transactions IS 'Stores all M-Pesa Daraja API callbacks for auditing and reconciliation';
COMMENT ON COLUMN mpesa_transactions.merchant_request_id IS 'Unique identifier from M-Pesa for the transaction request';
COMMENT ON COLUMN mpesa_transactions.checkout_request_id IS 'Unique checkout session identifier';
COMMENT ON COLUMN mpesa_transactions.result_code IS '0 = Success, non-zero = Failed';
COMMENT ON COLUMN mpesa_transactions.raw_callback IS 'Complete JSON payload from Safaricom for debugging';
