# Task 1.2 Completion Summary: Enhance stokika_kit_payments Table with Timeout Fields

## Task Overview
Enhanced the `stokika_kit_payments` table with timeout monitoring and fallback management fields to support comprehensive payment tracking and manual intervention workflows.

## Requirements Satisfied
- 2.1: STK Push Payment Initiation
- 2.3: STK Push Timeout Handling  
- 3.9: Environment Configuration Management
- 4.8: M-Pesa Callback Processing
- 7.1: Payment Status Tracking
- 7.4: Payment Status Tracking

## Changes Implemented

### 1. New Table Columns Added

The following columns were added to `stokika_kit_payments`:

| Column Name | Type | Default | Description |
|------------|------|---------|-------------|
| `flow_type` | VARCHAR(50) | 'kit_payment' | Identifies payment flow type (kit_payment, order_payment, etc.) |
| `timeout_detected_at` | TIMESTAMP WITH TIME ZONE | NULL | Records when timeout was detected (>90 seconds pending) |
| `status_query_count` | INTEGER | 0 | Counts status query attempts for fallback mechanism |
| `last_status_query_at` | TIMESTAMP WITH TIME ZONE | NULL | Timestamp of last status query attempt |
| `manual_fallback_required` | BOOLEAN | FALSE | Flags payments requiring manual intervention |
| `manual_payment_confirmed_at` | TIMESTAMP WITH TIME ZONE | NULL | Records when admin confirmed manual payment |
| `verification_notes` | TEXT | NULL | Admin notes for payment verification |

### 2. Updated Payment Status Constraint

Updated the `payment_status` check constraint to include new timeout-related statuses:
- **Added**: `timeout`, `callback_missing`, `manual_verification_pending`
- **Existing**: `pending`, `completed`, `verified`, `failed`, `awaiting_verification`, `rejected`, `refunded`

### 3. New Database Index

Created composite index for efficient timeout monitoring queries:
```sql
CREATE INDEX idx_kit_payments_status_created 
ON stokika_kit_payments(payment_status, created_at);
```

This index optimizes queries that filter by status and sort by creation time, which is essential for timeout detection.

### 4. New Database Function

**`increment_status_query_count(p_checkout_request_id)`**
- Increments the status query counter for a payment
- Updates `last_status_query_at` timestamp
- Automatically sets `manual_fallback_required = TRUE` after 3 query attempts
- Returns the new query count

Usage example:
```sql
SELECT increment_status_query_count('ws_CO_123456789');
```

### 5. New Monitoring View

**`v_payment_timeout_monitoring`**

Comprehensive view for monitoring payment timeouts and status queries with columns:
- All payment details (id, application_code, phone_number, amount, etc.)
- Timeout tracking (timeout_detected_at, status_query_count, last_status_query_at)
- Calculated metrics (seconds_since_created, seconds_to_timeout)
- Monitoring status: 
  - `TIMED_OUT` - Payment has timed out
  - `CALLBACK_MISSING` - No callback received
  - `MANUAL_REQUIRED` - Manual intervention needed
  - `SHOULD_TIMEOUT` - Pending >90 seconds
  - `AT_RISK` - Pending >60 seconds
  - `OK` - Within normal window

Usage example:
```sql
-- View all payments requiring attention
SELECT * FROM v_payment_timeout_monitoring 
WHERE monitoring_status IN ('TIMED_OUT', 'MANUAL_REQUIRED', 'SHOULD_TIMEOUT');
```

### 6. Enhanced Timeout Detection Function

Updated `detect_payment_timeouts()` function to populate the new `timeout_detected_at` field when marking payments as timed out.

## Integration Points

### Edge Functions
These new fields will be used by:
- `mpesa-status-query` - Updates `status_query_count` and `last_status_query_at`
- `mpesa-callback` - Can set `manual_fallback_required` when issues detected
- Timeout detection job - Sets `timeout_detected_at` when timeouts occur

### Admin Dashboard
The new fields enable:
- Real-time monitoring of timeout risks via `v_payment_timeout_monitoring`
- Manual payment confirmation workflow using `manual_payment_confirmed_at`
- Admin notes via `verification_notes`
- Tracking of status query attempts

### Client Applications
- Can query `manual_fallback_required` to show alternative payment methods
- Can display countdown/warning based on `created_at` and timeout thresholds
- Can show status query progress to users

## Verification

### Check Column Creation
```sql
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'stokika_kit_payments'
  AND column_name IN (
    'flow_type', 'timeout_detected_at', 'status_query_count',
    'last_status_query_at', 'manual_fallback_required',
    'manual_payment_confirmed_at', 'verification_notes'
  );
```

### Check Index Creation
```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'stokika_kit_payments'
  AND indexname = 'idx_kit_payments_status_created';
```

### Test Function
```sql
-- Create a test payment
INSERT INTO stokika_kit_payments (
  application_code, phone_number, kit_amount, user_type,
  payment_status, checkout_request_id
) VALUES (
  'TEST001', '254712345678', 2500, 'field_agent',
  'pending', 'ws_CO_TEST_001'
);

-- Test incrementing status query count
SELECT increment_status_query_count('ws_CO_TEST_001'); -- Returns 1
SELECT increment_status_query_count('ws_CO_TEST_001'); -- Returns 2
SELECT increment_status_query_count('ws_CO_TEST_001'); -- Returns 3, sets manual_fallback_required

-- Verify
SELECT status_query_count, last_status_query_at, manual_fallback_required
FROM stokika_kit_payments
WHERE checkout_request_id = 'ws_CO_TEST_001';

-- Cleanup
DELETE FROM stokika_kit_payments WHERE checkout_request_id = 'ws_CO_TEST_001';
```

### Test Monitoring View
```sql
-- View all payments with monitoring status
SELECT 
  application_code,
  payment_status,
  monitoring_status,
  seconds_since_created,
  status_query_count,
  manual_fallback_required
FROM v_payment_timeout_monitoring;
```

## Files Modified
- `config/mpesa-schema-update.sql` - Added Task 1.2 implementation

## Next Steps
1. Deploy the schema updates to development database
2. Test the new functions and views
3. Update Edge Functions to use new fields
4. Enhance admin dashboard to display new monitoring data
5. Update client applications to handle manual fallback scenarios

## Notes
- All columns have appropriate defaults to maintain backward compatibility
- The `flow_type` field allows future expansion for different payment types (orders, subscriptions, etc.)
- The status query tracking prevents infinite retry loops
- The manual fallback mechanism ensures no payment is permanently stuck
- The monitoring view provides comprehensive operational visibility

---

**Task Status**: ✅ COMPLETED
**Date**: 2025-06-01
**Spec**: secure-mpesa-integration
**Phase**: Phase 1 - Foundation Setup
