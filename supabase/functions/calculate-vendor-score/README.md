# Calculate Vendor Score Edge Function

## Overview

This Supabase Edge Function calculates vendor creditworthiness scores based on multiple performance metrics and business characteristics. The score is used to determine stock eligibility and influence supplier matching decisions.

## Requirements Implemented

- **10.2**: Calculate vendor scores server-side based on multiple factors
- **16.1**: Score components with weighted algorithm:
  - Business Longevity/Maturity: 10%
  - Verification Status: 15%
  - Activity Level: 20%
  - Order Consistency: 15%
  - Payment Performance: 30%
  - Business Growth: 10%
- **16.2**: Store calculated score in `vendor_scores` table
- **16.3**: Support scheduled recalculation

## Scoring Algorithm

### 1. Business Longevity Score (10% weight)

Measures how long the vendor has been active on the platform.

**Calculation:**
- 0-30 days: 20-40 points (new vendor)
- 31-90 days: 40-60 points (getting established)
- 91-180 days: 60-80 points (established)
- 181+ days: 80-100 points (mature business)

**Data Source:** `vendors.created_at`

### 2. Verification Score (15% weight)

Measures verification status and onboarding completion.

**Calculation:**
- Unverified: 10 points
- Verified but incomplete onboarding: 30 points
- Verified and onboarded: 70 points base + up to 30 bonus points based on verification duration

**Data Sources:** 
- `vendors.is_verified`
- `vendors.verification_date`
- `vendors.onboarding_completed`

### 3. Activity Score (20% weight)

Measures stock request frequency in the last 90 days.

**Calculation:**
- 0 requests: 0 points
- 1-2 requests: 20-40 points
- 3-5 requests: 40-70 points
- 6-10 requests: 70-90 points
- 11+ requests: 90-100 points

**Data Source:** `stock_requests` (last 90 days)

### 4. Consistency Score (15% weight)

Measures order completion rate and ordering pattern consistency.

**Calculation:**
- Completion rate (0-70 points)
- Cancellation penalty (up to -30 points)
- Order frequency consistency bonus (up to 30 points)

**Data Source:** `stock_requests` (all time and last 6 months)

### 5. Payment Score (30% weight - highest)

Measures payment completion, on-time payments, and consistency.

**Calculation:**
- Payment completion rate (0-40 points)
- On-time payment rate (0-40 points)
- Failed payment penalty (up to -20 points)
- Payment amount consistency (0-20 points)
- Recent payment activity bonus (0-20 points)

**Data Source:** `payments`

### 6. Growth Score (10% weight)

Measures business growth trajectory over 6 months.

**Calculation:**
- Declining business: 0-40 points
- No growth: 50 points
- Growth 0-50%: 50-75 points
- Growth 50-100%: 75-90 points
- Growth 100%+: 90-100 points

**Data Source:** `stock_requests` (last 6 months, grouped by month)

## API Usage

### Request

**Method:** POST  
**Endpoint:** `/functions/v1/calculate-vendor-score`  
**Headers:**
- `Authorization: Bearer <JWT_TOKEN>`
- `Content-Type: application/json`

**Body:**
```json
{
  "vendorId": "uuid-of-vendor"
}
```

### Response

**Success (200):**
```json
{
  "success": true,
  "vendorId": "uuid-of-vendor",
  "totalScore": 67.85,
  "componentScores": {
    "businessLongevity": 45.50,
    "verification": 85.00,
    "activity": 60.00,
    "consistency": 72.30,
    "payment": 65.50,
    "growth": 58.20
  }
}
```

**Error (400/401/500):**
```json
{
  "success": false,
  "error": "Error message"
}
```

## Database Tables Used

### Read Tables
- `vendors` - Vendor profile and verification data
- `stock_requests` - Order history and activity data
- `payments` - Payment history and performance data

### Write Tables
- `vendor_scores` - Stores calculated scores with components
- `audit_logs` - Logs score calculation events

## Environment Variables

Required environment variables:
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for database access

## Testing

### Manual Testing

```bash
# Test vendor score calculation
curl -X POST https://your-project.supabase.co/functions/v1/calculate-vendor-score \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"vendorId": "vendor-uuid-here"}'
```

### Test Scenarios

1. **New Vendor**: Recently registered, unverified
   - Expected: Low total score (20-40 range)

2. **Active Verified Vendor**: Established, verified, active orders
   - Expected: High total score (70-90 range)

3. **Inactive Vendor**: Verified but no recent activity
   - Expected: Mid-range score (40-60 range)

4. **Poor Payment History**: Late/failed payments
   - Expected: Lower score due to payment component weight

## Scheduled Execution

This function can be called on a schedule using Supabase Cron:

```sql
-- Example: Run daily at 2 AM UTC
SELECT cron.schedule(
  'daily-vendor-scoring',
  '0 2 * * *',
  $$ SELECT http_post(
    'https://your-project.supabase.co/functions/v1/calculate-vendor-score',
    jsonb_build_object('vendorId', id::text),
    'application/json',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    )
  ) FROM vendors WHERE is_verified = true $$
);
```

## Audit Logging

All score calculations are logged to `audit_logs` with:
- Action: `vendor_score_calculated`
- Resource type: `vendor_score`
- Resource ID: vendor UUID
- Details: Total score and all component scores

## Error Handling

The function implements graceful degradation:
- Database query errors → neutral scores (50) for affected components
- Missing data → neutral or default scores based on context
- Invalid vendor ID → 400 error response
- Missing authentication → 401 error response

## Performance Considerations

- Query optimization: Uses indexed columns for filtering
- Batch processing: Can be called for multiple vendors via scheduled job
- Caching: Scores stored in database for quick retrieval
- Calculation frequency: Recommend daily recalculation for active vendors

## Future Enhancements

1. Machine learning model for score prediction
2. Industry-specific scoring adjustments
3. Seasonal trend analysis
4. Peer comparison scores
5. Real-time score updates on transaction completion
