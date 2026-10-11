# Calculate Stock Eligibility Edge Function

## Overview

This Supabase Edge Function calculates vendor stock eligibility based on vendor score, business profile, and outstanding balance. The eligibility amount determines how much stock value a vendor can request through the platform.

## Requirements

Implements the following requirements from the Stokika TypeScript Rebuild specification:

- **10.1**: Calculate stock eligibility amount server-side based on vendor score, payment history, and business profile
- **17.1**: Determine initial eligibility for new vendors based on business size and status
- **17.2**: Adjust eligibility based on vendor score (higher scores = higher eligibility)
- **17.3**: Reduce eligibility when vendor has outstanding unpaid balances
- **17.4**: Reduce eligibility for vendors with late payment history
- **17.6**: Store eligibility amount and effective date in database
- **17.8**: Prevent negative eligibility amounts (minimum: 0)
- **17.9**: Cap maximum eligibility based on business size category
- **17.12**: Log eligibility changes to audit log with reason

## Eligibility Tiers

The function uses score-based tiers to determine base eligibility:

| Tier     | Score Range | Max Amount |
|----------|-------------|------------|
| Bronze   | 41-60       | 50,000 KES |
| Silver   | 61-75       | 100,000 KES |
| Gold     | 76-85       | 200,000 KES |
| Platinum | 86-100      | 500,000 KES |

**Note**: Scores below 41 result in ineligibility.

## Business Size Caps

Regardless of score tier, eligibility is capped by business size:

| Business Size | Maximum Eligibility |
|---------------|---------------------|
| Pre-Launch    | 30,000 KES          |
| Micro         | 50,000 KES          |
| Small         | 100,000 KES         |
| Growing       | 200,000 KES         |
| Medium        | 500,000 KES         |
| Large         | 1,000,000 KES       |

## Calculation Logic

1. **Fetch Vendor Data**:
   - Latest vendor score from `vendor_scores` table
   - Vendor profile (business size, status, verification) from `vendors` table
   - Current outstanding balance from `vendor_eligibility` table

2. **Verification Check**:
   - Vendor must have `verification_status = 'verified'`
   - Unverified vendors are ineligible

3. **Score Check**:
   - Vendor must have a calculated score
   - Score must be ≥ 41 for eligibility

4. **Determine Base Amount**:
   - Map score to eligibility tier
   - Get base amount from tier

5. **Apply Business Size Cap**:
   - Cap amount at business size maximum
   - Use lower of tier amount and size cap

6. **Apply Payment History Penalty**:
   - If payment history score < 60, reduce eligibility
   - Reduction percentage = (60 - payment_history_score) / 100
   - Example: Score 40 → 20% reduction

7. **Subtract Outstanding Balance**:
   - Reduce eligibility by current outstanding balance
   - Ensures vendor doesn't over-extend credit

8. **Enforce Minimum**:
   - Final amount cannot be negative
   - Minimum eligibility = 0

9. **Store and Log**:
   - Insert new record in `vendor_eligibility` table
   - Create audit log entry with calculation details

## Request Format

### Endpoint
```
POST https://<project>.supabase.co/functions/v1/calculate-stock-eligibility
```

### Headers
```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

### Body
```json
{
  "vendor_id": "uuid-of-vendor"
}
```

## Response Format

### Success Response (Eligible)
```json
{
  "success": true,
  "eligibility": {
    "vendor_id": "uuid-of-vendor",
    "is_eligible": true,
    "eligibility_amount": 75000.00,
    "eligibility_tier": "Silver",
    "outstanding_balance": 25000.00,
    "next_review_date": "2026-10-14T19:00:00.000Z"
  }
}
```

### Success Response (Ineligible)
```json
{
  "success": true,
  "eligibility": {
    "vendor_id": "uuid-of-vendor",
    "is_eligible": false,
    "eligibility_amount": 0,
    "eligibility_tier": "None",
    "outstanding_balance": 0,
    "next_review_date": "2026-10-14T19:00:00.000Z",
    "ineligibility_reason": "Vendor score too low: 35/100. Minimum required: 41/100"
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": "Vendor not found"
}
```

## Database Schema

### Input Tables

#### `vendor_scores`
```sql
- vendor_id (UUID, FK to vendors)
- total_score (DECIMAL 0-100)
- payment_history_score (DECIMAL 0-100)
- business_longevity_score (DECIMAL 0-100)
- sales_consistency_score (DECIMAL 0-100)
- business_growth_score (DECIMAL 0-100)
- score_calculated_at (TIMESTAMPTZ)
```

#### `vendors`
```sql
- id (UUID, PK)
- verification_status (TEXT: pending, verified, rejected)
- business_size_id (UUID, FK to business_sizes)
- business_status_id (UUID, FK to business_statuses)
- business_model_id (UUID, FK to business_models)
```

### Output Table

#### `vendor_eligibility`
```sql
- id (UUID, PK)
- vendor_id (UUID, FK to vendors)
- is_eligible (BOOLEAN)
- eligibility_amount (DECIMAL)
- eligibility_tier (TEXT: Bronze, Silver, Gold, Platinum)
- outstanding_balance (DECIMAL)
- last_calculated_at (TIMESTAMPTZ)
- next_review_date (TIMESTAMPTZ)
- ineligibility_reason (TEXT, nullable)
```

#### `audit_logs`
```sql
- id (UUID, PK)
- user_id (UUID)
- action_type (TEXT: 'eligibility_calculated')
- resource_type (TEXT: 'vendor_eligibility')
- resource_id (UUID)
- details (JSONB)
- created_at (TIMESTAMPTZ)
```

## Error Handling

### 400 Bad Request
- Missing `vendor_id` in request
- Invalid JSON body

### 401 Unauthorized
- Missing or invalid JWT token

### 404 Not Found
- Vendor with given ID doesn't exist

### 405 Method Not Allowed
- Non-POST request methods

### 500 Internal Server Error
- Database query failures
- Unexpected runtime errors

## Environment Variables

Required environment variables (set in Supabase dashboard):

- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for database access

## Testing

### Test Cases

1. **Eligible Vendor (High Score)**:
   - Score: 85
   - Business Size: Medium
   - Outstanding: 0
   - Expected: Gold tier, 200,000 KES

2. **Eligible Vendor (Capped by Size)**:
   - Score: 90 (Platinum)
   - Business Size: Micro
   - Outstanding: 0
   - Expected: Platinum tier, but capped at 50,000 KES

3. **Eligible Vendor (Reduced by Outstanding)**:
   - Score: 70
   - Business Size: Small
   - Outstanding: 40,000
   - Expected: Silver tier, 60,000 KES (100k - 40k)

4. **Ineligible Vendor (Low Score)**:
   - Score: 35
   - Expected: Ineligible, 0 KES

5. **Ineligible Vendor (Not Verified)**:
   - Verification: pending
   - Expected: Ineligible, reason: not verified

6. **Ineligible Vendor (No Score)**:
   - Score: null
   - Expected: Ineligible, reason: no score

7. **Eligible Vendor (Payment Penalty)**:
   - Score: 70
   - Payment History Score: 45
   - Outstanding: 0
   - Expected: Reduced by 15% penalty

### Manual Testing

```bash
# Test with curl
curl -X POST \
  https://<project>.supabase.co/functions/v1/calculate-stock-eligibility \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "vendor_id": "your-vendor-uuid"
  }'
```

## Deployment

Deploy using Supabase CLI:

```bash
supabase functions deploy calculate-stock-eligibility
```

## Integration

### From TypeScript Service Layer

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function calculateEligibility(vendorId: string) {
  const { data, error } = await supabase.functions.invoke(
    'calculate-stock-eligibility',
    {
      body: { vendor_id: vendorId }
    }
  );
  
  if (error) {
    console.error('Failed to calculate eligibility:', error);
    return null;
  }
  
  return data.eligibility;
}
```

## Audit Trail

Every eligibility calculation creates an audit log entry with:

- **Action Type**: `eligibility_calculated`
- **Resource Type**: `vendor_eligibility`
- **Details**: Includes score, tier, amounts, and calculation reason

Example audit log:
```json
{
  "eligibility_amount": 75000,
  "eligibility_tier": "Silver",
  "reason": "Calculated: score=70, tier=Silver, base=100000, outstanding=25000, final=75000"
}
```

## Security

- **Authentication**: Requires valid JWT token in Authorization header
- **Authorization**: Uses service role key to bypass RLS for calculation
- **Server-Side Only**: Browser cannot manipulate eligibility calculation
- **Audit Logging**: All calculations are logged for compliance and debugging

## Performance Considerations

- Function executes 3 parallel database queries initially
- Average execution time: 200-500ms
- No external API calls (all data from Supabase)
- Indexes recommended on:
  - `vendor_scores.vendor_id`
  - `vendor_scores.score_calculated_at`
  - `vendor_eligibility.vendor_id`
  - `vendor_eligibility.last_calculated_at`

## Maintenance

### Review Cycle

Eligibility is set to be reviewed every 30 days (stored in `next_review_date`). Consider implementing:

- Scheduled Edge Function to recalculate eligibility for all vendors monthly
- Trigger recalculation after:
  - Payment cycle completion
  - Vendor score update
  - Outstanding balance changes

### Monitoring

Monitor these metrics:
- Calculation success rate
- Average eligibility amounts by tier
- Percentage of eligible vs ineligible vendors
- Common ineligibility reasons

## Changelog

### Version 1.0.0 (2026-09-14)
- Initial implementation
- Implements requirements 10.1, 17.1-17.12
- Score-based tiering (Bronze, Silver, Gold, Platinum)
- Business size caps
- Outstanding balance deduction
- Payment history penalties
- Audit logging
