-- Migration: Create Update Triggers for Timestamps
-- Description: Note - updated_at triggers were already created in the initial table migrations
-- This migration adds any additional triggers and audit logging triggers
-- Requirements: 4.13

-- ============================================================================
-- Audit Log Trigger Function
-- ============================================================================

CREATE OR REPLACE FUNCTION log_audit_trail()
RETURNS TRIGGER AS $$
DECLARE
    v_old_values JSONB;
    v_new_values JSONB;
    v_action TEXT;
BEGIN
    -- Determine action type
    IF TG_OP = 'INSERT' THEN
        v_action := 'CREATE';
        v_old_values := NULL;
        v_new_values := to_jsonb(NEW);
    ELSIF TG_OP = 'UPDATE' THEN
        v_action := 'UPDATE';
        v_old_values := to_jsonb(OLD);
        v_new_values := to_jsonb(NEW);
    ELSIF TG_OP = 'DELETE' THEN
        v_action := 'DELETE';
        v_old_values := to_jsonb(OLD);
        v_new_values := NULL;
    END IF;

    -- Insert audit log
    INSERT INTO audit_logs (
        user_id,
        action,
        entity_type,
        entity_id,
        old_values,
        new_values
    ) VALUES (
        auth.uid(),
        v_action,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        v_old_values,
        v_new_values
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- Apply Audit Logging Triggers to Critical Tables
-- ============================================================================

-- Vendors
CREATE TRIGGER audit_vendors
    AFTER INSERT OR UPDATE OR DELETE ON vendors
    FOR EACH ROW
    EXECUTE FUNCTION log_audit_trail();

-- Suppliers
CREATE TRIGGER audit_suppliers
    AFTER INSERT OR UPDATE OR DELETE ON suppliers
    FOR EACH ROW
    EXECUTE FUNCTION log_audit_trail();

-- Stock Requests
CREATE TRIGGER audit_stock_requests
    AFTER INSERT OR UPDATE OR DELETE ON stock_requests
    FOR EACH ROW
    EXECUTE FUNCTION log_audit_trail();

-- Payments
CREATE TRIGGER audit_payments
    AFTER INSERT OR UPDATE OR DELETE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION log_audit_trail();

-- M-Pesa Transactions
CREATE TRIGGER audit_mpesa_transactions
    AFTER INSERT OR UPDATE ON mpesa_transactions
    FOR EACH ROW
    EXECUTE FUNCTION log_audit_trail();

-- Vendor Eligibility
CREATE TRIGGER audit_vendor_eligibility
    AFTER INSERT OR UPDATE OR DELETE ON vendor_eligibility
    FOR EACH ROW
    EXECUTE FUNCTION log_audit_trail();

-- Vendor Scores
CREATE TRIGGER audit_vendor_scores
    AFTER INSERT OR UPDATE OR DELETE ON vendor_scores
    FOR EACH ROW
    EXECUTE FUNCTION log_audit_trail();

-- ============================================================================
-- Stock Request Status Change Trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION log_stock_request_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log if status actually changed
    IF OLD.request_status IS DISTINCT FROM NEW.request_status THEN
        INSERT INTO stock_request_status_history (
            stock_request_id,
            previous_status,
            new_status,
            changed_by,
            change_reason
        ) VALUES (
            NEW.id,
            OLD.request_status,
            NEW.request_status,
            auth.uid(),
            'Status changed'
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER track_stock_request_status_changes
    AFTER UPDATE ON stock_requests
    FOR EACH ROW
    EXECUTE FUNCTION log_stock_request_status_change();

-- ============================================================================
-- Delivery Status Change Trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION log_delivery_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log if status actually changed
    IF OLD.delivery_status IS DISTINCT FROM NEW.delivery_status THEN
        INSERT INTO delivery_status_history (
            delivery_id,
            previous_status,
            new_status,
            changed_by,
            change_reason
        ) VALUES (
            NEW.id,
            OLD.delivery_status,
            NEW.delivery_status,
            auth.uid(),
            'Status changed'
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER track_delivery_status_changes
    AFTER UPDATE ON deliveries
    FOR EACH ROW
    EXECUTE FUNCTION log_delivery_status_change();

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON FUNCTION log_audit_trail IS 'Generic audit logging function for all critical table changes';
COMMENT ON FUNCTION log_stock_request_status_change IS 'Automatically log stock request status changes to history table';
COMMENT ON FUNCTION log_delivery_status_change IS 'Automatically log delivery status changes to history table';