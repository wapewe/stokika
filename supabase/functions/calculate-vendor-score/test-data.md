# Test Data and Scenarios for Vendor Score Calculation

## Test Scenario 1: New Unverified Vendor

**Vendor Profile:**
- Created: 15 days ago
- Verified: No
- Onboarding Complete: No
- Stock Requests: 0
- Payments: 0

**Expected Component Scores:**
- Business Longevity: ~30 (15 days = mid-range of 0-30 day bracket)
- Verification: 10 (unverified)
- Activity: 0 (no requests)
- Consistency: 50 (neutral - no data)
- Payment: 50 (neutral - no data)
- Growth: 50 (neutral - no data)

**Expected Total Score:**
```
(30 * 0.10) + (10 * 0.15) + (0 * 0.20) + (50 * 0.15) + (50 * 0.30) + (50 * 0.10)
= 3 + 1.5 + 0 + 7.5 + 15 + 5
= 32
```

**Risk Level:** High Risk - Low eligibility

---

## Test Scenario 2: Active Verified Vendor with Good Payment History

**Vendor Profile:**
- Created: 200 days ago
- Verified: Yes (verified 180 days ago)
- Onboarding Complete: Yes
- Stock Requests: 12 in last 90 days, 10 delivered, 2 in transit
- Payments: 10 completed, all on-time, consistent amounts

**Expected Component Scores:**
- Business Longevity: ~85 (200 days = established)
- Verification: ~90 (verified + onboarded + time bonus)
- Activity: ~95 (12 requests = very active)
- Consistency: ~85 (high completion rate, consistent pattern)
- Payment: ~90 (100% completion, 100% on-time)
- Growth: ~65 (steady activity, moderate growth)

**Expected Total Score:**
```
(85 * 0.10) + (90 * 0.15) + (95 * 0.20) + (85 * 0.15) + (90 * 0.30) + (65 * 0.10)
= 8.5 + 13.5 + 19 + 12.75 + 27 + 6.5
= 87.25
```

**Risk Level:** Low Risk - High eligibility

---

## Test Scenario 3: Verified Vendor with Poor Payment History

**Vendor Profile:**
- Created: 120 days ago
- Verified: Yes (verified 100 days ago)
- Onboarding Complete: Yes
- Stock Requests: 8 in last 90 days, 6 delivered, 2 cancelled
- Payments: 6 completed, 2 failed, 4 late payments out of 6

**Expected Component Scores:**
- Business Longevity: ~70 (120 days = mid-established)
- Verification: ~80 (verified + onboarded + some time)
- Activity: ~85 (8 requests = active)
- Consistency: ~60 (some cancellations, decent completion)
- Payment: ~35 (late payments, failures - heavily penalized)
- Growth: ~50 (neutral - inconsistent)

**Expected Total Score:**
```
(70 * 0.10) + (80 * 0.15) + (85 * 0.20) + (60 * 0.15) + (35 * 0.30) + (50 * 0.10)
= 7 + 12 + 17 + 9 + 10.5 + 5
= 60.5
```

**Risk Level:** Medium Risk - Moderate eligibility with payment concerns

---

## Test Scenario 4: High-Growth Vendor

**Vendor Profile:**
- Created: 150 days ago
- Verified: Yes (verified 120 days ago)
- Onboarding Complete: Yes
- Stock Requests: Started with 2/month, now at 8/month (4x growth)
- Payments: All completed on-time, amounts growing proportionally

**Expected Component Scores:**
- Business Longevity: ~75 (150 days)
- Verification: ~85 (verified + onboarded + time)
- Activity: ~90 (high recent activity)
- Consistency: ~75 (increasing frequency - some variance)
- Payment: ~95 (excellent payment record)
- Growth: ~95 (strong growth trajectory)

**Expected Total Score:**
```
(75 * 0.10) + (85 * 0.15) + (90 * 0.20) + (75 * 0.15) + (95 * 0.30) + (95 * 0.10)
= 7.5 + 12.75 + 18 + 11.25 + 28.5 + 9.5
= 87.5
```

**Risk Level:** Low Risk - High eligibility with growth potential

---

## Test Scenario 5: Declining Vendor

**Vendor Profile:**
- Created: 180 days ago
- Verified: Yes
- Onboarding Complete: Yes
- Stock Requests: Started at 5/month, now at 1/month (declining)
- Payments: 8 completed, 2 recent late payments

**Expected Component Scores:**
- Business Longevity: ~80 (180 days)
- Verification: ~88 (fully verified for time)
- Activity: ~30 (low recent activity)
- Consistency: ~45 (declining pattern, recent issues)
- Payment: ~60 (recent payment issues lower score)
- Growth: ~25 (declining trend)

**Expected Total Score:**
```
(80 * 0.10) + (88 * 0.15) + (30 * 0.20) + (45 * 0.15) + (60 * 0.30) + (25 * 0.10)
= 8 + 13.2 + 6 + 6.75 + 18 + 2.5
= 54.45
```

**Risk Level:** Medium-High Risk - Declining business, review required

---

## Test Scenario 6: Inactive Vendor

**Vendor Profile:**
- Created: 90 days ago
- Verified: Yes (60 days ago)
- Onboarding Complete: Yes
- Stock Requests: 3 requests in first month, none in last 60 days
- Payments: 3 completed on-time (from old orders)

**Expected Component Scores:**
- Business Longevity: ~65 (90 days)
- Verification: ~78 (verified with time bonus)
- Activity: 0 (no activity in last 90 days)
- Consistency: ~40 (inactive period, poor consistency)
- Payment: ~65 (good historical payments but no recent activity)
- Growth: ~30 (declining to inactive)

**Expected Total Score:**
```
(65 * 0.10) + (78 * 0.15) + (0 * 0.20) + (40 * 0.15) + (65 * 0.30) + (30 * 0.10)
= 6.5 + 11.7 + 0 + 6 + 19.5 + 3
= 46.7
```

**Risk Level:** High Risk - Inactive, low eligibility

---

## Edge Cases to Test

### Edge Case 1: Brand New Vendor (Same Day)
- Created: Today
- Expected: Very low score (15-25 range)

### Edge Case 2: Perfect Vendor
- All components at 100
- Expected: Total score = 100

### Edge Case 3: Vendor with Only One Order
- Insufficient data for trends
- Expected: Neutral scores for consistency, growth

### Edge Case 4: Database Query Errors
- Simulated database failure
- Expected: Neutral scores (50) for failed components
- Function should not crash

### Edge Case 5: Vendor with No Payments Yet
- Orders delivered but payments not yet processed
- Expected: Neutral payment score (50)
- Should not penalize for pending situation

---

## Manual Testing Commands

### Test New Vendor
```bash
curl -X POST https://your-project.supabase.co/functions/v1/calculate-vendor-score \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"vendorId": "NEW_VENDOR_UUID"}'
```

### Test Active Vendor
```bash
curl -X POST https://your-project.supabase.co/functions/v1/calculate-vendor-score \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"vendorId": "ACTIVE_VENDOR_UUID"}'
```

### Test with Invalid ID
```bash
curl -X POST https://your-project.supabase.co/functions/v1/calculate-vendor-score \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"vendorId": "invalid-uuid"}'
```

### Test without Authentication
```bash
curl -X POST https://your-project.supabase.co/functions/v1/calculate-vendor-score \
  -H "Content-Type: application/json" \
  -d '{"vendorId": "VENDOR_UUID"}'
```

Expected: 401 Unauthorized

---

## Score Interpretation Guide

| Total Score Range | Risk Level | Eligibility | Action |
|------------------|------------|-------------|---------|
| 0-30 | Very High Risk | Very Low | Manual review required |
| 31-50 | High Risk | Low | Start with small amounts |
| 51-65 | Medium Risk | Moderate | Standard eligibility |
| 66-80 | Low Risk | High | Increased limits available |
| 81-100 | Very Low Risk | Very High | Premium tier |

---

## Database Verification Queries

### Check Score Stored Correctly
```sql
SELECT * FROM vendor_scores 
WHERE vendor_id = 'VENDOR_UUID'
ORDER BY score_calculated_at DESC
LIMIT 1;
```

### Verify Audit Log Entry
```sql
SELECT * FROM audit_logs
WHERE action = 'vendor_score_calculated'
  AND resource_id = 'VENDOR_UUID'
ORDER BY created_at DESC
LIMIT 1;
```

### Compare Score History
```sql
SELECT 
  score_calculated_at,
  total_score,
  business_longevity_score,
  sales_consistency_score,
  payment_history_score,
  business_growth_score
FROM vendor_scores
WHERE vendor_id = 'VENDOR_UUID'
ORDER BY score_calculated_at DESC
LIMIT 10;
```
