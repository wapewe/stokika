# STOKIKA PAYMENT SYSTEM - COMPREHENSIVE TESTING GUIDE

## Overview

This guide provides step-by-step testing procedures for the unified C2B + STK Push payment architecture.

**IMPORTANT:** Complete ALL tests in sandbox environment before production deployment.

## Pre-Testing Checklist

- [ ] All Edge Functions deployed
- [ ] Database migration applied
- [ ] Environment secrets configured
- [ ] Safaricom C2B URLs registered (sandbox)
- [ ] Test phone numbers available
- [ ] Test M-Pesa account funded
- [ ] Database access for verification
- [ ] Logs/monitoring configured

## Test Environment Setup

### 1. Sandbox Configuration

```bash
# Verify environment is set to sandbox
MPESA_ENVIRONMENT=sandbox
MPESA_SHORTCODE=<sandbox_shortcode>
MPESA_PAYBILL_NUMBER=<sandbox_paybill>
```

### 2. Test Data Preparation

Create test users:
- **Test Vendor:** vendor-test-001
- **Test Field Agent:** fa-test-001  
- **Test Supervisor:** sup-test-001
- **Test Phone:** 254712345678 (or your sandbox test number)

### 3. Database Query Templates

```sql
-- Check payment intent
SELECT * FROM payment_intents 
WHERE payment_reference = 'YOUR-REFERENCE';

-- Check payment transaction
SELECT * FROM payment_transactions 
WHERE account_reference = 'YOUR-REFERENCE';

-- Check payment events
SELECT * FROM payment_events 
WHERE payment_intent_id = 'YOUR-INTENT-ID'
ORDER BY occurred_at DESC;

-- Check reconciliation
SELECT * FROM payment_reconciliation
WHERE payment_transaction_id = 'YOUR-TRANSACTION-ID';
```

---

## TEST SUITE 1: STK PUSH PAYMENTS

### Test 1.1: Successful STK Push Payment

**Purpose:** Verify complete STK Push flow works end-to-end.

**Steps:**
1. Navigate to kit payment page
2. Enter phone number: `254712345678`
3. Enter amount: `1550` (Field Agent Kit)
4. Click "Pay with M-Pesa"
5. Check phone for STK Push prompt
6. Enter M-Pesa PIN
7. Confirm payment

**Expected Results:**
- ✓ STK Push prompt received on phone
- ✓ Payment confirmation message received
- ✓ Frontend shows "Payment Successful"
- ✓ Database: `payment_intents.status = 'CONFIRMED'`
- ✓ Database: `payment_transactions.status = 'CONFIRMED'`
- ✓ Database: `payment_allocations` record created
- ✓ Database: `field_agents.kit_paid = true`
- ✓ Events: `STK_INITIATED`, `STK_CONFIRMED`, `PAYMENT_ALLOCATED`

**Verification Queries:**
```sql
-- Check intent was confirmed
SELECT status, confirmed_at FROM payment_intents 
WHERE payment_reference = '<generated_reference>';

-- Check transaction
SELECT status, receipt_number, confirmed_at 
FROM payment_transactions 
WHERE payment_intent_id = '<intent_id>';

-- Check allocation
SELECT allocated_amount, status 
FROM payment_allocations 
WHERE payment_intent_id = '<intent_id>';

-- Check kit activation
SELECT kit_paid, kit_payment_date 
FROM field_agents 
WHERE application_code = 'fa-test-001';
```

---

### Test 1.2: STK Push Cancelled by User

**Purpose:** Verify system handles user-cancelled payments correctly.

**Steps:**
1. Initiate STK Push payment
2. When prompt appears on phone, click "Cancel"

**Expected Results:**
- ✓ Callback received with ResultCode = 1032
- ✓ Database: `payment_transactions.status = 'FAILED'`
- ✓ Database: `payment_transactions.failure_reason` contains cancellation message
- ✓ Database: `payment_intents.status = 'FAILED'`
- ✓ Frontend shows user-friendly error: "You cancelled the payment..."
- ✓ User can retry payment with new attempt

**Verification Queries:**
```sql
SELECT status, failure_reason, result_code 
FROM payment_transactions 
WHERE checkout_request_id = '<checkout_request_id>';
```

---

### Test 1.3: STK Push Timeout

**Purpose:** Verify timeout handling when user doesn't respond.

**Steps:**
1. Initiate STK Push payment
2. Do NOT respond to phone prompt
3. Wait for timeout (~30 seconds)

**Expected Results:**
- ✓ Callback received with ResultCode = 1037
- ✓ Database: `payment_transactions.status = 'FAILED'`
- ✓ Database: `failure_reason = 'Payment request timed out'`
- ✓ Frontend shows timeout message
- ✓ User can retry with new attempt

---

### Test 1.4: STK Push Insufficient Balance

**Purpose:** Verify handling of insufficient M-Pesa balance.

**Steps:**
1. Use test phone with insufficient balance
2. Initiate STK Push for amount greater than balance
3. Enter PIN

**Expected Results:**
- ✓ Callback received with ResultCode = 1
- ✓ Database: `status = 'FAILED'`
- ✓ Database: `failure_reason` mentions insufficient balance
- ✓ Frontend shows: "Insufficient balance. Please top up and try again."

---

### Test 1.5: Duplicate STK Callback

**Purpose:** Verify idempotency - duplicate callbacks don't double-credit.

**Steps:**
1. Complete successful STK Push payment
2. Note the `checkout_request_id`
3. Manually send duplicate callback (using API tool or test script)

**Expected Results:**
- ✓ Second callback acknowledged (200 OK)
- ✓ Database: Only ONE `payment_transaction` exists
- ✓ Database: Only ONE `payment_allocation` exists
- ✓ Event logged: `DUPLICATE_DETECTED`
- ✓ Field agent NOT credited twice
- ✓ Logs show "Duplicate callback ignored"

**Critical:** This test ensures financial safety!

---

### Test 1.6: Amount Mismatch in STK Callback

**Purpose:** Verify system detects when received amount differs from expected.

**Setup:** This requires modifying callback data (sandbox only).

**Expected Results:**
- ✓ Database: `payment_transactions.status = 'UNMATCHED'`
- ✓ Database: `payment_reconciliation` record created
- ✓ Database: `issue_type = 'AMOUNT_MISMATCH'`
- ✓ Event logged: `AMOUNT_MISMATCH`
- ✓ Payment NOT automatically allocated
- ✓ Finance dashboard shows reconciliation item

---

## TEST SUITE 2: C2B MANUAL PAYMENTS

### Test 2.1: Successful C2B Payment with Valid Reference

**Purpose:** Verify manual PayBill payment with correct reference.

**Steps:**
1. Create payment obligation (e.g., stock cycle)
2. Note the payment reference (e.g., `STK-SC-8F42K`)
3. Open M-Pesa on phone
4. Select Lipa na M-Pesa → PayBill
5. Business: `1140839` (or sandbox paybill)
6. Account: `STK-SC-8F42K` (the reference)
7. Amount: Enter exact amount
8. Enter PIN and send

**Expected Results:**
- ✓ Validation endpoint called first (check logs)
- ✓ Validation returns: `ResultCode: 0` (Accept)
- ✓ Confirmation endpoint called ~1 second later
- ✓ Database: `payment_transactions` created with `payment_channel = 'C2B'`
- ✓ Database: Payment matched to intent
- ✓ Database: `payment_allocations` created
- ✓ Database: Stock cycle marked as paid
- ✓ Events: `C2B_CONFIRMATION_RECEIVED`, `PAYMENT_MATCHED`, `PAYMENT_ALLOCATED`

**Verification:**
```sql
-- Check transaction was created
SELECT * FROM payment_transactions 
WHERE account_reference = 'STK-SC-8F42K'
AND payment_channel = 'C2B';

-- Check it was matched and allocated
SELECT pt.status, pa.allocated_amount, pi.status as intent_status
FROM payment_transactions pt
JOIN payment_allocations pa ON pt.id = pa.payment_transaction_id
JOIN payment_intents pi ON pa.payment_intent_id = pi.id
WHERE pt.account_reference = 'STK-SC-8F42K';

-- Check stock cycle updated
SELECT payment_status, payment_date, payment_reference
FROM stock_cycles
WHERE id = '<cycle_id>';
```

---

### Test 2.2: C2B Payment with Invalid Reference

**Purpose:** Verify unmatched payments are captured for reconciliation.

**Steps:**
1. Pay via M-Pesa using INCORRECT account reference
2. Use reference: `INVALID-REF-123`
3. Amount: `500`

**Expected Results:**
- ✓ Validation: Accepted (validation doesn't verify reference exists)
- ✓ Confirmation: Processed
- ✓ Database: `payment_transactions.status = 'UNMATCHED'`
- ✓ Database: `payment_reconciliation` record created
- ✓ Database: `issue_type = 'UNMATCHED_REFERENCE'`
- ✓ Event: `PAYMENT_UNMATCHED`
- ✓ Transaction retained (not lost)
- ✓ Finance can manually reconcile

**Critical:** No payment should ever disappear!

---

### Test 2.3: C2B Amount Mismatch

**Purpose:** Verify system detects when C2B amount differs from expected.

**Steps:**
1. Create payment intent expecting KES 550
2. Note payment reference
3. Pay via M-Pesa with WRONG amount: KES 500 (underpayment)

**Expected Results:**
- ✓ Transaction created
- ✓ Reference matched to intent
- ✓ Database: `payment_transactions.status = 'UNMATCHED'`
- ✓ Database: `payment_reconciliation` created
- ✓ Database: `issue_type = 'AMOUNT_MISMATCH'`
- ✓ Database: `expected_amount = 550`, `received_amount = 500`
- ✓ Obligation NOT marked as paid
- ✓ Finance alerted for review

---

### Test 2.4: C2B Overpayment

**Purpose:** Verify overpayment handling.

**Steps:**
1. Create payment intent expecting KES 550
2. Pay via M-Pesa: KES 1000 (overpayment)

**Expected Results:**
- ✓ Transaction created
- ✓ Marked for reconciliation: `AMOUNT_MISMATCH`
- ✓ `difference_amount = 450`
- ✓ Obligation NOT automatically fully paid
- ✓ Finance can allocate correctly or refund excess

---

### Test 2.5: Duplicate C2B Transaction

**Purpose:** Verify C2B idempotency using TransID.

**Setup:** 
1. Complete C2B payment
2. Note the `TransID` from callback
3. Manually send duplicate confirmation with same `TransID`

**Expected Results:**
- ✓ Duplicate detected via `UNIQUE(provider, provider_transaction_id)`
- ✓ Second callback acknowledged
- ✓ Database: Only ONE transaction record
- ✓ Event: `DUPLICATE_DETECTED`
- ✓ No double-crediting

---

### Test 2.6: C2B Validation Rejection

**Purpose:** Verify invalid C2B requests are rejected.

**Test Cases:**
- Invalid business shortcode → Rejected
- Amount = 0 → Rejected  
- Amount > 150,000 → Rejected
- Missing account reference → Rejected
- Invalid phone format → Rejected

**Expected Results:**
- ✓ Validation returns: `ResultCode: 1` (Reject)
- ✓ Confirmation NOT called
- ✓ M-Pesa transaction fails at Safaricom level

---

## TEST SUITE 3: PAYMENT FLOW SCENARIOS

### Test 3.1: STK Push → Timeout → Manual C2B

**Purpose:** Verify STK fallback to manual payment works correctly.

**Steps:**
1. Initiate STK Push for kit payment (KES 1550)
2. Let it timeout (don't respond)
3. Note the payment reference from UI
4. Click "Pay Manually via M-Pesa"
5. Pay via M-Pesa using the SAME reference

**Expected Results:**
- ✓ First transaction: `status = 'FAILED'` (timeout)
- ✓ Payment intent remains `PENDING` (not failed)
- ✓ Second transaction created (C2B)
- ✓ Second transaction: `status = 'CONFIRMED'`
- ✓ SAME payment intent used
- ✓ Allocation created from C2B transaction
- ✓ Kit marked as paid

**Critical:** ONE obligation, TWO transaction attempts (STK failed, C2B succeeded).

---

### Test 3.2: Concurrent STK + C2B Race Condition

**Purpose:** Verify race condition handling when user pays via both methods.

**Setup (Requires Coordination):**
1. Initiate STK Push
2. IMMEDIATELY pay via Manual C2B with same reference
3. Both might succeed nearly simultaneously

**Expected Results:**
- ✓ First confirmed payment allocated
- ✓ Second payment detected as potential duplicate/overpayment
- ✓ Reconciliation record created
- ✓ Obligation NOT double-credited
- ✓ Finance can refund second payment

---

### Test 3.3: Expired Payment Intent

**Purpose:** Verify expired intents are handled correctly.

**Steps:**
1. Create payment intent with short expiry (e.g., 5 minutes)
2. Wait for expiry
3. Try to pay with expired reference

**Expected Results:**
- ✓ Payment transaction created
- ✓ Match attempted to intent
- ✓ Intent expired → reconciliation
- ✓ Finance can manually link or refund

---

## TEST SUITE 4: SECURITY TESTS

### Test 4.1: RLS - User Cannot See Other User's Payments

**Steps:**
1. Login as Vendor A
2. Note Vendor A's payment intent ID
3. Login as Vendor B
4. Try to query Vendor A's payment:
```typescript
const { data } = await supabase
  .from('payment_intents')
  .select('*')
  .eq('id', vendorA_intent_id);
```

**Expected Results:**
- ✓ Query returns empty or throws permission error
- ✓ Vendor B cannot see Vendor A's data

---

### Test 4.2: User Cannot Modify Payment Status

**Steps:**
1. Create payment with status 'PENDING'
2. From browser console, try:
```typescript
await supabase
  .from('payment_transactions')
  .update({ status: 'CONFIRMED' })
  .eq('id', transaction_id);
```

**Expected Results:**
- ✓ Update fails (RLS blocks it)
- ✓ Status remains unchanged
- ✓ Only server-side functions can update

---

### Test 4.3: Frontend Cannot Access Service Role Operations

**Steps:**
1. From browser, try to call:
```typescript
await supabase
  .from('payment_allocations')
  .insert({ ... });
```

**Expected Results:**
- ✓ Insert fails
- ✓ Only Edge Functions with service role can insert

---

### Test 4.4: Secrets Not Exposed

**Steps:**
1. Inspect browser Network tab
2. Check JavaScript source
3. Search for:
   - MPESA_CONSUMER_SECRET
   - MPESA_PASSKEY
   - SUPABASE_SERVICE_ROLE_KEY

**Expected Results:**
- ✓ No secrets visible in browser
- ✓ Only SUPABASE_ANON_KEY visible (which is safe)

---

### Test 4.5: Amount Determined Server-Side

**Steps:**
1. Open browser dev tools
2. Modify STK Push request payload:
```json
{ "amount": 1 }  // Instead of 1550
```
3. Send request

**Expected Results:**
- ✓ Server validates amount against expected
- ✓ Request rejected: "Invalid amount. Field agent kit price is KES 1550"
- ✓ User cannot set arbitrary amounts

---

## TEST SUITE 5: FRONTEND INTEGRATION

### Test 5.1: Payment Status Polling

**Steps:**
1. Initiate manual C2B payment
2. Click "I've Completed Payment"
3. Observe status polling

**Expected Results:**
- ✓ Frontend polls every 5 seconds
- ✓ Shows "Verifying Payment..." spinner
- ✓ After C2B callback, status updates to CONFIRMED
- ✓ Frontend shows success message
- ✓ Dashboard refreshes automatically

---

### Test 5.2: Payment Modal UI

**Test all UI states:**
- [ ] Payment options screen
- [ ] STK Push loading screen
- [ ] STK Push waiting for PIN
- [ ] Manual payment instructions
- [ ] Payment verification (polling)
- [ ] Success screen
- [ ] Error screen
- [ ] Timeout screen

---

## TEST SUITE 6: RECONCILIATION

### Test 6.1: Finance Dashboard - View Unmatched Payments

**Steps:**
1. Create several unmatched payments (wrong references)
2. Login as Finance user
3. Navigate to reconciliation dashboard

**Expected Results:**
- ✓ All unmatched payments visible
- ✓ Can filter by issue type
- ✓ Can search by phone, amount, reference
- ✓ Shows received amount vs expected
- ✓ Priority flagging works

---

### Test 6.2: Manual Payment Allocation

**Steps:**
1. Find unmatched payment in reconciliation
2. Identify correct payment intent manually
3. Allocate payment to intent

**Expected Results:**
- ✓ Allocation created
- ✓ Intent marked as CONFIRMED
- ✓ Obligation updated
- ✓ Reconciliation marked RESOLVED

---

## TEST SUITE 7: EDGE CASES

### Test 7.1: Multiple Outstanding Intents Same User

**Steps:**
1. Create two payment intents for same user
   - Stock cycle: KES 550
   - Registration: KES 1050
2. Pay with one reference

**Expected Results:**
- ✓ Payment matched to correct intent only
- ✓ Other intent remains PENDING
- ✓ No confusion between obligations

---

### Test 7.2: Partial Payment

**Setup:** User tries to pay KES 300 for KES 550 obligation.

**Expected Results:**
- ✓ Transaction created
- ✓ Amount mismatch detected
- ✓ Reconciliation record created
- ✓ Finance can mark as partial payment
- ✓ Remaining KES 250 still owed

---

### Test 7.3: Refund Flow

**Steps:**
1. Complete payment
2. User requests refund
3. Finance processes refund

**Expected Results:**
- ✓ Original transaction remains (immutable)
- ✓ New transaction created with type REFUND
- ✓ Allocation status updated to REVERSED
- ✓ Audit trail complete

---

## MONITORING & LOGGING

### Logs to Check

**STK Push:**
```
[STK Push] Function invoked
[STK Push] Payment intent created: <id>
[STK Push] Successfully initiated payment
[STK Callback] Received: <CheckoutRequestID>
[STK Callback] Payment successfully processed
```

**C2B:**
```
[C2B Validation] Request received: <TransID>
[C2B Validation] Transaction accepted
[C2B Confirmation] Request received: <TransID>
[C2B Confirmation] Transaction created: <id>
[C2B Confirmation] Payment allocated: <id>
```

**Errors to Watch:**
```
Amount mismatch detected
Duplicate transaction detected
Payment flagged for reconciliation
```

---

## POST-TESTING VERIFICATION

### Database Integrity Checks

```sql
-- No orphaned transactions (all have intent or reconciliation)
SELECT COUNT(*) FROM payment_transactions 
WHERE payment_intent_id IS NULL 
AND id NOT IN (SELECT payment_transaction_id FROM payment_reconciliation);
-- Should be 0

-- All confirmed transactions have allocations
SELECT COUNT(*) FROM payment_transactions pt
LEFT JOIN payment_allocations pa ON pt.id = pa.payment_transaction_id
WHERE pt.status = 'CONFIRMED' AND pa.id IS NULL;
-- Should be 0

-- All allocated payments have corresponding obligation updates
-- (Check stock_cycles, field_agents, supervisors, vendors)
```

### Event Log Completeness

```sql
-- Every transaction should have events
SELECT pt.id, COUNT(pe.id) as event_count
FROM payment_transactions pt
LEFT JOIN payment_events pe ON pt.id = pe.payment_transaction_id
GROUP BY pt.id
HAVING COUNT(pe.id) = 0;
-- Should be empty
```

---

## PRODUCTION READINESS CHECKLIST

Only proceed to production when ALL tests pass:

- [ ] All STK Push tests passed
- [ ] All C2B tests passed
- [ ] All payment flow scenarios tested
- [ ] All security tests passed
- [ ] Frontend integration tested
- [ ] Reconciliation tested
- [ ] Edge cases handled
- [ ] Monitoring configured
- [ ] Logs verified
- [ ] Database integrity confirmed
- [ ] RLS policies tested
- [ ] Secrets secured
- [ ] Documentation complete
- [ ] Finance team trained

---

## PRODUCTION DEPLOYMENT

When all tests pass:

1. Switch to production M-Pesa credentials
2. Update Safaricom C2B URLs (production)
3. Deploy Edge Functions to production
4. Monitor closely for first 24 hours
5. Have rollback plan ready

---

**Remember:** Financial systems require extreme care. When in doubt, test again!

**Testing Timeline:** Allow 2-3 days for comprehensive testing.

**Last Updated:** 2026-09-16
