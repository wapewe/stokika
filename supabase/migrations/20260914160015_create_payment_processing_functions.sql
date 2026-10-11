-- Migration: Create Payment Processing Database Function
-- Description: Creates database function for processing M-Pesa payments and updating stock request status
-- Requirements: 4.6, 4.7, 4.8

-- ============================================================================
-- Payment Processing Function
-- ============================================================================

CREATE OR REPLACE FUNCTION process_mpesa_payment(
    p_checkout_request_id TEXT,
    p_mpesa_receipt_number TEXT,
    p_result_code INTEGER,
    p_result_description TEXT,
    p_callback_data JSONB
)
RETURNS JSONB AS $$
DECLARE
    v_transaction mpesa_transactions;
    v_payment payments;
    v_stock_request stock_requests;
    v_result JSONB;
BEGIN
    -- Find the M-Pesa transaction
    SELECT * INTO v_transaction
    FROM mpesa_transactions
    WHERE checkout_request_id = p_checkout_request_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Transaction not found'
        );
    END IF;

    -- Update M-Pesa transaction
    UPDATE mpesa_transactions
    SET
        mpesa_receipt_number = p_mpesa_receipt_number,
        result_code = p_result_code,
        result_description = p_result_description,
        transaction_status = CASE
            WHEN p_result_code = 0 THEN 'completed'
            ELSE 'failed'
        END,
        transaction_date = CASE
            WHEN p_result_code = 0 THEN now()
            ELSE transaction_date
        END,
        callback_received_at = now(),
        raw_callback_data = p_callback_data,
        updated_at = now()
    WHERE checkout_request_id = p_checkout_request_id
    RETURNING * INTO v_transaction;

    -- If payment was successful, update payment record
    IF p_result_code = 0 AND v_transaction.payment_id IS NOT NULL THEN
        UPDATE payments
        SET
            payment_status = 'completed',
            transaction_date = now(),
            paid_date = CURRENT_DATE,
            updated_at = now()
        WHERE id = v_transaction.payment_id
        RETURNING * INTO v_payment;

        -- Update stock request status to approved if payment is complete
        IF v_payment.stock_request_id IS NOT NULL THEN
            UPDATE stock_requests
            SET
                request_status = 'approved',
                approved_at = now(),
                updated_at = now()
            WHERE id = v_payment.stock_request_id
            RETURNING * INTO v_stock_request;

            -- Insert status history
            INSERT INTO stock_request_status_history (
                stock_request_id,
                previous_status,
                new_status,
                changed_by,
                change_reason
            ) VALUES (
                v_stock_request.id,
                'submitted',
                'approved',
                v_stock_request.vendor_id,
                'Payment completed via M-Pesa'
            );
        END IF;
    ELSE
        -- Payment failed, update payment status
        IF v_transaction.payment_id IS NOT NULL THEN
            UPDATE payments
            SET
                payment_status = 'failed',
                notes = p_result_description,
                updated_at = now()
            WHERE id = v_transaction.payment_id;
        END IF;
    END IF;

    -- Return result
    v_result := jsonb_build_object(
        'success', true,
        'transaction_status', v_transaction.transaction_status,
        'payment_status', COALESCE(v_payment.payment_status, 'unknown'),
        'mpesa_receipt', p_mpesa_receipt_number
    );

    RETURN v_result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Function to Initiate M-Pesa STK Push
-- ============================================================================

CREATE OR REPLACE FUNCTION initiate_mpesa_payment(
    p_payment_id UUID,
    p_phone_number TEXT,
    p_amount DECIMAL,
    p_merchant_request_id TEXT,
    p_checkout_request_id TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_transaction_id UUID;
BEGIN
    -- Create M-Pesa transaction record
    INSERT INTO mpesa_transactions (
        payment_id,
        merchant_request_id,
        checkout_request_id,
        phone_number,
        amount,
        transaction_type,
        transaction_status
    ) VALUES (
        p_payment_id,
        p_merchant_request_id,
        p_checkout_request_id,
        p_phone_number,
        p_amount,
        'STK_PUSH',
        'initiated'
    )
    RETURNING id INTO v_transaction_id;

    -- Update payment status to processing
    UPDATE payments
    SET
        payment_status = 'processing',
        updated_at = now()
    WHERE id = p_payment_id;

    RETURN jsonb_build_object(
        'success', true,
        'transaction_id', v_transaction_id,
        'checkout_request_id', p_checkout_request_id
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON FUNCTION process_mpesa_payment IS 'Process M-Pesa callback and update payment and stock request status';
COMMENT ON FUNCTION initiate_mpesa_payment IS 'Create M-Pesa transaction record and initiate STK push';