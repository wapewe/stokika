# Calculate Supplier Score Edge Function

## Overview

This Edge Function calculates a comprehensive performance score for suppliers based on five key metrics. The score is stored in the `supplier_scores` table and used for supplier matching and platform analytics.

## Requirements

- **10.3**: Determine supplier scores based on fulfillment, delivery, availability, and quality
- **16.4**: Calculate supplier score with 5 weighted components
- **16.5**: Store calculated score in supplier_scores table
- **16.6**: Recalculate supplier scores daily via scheduled function

## Scoring Components

The supplier score is calculated using five weighted components:

### 1. Order Fulfillment Rate (25%)
- **Metric**: Percentage of orders successfully fulfilled vs cancelled/failed
- **Calculation**: (fulfilled orders / (total orders - cancelled orders)) × 100
- **Score Range**: 0-100
- **Default**: 50 (for suppliers with no orders)

### 2. Delivery Timeliness (25%)
- **Metric**: Percentage of deliveries completed on time or early
- **Calculation**: (on-time deliveries / total deliveries) × 100
- **Score Range**: 0-100
- **Default**: 50 (for suppliers with no deliveries)

### 3. Product Availability (20%)
- **Metric**: Percentage of products in stock vs total products offered
- **Calculation**: (available products / total active products) × 100
- **Score Range**: 0-100
- **Default**: 50 (for suppliers with no products)

### 4. Product Quality (15%)
- **Metric**: Based on order issues, complaints, and feedback
- **Calculation**: 100 - (issue rate × 100)
- **Score Range**: 0-100
- **Default**: 75 (for suppliers with no quality issues)

### 5. Price Competitiveness (15%)
- **Metric**: How supplier's prices compare to market average
- **Calculation**: 
  - 10%+ below market = 100
  - At market = 75
  - 10% above market = 50
  - 20%+ above market = 10
- **Score Range**: 0-100
- **Default**: 50 (neutral)

## Total Score Formula

```
Total Score = 
  (Fulfillment × 0.25) +
  (Delivery × 0.25) +
  (Availability × 0.20) +
  (Quality × 0.15) +
  (Price × 0.15)
```

## API Usage

### Endpoint

```
POST https://[project-ref].supabase.co/functions/v1/calculate-supplier-score
```

### Authentication

Requires either:
- User JWT token (for manual recalculation)
- Service role key (for scheduled runs)

### Request Body

```json
{
  "supplierId": "uuid-of-supplier"
}
```

### Response (Success)

```json
{
  "success": true,
  "supplierId": "uuid-of-supplier",
  "supplierName": "Supplier Business Name",
  "score": 78.50,
  "components": {
    "fulfillment": 85.00,
    "delivery": 90.00,
    "availability": 75.00,
    "quality": 80.00,
    "price": 62.50
  },
  "calculationDate": "2025-01-15T10:30:00Z"
}
```

### Response (Error)

```json
{
  "error": "Error message",
  "details": "Additional error details"
}
```

## Status Codes

- **200**: Score calculated successfully
- **400**: Missing or invalid supplierId
- **404**: Supplier not found
- **405**: Method not allowed (only POST accepted)
- **500**: Internal server error

## Database Tables

### Input Tables
- `suppliers`: Supplier profile information
- `stock_orders`: Order fulfillment data
- `deliveries`: Delivery performance data
- `supplier_products`: Product catalog and pricing

### Output Table
- `supplier_scores`: Stores calculated scores with component breakdown

## Audit Logging

All score calculations are logged to the `audit_logs` table with:
- User ID (or 'system' for scheduled runs)
- Action type: 'supplier_score_calculated'
- Resource type: 'supplier'
- Resource ID: supplier UUID
- Score and components in details field

## Scheduled Execution

This function is designed to be called:
1. **Daily** via cron schedule (scheduled-scoring-update function)
2. **On-demand** when supplier profile or performance changes
3. **Manually** by admin users for testing/verification

## Testing

### Manual Test

```bash
curl -X POST 'https://[project-ref].supabase.co/functions/v1/calculate-supplier-score' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"supplierId": "uuid-of-test-supplier"}'
```

### Expected Behavior

1. Validates supplierId is provided
2. Verifies supplier exists in database
3. Calculates all 5 component scores
4. Computes weighted total score
5. Stores result in supplier_scores table
6. Logs action to audit_logs
7. Returns score breakdown

## Error Handling

- **Missing supplier**: Returns 404 with clear error message
- **Database errors**: Logged and returned as 500 with details
- **Calculation errors**: Caught and logged, defaults used where appropriate
- **Audit log failures**: Logged but don't block score calculation

## Performance Considerations

- Uses indexed queries for efficient data retrieval
- Limits queries to active/relevant records only
- Processes one supplier at a time
- Suitable for scheduled batch processing via scheduled-scoring-update

## Future Enhancements

1. Add vendor ratings/feedback integration for quality score
2. Implement time-weighted calculations (recent performance > old)
3. Add seasonal adjustments for availability scores
4. Support batch scoring for multiple suppliers
5. Add trend analysis (score change over time)
