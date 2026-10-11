# Process Stock Request - Test Examples

## Prerequisites

Before testing, ensure you have:

1. A valid vendor user account with JWT token
2. Products created in the `products` table
3. Supplier with products in `supplier_products` table
4. Vendor eligibility record in `vendor_eligibility` table
5. Sufficient inventory in `inventory` table

## Test Case 1: Successful Stock Request

### Setup

```sql
-- Ensure vendor has eligibility
INSERT INTO vendor_eligibility (vendor_id, is_eligible, eligibility_amount, outstanding_balance, last_calculated_at)
VALUES ('vendor-uuid', true, 100000, 0, NOW());

-- Ensure supplier has products
INSERT INTO supplier_products (supplier_id, product_id, unit_price, minimum_order_quantity, availability_status)
VALUES 
  ('supplier-uuid', 'product-uuid-1', 250.00, 10, 'available'),
  ('supplier-uuid', 'product-uuid-2', 500.00, 5, 'available');

-- Ensure inventory exists
INSERT INTO inventory (supplier_product_id, current_quantity, reserved_quantity)
VALUES 
  ('supplier-product-uuid-1', 1000, 0),
  ('supplier-product-uuid-2', 500, 0);
```

### Request

```bash
curl -X POST https://your-project.supabase.co/functions/v1/process-stock-request \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "productId": "product-uuid-1",
        "quantity": 100,
        "notes": "Urgent - needed for promotion"
      },
      {
        "productId": "product-uuid-2",
        "quantity": 50
      }
    ],
    "requestedDeliveryDate": "2025-02-15",
    "notes": "Deliver to main store location"
  }'
```

### Expected Response

```json
{
  "success": true,
  "stockRequestId": "generated-request-uuid",
  "requestNumber": "SR-20250115-123456",
  "totalAmount": 50000.00,
  "deliveryId": "generated-delivery-uuid"
}
```

### Verification Queries

```sql
-- Check stock request was created
SELECT * FROM stock_requests WHERE request_number = 'SR-20250115-123456';

-- Check stock request items
SELECT * FROM stock_request_items WHERE stock_request_id = 'generated-request-uuid';

-- Check inventory was reserved
SELECT * FROM inventory WHERE supplier_product_id IN ('supplier-product-uuid-1', 'supplier-product-uuid-2');

-- Check delivery record
SELECT * FROM deliveries WHERE stock_request_id = 'generated-request-uuid';

-- Check audit log
SELECT * FROM audit_logs WHERE resource_type = 'stock_request' ORDER BY created_at DESC LIMIT 1;
```

## Test Case 2: Request Exceeds Eligibility

### Setup

```sql
-- Vendor with limited eligibility
UPDATE vendor_eligibility 
SET eligibility_amount = 10000, outstanding_balance = 0
WHERE vendor_id = 'vendor-uuid';
```

### Request

```bash
curl -X POST https://your-project.supabase.co/functions/v1/process-stock-request \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "productId": "product-uuid-1",
        "quantity": 500
      }
    ]
  }'
```

### Expected Response

```json
{
  "success": false,
  "error": "Request value (125000 KES) exceeds your available credit (10000 KES). Eligibility: 10000 KES, Outstanding: 0 KES"
}
```

## Test Case 3: Request with Outstanding Balance

### Setup

```sql
-- Vendor with outstanding balance
UPDATE vendor_eligibility 
SET eligibility_amount = 100000, outstanding_balance = 60000
WHERE vendor_id = 'vendor-uuid';
```

### Request

```bash
curl -X POST https://your-project.supabase.co/functions/v1/process-stock-request \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "productId": "product-uuid-1",
        "quantity": 100
      }
    ]
  }'
```

### Expected Behavior

- Available credit = 100000 - 60000 = 40000 KES
- Request value = 100 * 250 = 25000 KES
- Should succeed because 25000 < 40000

## Test Case 4: Insufficient Inventory

### Setup

```sql
-- Update inventory to low stock
UPDATE inventory 
SET current_quantity = 50, reserved_quantity = 0
WHERE supplier_product_id = 'supplier-product-uuid-1';
```

### Request

```bash
curl -X POST https://your-project.supabase.co/functions/v1/process-stock-request \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "productId": "product-uuid-1",
        "quantity": 100
      }
    ]
  }'
```

### Expected Response

```json
{
  "success": false,
  "error": "Insufficient inventory. Available: 50, Requested: 100"
}
```

## Test Case 5: Below Minimum Order Quantity

### Setup

```sql
-- Ensure minimum order quantity is enforced
UPDATE supplier_products 
SET minimum_order_quantity = 50
WHERE id = 'supplier-product-uuid-1';
```

### Request

```bash
curl -X POST https://your-project.supabase.co/functions/v1/process-stock-request \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "productId": "product-uuid-1",
        "quantity": 25
      }
    ]
  }'
```

### Expected Response

```json
{
  "success": false,
  "error": "Quantity 25 is below minimum order quantity 50 for product product-uuid-1"
}
```

## Test Case 6: No Suitable Supplier

### Setup

```sql
-- Mark all suppliers' products as unavailable
UPDATE supplier_products 
SET availability_status = 'out_of_stock'
WHERE product_id = 'product-uuid-1';
```

### Request

```bash
curl -X POST https://your-project.supabase.co/functions/v1/process-stock-request \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "productId": "product-uuid-1",
        "quantity": 100
      }
    ]
  }'
```

### Expected Response

```json
{
  "success": false,
  "error": "Product product-uuid-1 is not available from any supplier"
}
```

## Test Case 7: Invalid Authentication

### Request (Missing Token)

```bash
curl -X POST https://your-project.supabase.co/functions/v1/process-stock-request \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "productId": "product-uuid-1",
        "quantity": 100
      }
    ]
  }'
```

### Expected Response

```json
{
  "success": false,
  "error": "Missing or invalid Authorization header"
}
```

## Test Case 8: Vendor Not Eligible

### Setup

```sql
-- Mark vendor as not eligible
UPDATE vendor_eligibility 
SET is_eligible = false, ineligibility_reason = 'Payment overdue'
WHERE vendor_id = 'vendor-uuid';
```

### Request

```bash
curl -X POST https://your-project.supabase.co/functions/v1/process-stock-request \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "productId": "product-uuid-1",
        "quantity": 100
      }
    ]
  }'
```

### Expected Response

```json
{
  "success": false,
  "error": "You are currently not eligible for stock requests. Reason: Payment overdue"
}
```

## Test Case 9: Supplier Match Score Based

### Setup

```sql
-- Create supplier matches
INSERT INTO supplier_matches (vendor_id, supplier_id, match_score, product_match_score, availability_score)
VALUES 
  ('vendor-uuid', 'supplier-1-uuid', 85.5, 90.0, 95.0),
  ('vendor-uuid', 'supplier-2-uuid', 75.0, 80.0, 85.0);

-- Ensure both suppliers have the product
INSERT INTO supplier_products (supplier_id, product_id, unit_price, minimum_order_quantity, availability_status)
VALUES 
  ('supplier-1-uuid', 'product-uuid-1', 250.00, 10, 'available'),
  ('supplier-2-uuid', 'product-uuid-1', 240.00, 10, 'available');
```

### Request

```bash
curl -X POST https://your-project.supabase.co/functions/v1/process-stock-request \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "productId": "product-uuid-1",
        "quantity": 100
      }
    ]
  }'
```

### Expected Behavior

- Should select supplier-1-uuid (higher match score of 85.5)
- Should use unit price of 250.00

### Verification

```sql
-- Check which supplier was selected
SELECT supplier_id FROM stock_requests 
WHERE request_number = 'SR-20250115-123456';
```

## Test Case 10: Multiple Items with Mixed Validation

### Request

```bash
curl -X POST https://your-project.supabase.co/functions/v1/process-stock-request \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "productId": "product-uuid-1",
        "quantity": 100,
        "notes": "High priority item"
      },
      {
        "productId": "product-uuid-2",
        "quantity": 50
      },
      {
        "productId": "product-uuid-3",
        "quantity": 200,
        "notes": "Backup inventory"
      }
    ],
    "requestedDeliveryDate": "2025-03-01",
    "notes": "Mixed product order for quarterly stock"
  }'
```

### Expected Behavior

- Should calculate total from all three products
- Should validate all quantities against MOQ/max limits
- Should check inventory for all products
- Should create 3 stock_request_items records

## Automated Test Script (JavaScript)

```javascript
// test-process-stock-request.js
const SUPABASE_URL = 'https://your-project.supabase.co';
const JWT_TOKEN = 'your-jwt-token';

async function testStockRequest(testName, payload, expectSuccess = true) {
  console.log(`\nRunning test: ${testName}`);
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/process-stock-request`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    
    if (expectSuccess && data.success) {
      console.log('✓ Test passed:', testName);
      console.log('  Request Number:', data.requestNumber);
      console.log('  Total Amount:', data.totalAmount);
    } else if (!expectSuccess && !data.success) {
      console.log('✓ Test passed:', testName);
      console.log('  Expected error:', data.error);
    } else {
      console.log('✗ Test failed:', testName);
      console.log('  Response:', data);
    }
  } catch (error) {
    console.log('✗ Test failed with exception:', testName);
    console.error(error);
  }
}

// Run tests
(async () => {
  await testStockRequest('Valid request', {
    items: [
      { productId: 'product-uuid-1', quantity: 100 }
    ]
  }, true);
  
  await testStockRequest('Empty items array', {
    items: []
  }, false);
  
  await testStockRequest('Invalid quantity', {
    items: [
      { productId: 'product-uuid-1', quantity: -10 }
    ]
  }, false);
})();
```

## Performance Testing

### Load Test with Artillery

```yaml
# artillery-test.yml
config:
  target: "https://your-project.supabase.co"
  phases:
    - duration: 60
      arrivalRate: 5
      name: "Warm up"
    - duration: 120
      arrivalRate: 10
      name: "Sustained load"

scenarios:
  - name: "Process stock request"
    flow:
      - post:
          url: "/functions/v1/process-stock-request"
          headers:
            Authorization: "Bearer {{ $env.JWT_TOKEN }}"
            Content-Type: "application/json"
          json:
            items:
              - productId: "{{ $randomString() }}"
                quantity: "{{ $randomNumber(10, 100) }}"
```

Run with:
```bash
JWT_TOKEN=your-token artillery run artillery-test.yml
```
