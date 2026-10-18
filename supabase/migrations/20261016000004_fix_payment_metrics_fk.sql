-- Drop the foreign key constraint on payment_metrics.payment_id
-- The column stores either stokika_kit_payments.id or payment_intents.id depending on flow_type
-- Enforcing a single FK is too restrictive and causes insert failures
ALTER TABLE payment_metrics 
DROP CONSTRAINT IF EXISTS payment_metrics_payment_id_fkey;

-- Make payment_id nullable (it may already be, but explicit here)
ALTER TABLE payment_metrics 
ALTER COLUMN payment_id DROP NOT NULL;

-- Add a comment explaining the column's dual purpose
COMMENT ON COLUMN payment_metrics.payment_id IS 
'Stores stokika_kit_payments.id for kit_payment flows, payment_intents.id for vendor_registration flows. No FK enforced due to multi-table reference.';

-- Create an index for fast lookups
CREATE INDEX IF NOT EXISTS idx_payment_metrics_payment_id 
ON payment_metrics(payment_id) 
WHERE payment_id IS NOT NULL;

-- Ensure service_role has access
GRANT ALL ON TABLE payment_metrics TO service_role;
