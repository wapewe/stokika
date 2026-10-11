# Calculate Stock Eligibility - Test Examples

This document provides test examples for the calculate-stock-eligibility Edge Function.

## Test Case 1: High Score, Medium Business, No Outstanding Balance

**Input:**
```json
{
  "vendor_id": "test-vendor-1"
}
```

**Vendor Data:**
- Total Score: 85
- Payment History Score: 80
- Business Size: Medium
- Business Status: Growing
- Verification: true
- Outstanding Balance: 0

**Expected Output:**
```json
{
  "success": true,
  "eligibility": {
    "vendor_id": "test-vendor-1",
    "is_eligible": true,
    "eligibility_amount": 200000.00,
    "eligibility_tier": "Gold",
    "outstanding_balance": 0,
    "next_review_date": "2026-10-14T19:00:00.000Z"
  }
}
```

**Calculation:**
- Score 85 → Gold tier (base: 200,000 KES)
- Business Size Medium → cap: 500,000 KES (no reduction)
- Outstanding: 0 (no reduction)
- Payment Score 80 ≥ 60 (no penalty)
- Final: 200,000 KES

---

## Test Case 2: Platinum Score Capped by Business Size

**Input:**
```json
{
  "vendor_id": "test-vendor-2"
}
```

**Vendor Data:**
- Total Score: 90
- Payment History Score: 85
- Business Size: Micro
- Business Status: Newly Started
- Verification: true
- Outstanding Balance: 0

**Expected Output:**
```json
{
  "success": true,
  "eligibility": {
    "vendor_id": "test-vendor-2",
    "is_eligible": true,
    "eligibility_amount": 50000.00,
    "eligibility_tier": "Platinum",
    "outstanding_balance": 0,
    "next_review_date": "2026-10-14T19:00:00.000Z"
  }
}
```

**Calculation:**
- Score 90 → Platinum tier (base: 500,000 KES)
- Business Size Micro → cap: 50,000 KES **[APPLIED]**
- Outstanding: 0 (no reduction)
- Payment Score 85 ≥ 60 (no penalty)
- Final: 50,000 KES

---

## Test Case 3: Silver Tier with Outstanding Balance

**Input:**
```json
{
  "vendor_id": "test-vendor-3"
}
```

**Vendor Data:**
- Total Score: 70
- Payment History Score: 65
- Business Size: Small
- Business Status: Operating
- Verification: true
- Outstanding Balance: 40,000

**Expected Output:**
```json
{
  "success": true,
  "eligibility": {
    "vendor_id": "test-vendor-3",
    "is_eligible": true,
    "eligibility_amount": 60000.00,
    "eligibility_tier": "Silver",
    "outstanding_balance": 40000,
    "next_review_date": "2026-10-14T19:00:00.000Z"
  }
}
```

**Calculation:**
- Score 70 → Silver tier (base: 100,000 KES)
- Business Size Small → cap: 100,000 KES (no reduction)
- Outstanding: 40,000 **[SUBTRACTED]**
- Payment Score 65 ≥ 60 (no penalty)
- Final: 100,000 - 40,000 = 60,000 KES

---

## Test Case 4: Low Payment History Penalty

**Input:**
```json
{
  "vendor_id": "test-vendor-4"
}
```

**Vendor Data:**
- Total Score: 65
- Payment History Score: 45
- Business Size: Growing
- Business Status: Growing
- Verification: true
- Outstanding Balance: 0

**Expected Output:**
```json
{
  "success": true,
  "eligibility": {
    "vendor_id": "test-vendor-4",
    "is_eligible": true,
    "eligibility_amount": 85000.00,
    "eligibility_tier": "Silver",
    "outstanding_balance": 0,
    "next_review_date": "2026-10-14T19:00:00.000Z"
  }
}
```

**Calculation:**
- Score 65 → Silver tier (base: 100,000 KES)
- Business Size Growing → cap: 200,000 KES (no reduction)
- Outstanding: 0 (no reduction)
- Payment Score 45 < 60 **[PENALTY APPLIED]**
  - Penalty: (60 - 45) / 100 = 15%
  - Reduction: 100,000 × 0.15 = 15,000 KES
  - After penalty: 100,000 - 15,000 = 85,000 KES
- Final: 85,000 KES

---

## Test Case 5: Outstanding Balance Exceeds Eligibility

**Input:**
```json
{
  "vendor_id": "test-vendor-5"
}
```

**Vendor Data:**
- Total Score: 55
- Payment History Score: 50
- Business Size: Micro
- Business Status: Newly Started
- Verification: true
- Outstanding Balance: 60,000

**Expected Output:**
```json
{
  "success": true,
  "eligibility": {
    "vendor_id": "test-vendor-5",
    "is_eligible": false,
    "eligibility_amount": 0,
    "eligibility_tier": "Bronze",
    "outstanding_balance": 60000,
    "next_review_date": "2026-10-14T19:00:00.000Z",
    "ineligibility_reason": "Outstanding balance exceeds base eligibility amount"
  }
}
```

**Calculation:**
- Score 55 → Bronze tier (base: 50,000 KES)
- Business Size Micro → cap: 50,000 KES (no reduction)
- Payment Score 50 < 60 **[PENALTY APPLIED]**
  - Penalty: (60 - 50) / 100 = 10%
  - Reduction: 50,000 × 0.10 = 5,000 KES
  - After penalty: 50,000 - 5,000 = 45,000 KES
- Outstanding: 60,000 **[SUBTRACTED]**
  - After outstanding: 45,000 - 60,000 = -15,000 KES
- Enforce minimum: max(0, -15,000) = **0 KES**
- Final: 0 KES (ineligible due to high outstanding balance)

---

## Test Case 6: Score Too Low (Ineligible)

**Input:**
```json
{
  "vendor_id": "test-vendor-6"
}
```

**Vendor Data:**
- Total Score: 35
- Payment History Score: 30
- Business Size: Micro
- Business Status: Planning
- Verification: true
- Outstanding Balance: 0

**Expected Output:**
```json
{
  "success": true,
  "eligibility": {
    "vendor_id": "test-vendor-6",
    "is_eligible": false,
    "eligibility_amount": 0,
    "eligibility_tier": "None",
    "outstanding_balance": 0,
    "next_review_date": "2026-10-14T19:00:00.000Z",
    "ineligibility_reason": "Vendor score too low: 35/100. Minimum required: 41/100"
  }
}
```

**Calculation:**
- Score 35 < 41 → **Not eligible**
- Final: 0 KES

---

## Test Case 7: Not Verified (Ineligible)

**Input:**
```json
{
  "vendor_id": "test-vendor-7"
}
```

**Vendor Data:**
- Total Score: 75
- Payment History Score: 70
- Business Size: Small
- Business Status: Operating
- Verification: **false**
- Outstanding Balance: 0

**Expected Output:**
```json
{
  "success": true,
  "eligibility": {
    "vendor_id": "test-vendor-7",
    "is_eligible": false,
    "eligibility_amount": 0,
    "eligibility_tier": "None",
    "outstanding_balance": 0,
    "next_review_date": "2026-10-14T19:00:00.000Z",
    "ineligibility_reason": "Vendor must be verified by field agent"
  }
}
```

**Calculation:**
- Verification: false → **Not eligible**
- Final: 0 KES

---

## Test Case 8: No Score Available (Ineligible)

**Input:**
```json
{
  "vendor_id": "test-vendor-8"
}
```

**Vendor Data:**
- Total Score: **null**
- Payment History Score: null
- Business Size: Micro
- Business Status: Planning
- Verification: true
- Outstanding Balance: 0

**Expected Output:**
```json
{
  "success": true,
  "eligibility": {
    "vendor_id": "test-vendor-8",
    "is_eligible": false,
    "eligibility_amount": 0,
    "eligibility_tier": "None",
    "outstanding_balance": 0,
    "next_review_date": "2026-10-14T19:00:00.000Z",
    "ineligibility_reason": "No vendor score available. Score calculation required."
  }
}
```

**Calculation:**
- Score: null → **Not eligible**
- Final: 0 KES

---

## Test Case 9: Bronze Tier, Pre-Launch Business

**Input:**
```json
{
  "vendor_id": "test-vendor-9"
}
```

**Vendor Data:**
- Total Score: 50
- Payment History Score: 55
- Business Size: Pre-Launch
- Business Status: Planning
- Verification: true
- Outstanding Balance: 0

**Expected Output:**
```json
{
  "success": true,
  "eligibility": {
    "vendor_id": "test-vendor-9",
    "is_eligible": true,
    "eligibility_amount": 30000.00,
    "eligibility_tier": "Bronze",
    "outstanding_balance": 0,
    "next_review_date": "2026-10-14T19:00:00.000Z"
  }
}
```

**Calculation:**
- Score 50 → Bronze tier (base: 50,000 KES)
- Business Size Pre-Launch → cap: 30,000 KES **[APPLIED]**
- Outstanding: 0 (no reduction)
- Payment Score 55 < 60 **[PENALTY APPLIED]**
  - Penalty: (60 - 55) / 100 = 5%
  - Reduction: 30,000 × 0.05 = 1,500 KES
  - After penalty: 30,000 - 1,500 = 28,500 KES
- Final: 28,500 KES

---

## Test Case 10: Edge Case - Score Exactly 60 (Bronze/Silver Boundary)

**Input:**
```json
{
  "vendor_id": "test-vendor-10"
}
```

**Vendor Data:**
- Total Score: 60
- Payment History Score: 60
- Business Size: Small
- Business Status: Operating
- Verification: true
- Outstanding Balance: 0

**Expected Output:**
```json
{
  "success": true,
  "eligibility": {
    "vendor_id": "test-vendor-10",
    "is_eligible": true,
    "eligibility_amount": 50000.00,
    "eligibility_tier": "Bronze",
    "outstanding_balance": 0,
    "next_review_date": "2026-10-14T19:00:00.000Z"
  }
}
```

**Calculation:**
- Score 60 → Bronze tier (41-60 range, base: 50,000 KES)
- Business Size Small → cap: 100,000 KES (no reduction)
- Outstanding: 0 (no reduction)
- Payment Score 60 ≥ 60 (no penalty)
- Final: 50,000 KES

---

## Error Test Cases

### E1: Missing vendor_id
```json
{
  "success": false,
  "error": "vendor_id is required"
}
```

### E2: Vendor Not Found
```json
{
  "success": false,
  "error": "Vendor not found"
}
```

### E3: Missing Authorization Header
```json
{
  "success": false,
  "error": "Missing authorization header"
}
```

### E4: Invalid JSON
```json
{
  "success": false,
  "error": "Invalid JSON in request body"
}
```

---

## Summary of Eligibility Tiers

| Tier     | Score Range | Base Amount | Eligible? |
|----------|-------------|-------------|-----------|
| None     | 0-40        | 0 KES       | ❌ No      |
| Bronze   | 41-60       | 50,000 KES  | ✅ Yes     |
| Silver   | 61-75       | 100,000 KES | ✅ Yes     |
| Gold     | 76-85       | 200,000 KES | ✅ Yes     |
| Platinum | 86-100      | 500,000 KES | ✅ Yes     |

## Summary of Business Size Caps

| Business Size | Maximum Cap   |
|---------------|---------------|
| Pre-Launch    | 30,000 KES    |
| Micro         | 50,000 KES    |
| Small         | 100,000 KES   |
| Growing       | 200,000 KES   |
| Medium        | 500,000 KES   |
| Large         | 1,000,000 KES |

## Payment History Penalty Formula

```
IF payment_history_score < 60:
  penalty_percentage = (60 - payment_history_score) / 100
  reduction_amount = eligibility_amount × penalty_percentage
  eligibility_amount = eligibility_amount - reduction_amount
```

**Examples:**
- Score 40: 20% penalty
- Score 45: 15% penalty
- Score 50: 10% penalty
- Score 55: 5% penalty
- Score 60+: No penalty
