# Process Stock Request Edge Function

## Overview

This Edge Function processes stock requests from vendors with comprehensive validation, eligibility checking, supplier matching, and inventory reservation.

## Requirements Implemented

- **10.7**: Validate stock request against eligibility before creating order
- **15.2-15.15**: Complete stock request and eligibility workflow
- **Task 17.1**: Full implementation with all specified steps

## Function Flow

1. **Authentication** - Validate JWT and retrieve vendor ID
2. **Eligibility Check** - Retrieve vendor eligibility from database
3. **Supplier Matching** - Find optimal supplier using supplier_matches table
4. **Value Calculation** - Calculate total request value from items
5. **Validation** - Ensure request value doesn't exceed available credit
6. **Inventory Reservation** - Reserve inventory atomically
7. **Record Creation** - Create stock_request, stock_request_items, and delivery records
8. **Audit Logging** - Log all actions to audit_logs

## Request Format

```json
{
  "items": [
    {
      "productId": "uuid-of-product",
      "quantity": 10,
      "notes": "Optional notes for this item"
    }
  ],
  "requestedDeliveryDate": "2025-01-15",
  "notes": "Optional overall request notes"
}
```

## Response Format

### Success Response

```json
{
  "success": true,
  "stockRequestId": "uuid-of-created-request",
  "requestNumber": "SR-20250109-123456",
  "totalAmount": 15000.00,
  "deliveryId": "uuid-of-delivery-record"
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error message explaining what went wrong",
  "details": "Optional stack trace (only in development)"
}
```

## Error Scenarios

- **Missing/Invalid Auth**: Returns 401 with authentication error
- **No Vendor Profile**: Returns 500 with vendor not found error
- **Not Eligible**: Returns 500 with eligibility error
- **Exceeds Credit**: Returns 500 with credit limit exceeded error
- **No Supplier Match**: Returns 500 with no supplier found error
- **Insufficient Inventory**: Returns 500 with inventory shortage error
- **Invalid Items**: Returns 400 with validation error

## Security Features

1. **JWT Authentication** - All requests must include valid Bearer token
2. **Service Role Key** - Uses privileged database access for operations
3. **RLS Policies** - Database enforces row-level security
4. **Input Validation** - All inputs validated before processing
5. **Atomic Operations** - Inventory reservation and record creation are transactional
6. **Audit Logging** - All actions logged for security monitoring

## Testing

Test the function using curl:

```bash
curl -X POST 'https://your-project.supabase.co/functions/v1/process-stock-request' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "items": [
      {
        "productId": "product-uuid",
        "quantity": 5
      }
    ],
    "requestedDeliveryDate": "2025-01-20",
    "notes": "Urgent delivery required"
  }'
```

## Database Schema Dependencies

### Required Tables

- `vendors` - Vendor profiles
- `vendor_eligibility` - Eligibility records with outstanding_balance column
- `supplier_matches` - Pre-calculated supplier match scores
- `supplier_products` - Products offered by suppliers
- `products` - Master product catalog
- `inventory` - Supplier inventory levels
- `inventory_movements` - Inventory transaction log
- `stock_requests` - Stock request headers
- `stock_request_items` - Stock request line items
- `deliveries` - Delivery tracking records
- `audit_logs` - Security audit trail

### Required Functions

- `update_updated_at_column()` - Timestamp trigger function

## Deployment

The function is automatically deployed with Supabase CLI:

```bash
supabase functions deploy process-stock-request
```

## Environment Variables

Required environment variables (set in Supabase Dashboard):

- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for privileged operations

## Related Edge Functions

- `calculate-stock-eligibility` - Calculates vendor eligibility
- `match-supplier` - Pre-calculates supplier matches
- `mpesa-stk-push` - Initiates payment for stock requests

## Monitoring

Monitor function execution in Supabase Dashboard:

1. Navigate to Edge Functions
2. Select `process-stock-request`
3. View logs and metrics

Look for log entries with prefix `[Process Stock Request]` for detailed operation logs.
