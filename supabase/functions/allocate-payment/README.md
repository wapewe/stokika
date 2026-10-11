# Allocate Payment Edge Function

## Overview

This Supabase Edge Function allocates a completed payment to a specific stock cycle. It handles row-level locking, calculates the allocation amount, creates the allocation record, and updates the cycle's paid amount. The cycle is automatically marked as completed when the balance reaches zero.

## Requirements

Implements Task 18.3 requirements:
- Lock stock_cycle row during allocation
- Calculate allocation amount (up to balance)
- Create payment_allocation record
- Update stock_cycle paid_amount
- Check if cycle should be marked completed (via database trigger)

## Workflow

1. **Authenticate User**: Validates JWT token
2. **Get Payment**: Retrieves payment and validates it's completed
3. **Lock Stock Cycle**: Locks the cycle row to prevent concurrent modifications
4. **Calculate Amount**: Determines allocation amount (up to cycle balance or payment amount)
5. **Create Allocation**: Inserts record into payment_allocations table
6. **Update Cycle**: Updates paid_amount in stock_cycles (triggers auto-completion check)
7. **Update Eligibility**: Reduces vendor's outstanding_balance
8. **Audit Log**: Records the allocation event

## Request Format

### Endpoint

```
POST /functions/v1/allocate-payment
```

### Headers

```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

### Body

```json
{
  "paymentId": "uuid-of-completed-payment",
  "stockCycleId": "uuid-of-stock-cycle",
  "amount": 50000.00,
  "notes": "Partial payment for cycle 1"
}
```

### Fields

- `paymentId` (required): UUID of the completed payment to allocate
- `stockCycleId` (required): UUID of the stock cycle to allocate to
- `amount` (optional): Specific amount to allocate. If omitted, allocates the smaller of:
  - Payment amount
  - Cycle remaining balance
- `notes` (optional): Additional notes about this allocation

## Response Format

### Success Response (200)

```json
{
  "success": true,
  "allocationId": "uuid-of-allocation-record",
  "allocatedAmount": 50000.00,
  "cycleStatus": "completed",
  "cycleBalance": 0.00
}
```

### Error Response (4xx/5xx)

```json
{
  "success": false,
  "error": "Human-readable error message",
  "details": "Optional technical details"
}
```

## Error Handling

### Common Error Messages

- `"Missing or invalid Authorization header"` - No JWT token
- `"Payment not found"` - Invalid payment ID
- `"Payment must be in 'completed' status"` - Payment not yet completed
- `"Stock cycle not found"` - Invalid cycle ID
- `"Stock cycle is already completed"` - Cycle fully paid
- `"Stock cycle has been cancelled"` - Cannot allocate to cancelled cycle
- `"Payment and stock cycle do not belong to the same stock request"` - Mismatch
- `"Allocation amount exceeds payment amount"` - Invalid amount specified
- `"Allocation amount exceeds cycle balance"` - Amount too large for remaining balance

## Database Tables

### Read Operations

- `payments`: Get payment details and validate status
- `stock_cycles`: Get cycle balance and status with lock
- `vendor_eligibility`: Get current outstanding balance

### Write Operations

- `payment_allocations`: Create new allocation record
- `stock_cycles`: Update paid_amount (triggers auto-completion)
- `vendor_eligibility`: Reduce outstanding_balance
- `audit_logs`: Log the allocation event

## Auto-Completion Trigger

When the stock cycle's `paid_amount` is updated, a database trigger automatically:
1. Checks if `paid_amount >= cycle_amount`
2. If true, sets `cycle_status = 'completed'`
3. Sets `completed_at = now()`

This ensures cycles are immediately marked complete when fully paid.

## Security

- Requires valid JWT token
- Uses Row Level Security (RLS) on all tables
- Service role key for privileged operations
- All actions logged to audit trail
- Input validation on all fields
- Row-level locking prevents concurrent allocation conflicts

## Environment Variables

Required:
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key

## Testing

### Test Scenario 1: Full Allocation

```bash
curl -X POST https://your-project.supabase.co/functions/v1/allocate-payment \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentId": "payment-uuid",
    "stockCycleId": "cycle-uuid"
  }'
```

### Test Scenario 2: Partial Allocation

```bash
curl -X POST https://your-project.supabase.co/functions/v1/allocate-payment \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentId": "payment-uuid",
    "stockCycleId": "cycle-uuid",
    "amount": 25000.00,
    "notes": "First installment"
  }'
```

### Test Scenario 3: Complete Cycle

Allocate enough to complete a cycle:
```bash
# If cycle balance is 10,000 and payment is 15,000
curl -X POST https://your-project.supabase.co/functions/v1/allocate-payment \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type": application/json" \
  -d '{
    "paymentId": "payment-uuid",
    "stockCycleId": "cycle-uuid"
  }'
# Result: allocates 10,000, cycle status = "completed"
```

## Row Locking

The function attempts to use a database function `lock_and_get_stock_cycle` for row-level locking. If not available, it falls back to a regular SELECT.

### Create Lock Function (Optional but Recommended)

```sql
CREATE OR REPLACE FUNCTION lock_and_get_stock_cycle(cycle_id UUID)
RETURNS TABLE (
  id UUID,
  stock_request_id UUID,
  vendor_id UUID,
  cycle_number INTEGER,
  cycle_amount DECIMAL(10,2),
  paid_amount DECIMAL(10,2),
  balance DECIMAL(10,2),
  cycle_status TEXT,
  due_date DATE,
  start_date DATE,
  end_date DATE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sc.id,
    sc.stock_request_id,
    sc.vendor_id,
    sc.cycle_number,
    sc.cycle_amount,
    sc.paid_amount,
    sc.cycle_amount - sc.paid_amount AS balance,
    sc.cycle_status,
    sc.due_date,
    sc.start_date,
    sc.end_date
  FROM stock_cycles sc
  WHERE sc.id = cycle_id
  FOR UPDATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Deployment

```bash
supabase functions deploy allocate-payment
```

## Related Functions

- `mpesa-callback`: Creates completed payments that can be allocated
- `process-stock-request`: Creates stock cycles that receive allocations
- `calculate-stock-eligibility`: Calculates eligibility considering outstanding_balance

## Future Enhancements

- Support allocating to multiple cycles in one request
- Automatic allocation to oldest unpaid cycle
- Overpayment handling (apply excess to next cycle)
- Notification webhooks on cycle completion
- Scheduled allocation reminders
