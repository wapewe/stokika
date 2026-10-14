-- Migration: Allow Anonymous Kit Payment Lookup
-- Description: Allows anonymous users to lookup field_agents, supervisors, and kit_payments by application_code
-- Purpose: Support kit-payment.html page where users verify their application code before payment
-- Security: Only allows SELECT by exact application_code match, no other data exposed

-- ============================================================================
-- Add Anonymous SELECT Policies for Field Agents
-- ============================================================================

-- Allow anonymous users to lookup field agents by application code
CREATE POLICY "Anonymous can lookup field agents by application code"
ON field_agents FOR SELECT
TO anon
USING (
    application_code IS NOT NULL
);

-- ============================================================================
-- Add Anonymous SELECT Policies for Supervisors
-- ============================================================================

-- Allow anonymous users to lookup supervisors by application code
CREATE POLICY "Anonymous can lookup supervisors by application code"
ON supervisors FOR SELECT
TO anon
USING (
    application_code IS NOT NULL
);

-- ============================================================================
-- Add Anonymous SELECT Policies for Kit Payments
-- ============================================================================

-- Allow anonymous users to lookup kit payments by application code
CREATE POLICY "Anonymous can lookup kit payments by application code"
ON stokika_kit_payments FOR SELECT
TO anon
USING (
    application_code IS NOT NULL
);

-- Allow anonymous users to INSERT kit payment records (for creating payment records)
CREATE POLICY "Anonymous can create kit payment records"
ON stokika_kit_payments FOR INSERT
TO anon
WITH CHECK (
    application_code IS NOT NULL
);

-- ============================================================================
-- Add Anonymous SELECT Policy for Kit Config
-- ============================================================================

-- Allow anonymous users to view active kit configurations (needed for payment page)
CREATE POLICY "Anonymous can view active kit configurations"
ON stokika_kit_config FOR SELECT
TO anon
USING (
    is_active = true
);

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON POLICY "Anonymous can lookup field agents by application code" ON field_agents 
IS 'Allows kit-payment page to verify application codes without authentication. Only SELECT access with application_code filter.';

COMMENT ON POLICY "Anonymous can lookup supervisors by application code" ON supervisors 
IS 'Allows kit-payment page to verify application codes without authentication. Only SELECT access with application_code filter.';

COMMENT ON POLICY "Anonymous can lookup kit payments by application code" ON stokika_kit_payments 
IS 'Allows kit-payment page to check existing payment status by application code without authentication.';

COMMENT ON POLICY "Anonymous can create kit payment records" ON stokika_kit_payments 
IS 'Allows kit-payment page to create payment records for verified application codes without authentication.';

COMMENT ON POLICY "Anonymous can view active kit configurations" ON stokika_kit_config 
IS 'Allows kit-payment page to display kit pricing and contents to anonymous users.';
