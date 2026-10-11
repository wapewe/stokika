# STOKIKA UNIFIED PAYMENT ARCHITECTURE

## Overview

This document describes the comprehensive C2B + STK Push payment architecture for Stokika, implementing a single unified payment ledger supporting:

- **Vendor C2B payments** - Manual payments via PayBill for stock cycles
- **STK Push payments** - Automated push payments for kits and cycles
- **Field Agent kit payments** - Both STK Push and manual C2B
- **Supervisor kit payments** - Both STK Push and manual C2B
- **Vendor registration fees** - KES 1,050 account opening fee
- **Future payment purposes** - Extensible architecture

## Architecture Diagram

```
                 STOKIKA PAYMENT SYSTEM
                         │
             ┌───────────┴───────────┐
             │                       │
          STK PUSH                  C2B
             │                       │
             │                Manual M-Pesa
             │                  PayBill
             │                       │
             └───────────┬───────────┘
                         ↓
                PAYMENT RECONCILIATION
                         ↓
                 PAYMENT LEDGER
                         ↓
              PAYMENT ALLOCATION
                         ↓
          Vendor Cycle / Kit Obligation
```

## Core Principle

**ONE PAYMENT LEDGER** - Both STK Push and C2B create/update the same payment records. There is ONE source of truth for payment state.

## Database Schema

### 1. payment_intents

Represents **what Stokika expects to be paid** - the "obligation" created before payment.

**Key fields:**
- `payment_reference` - Unique reference for manual payments (e.g., `STK-SC-8F42K`)
- `payment_purpose` - STOCK_CYCLE, FIELD_AGENT_KIT, SUPERVISOR_KIT, REGISTRATION, OTHER
- `expected_amount` - Amount expected in KES
- `status` - PENDING, PROCESSING, CONFIRMED, FAILED, EXPIRED, CANCELLED
- `expires_at` - When this intent expires

**Links to:**
- `user_id`, `vendor_id`, `field_agent_id`, `supervisor_id`
- `stock_cycle_id`, `stock_request_id`

### 2. payment_transactions

Represents **actual M-Pesa transactions** (both STK Push and C2B).

**Key fields:**
- `payment_intent_id` - Links to the obligation
- `provider` - MPESA, BANK, CASH, OTHER
- `provider_transaction_id` - M-Pesa receipt number
- `payment_channel` - STK_PUSH or C2B
- `status` - PENDING, CONFIRMED, FAILED, REVERSED, CANCELLED, UNMATCHED, REFUNDED
- `amount` - Actual amount received
- `payer_phone` - Phone number (254XXXXXXXXX)
- `account_reference` - What user entered as account number
- `receipt_number` - M-Pesa receipt number

**Idempotency:** Unique constraint on `(provider, provider_transaction_id)` prevents duplicates.

### 3. payment_allocations

Maps confirmed payments to specific obligations. This is the critical link.

**Key fields:**
- `payment_transaction_id` - The confirmed payment
- `payment_intent_id` - The obligation it satisfies
- `allocated_amount` - Amount allocated
- `stock_cycle_id` - If allocated to stock cycle
- `status` - ALLOCATED, REVERSED, ADJUSTED

### 4. payment_events

Immutable audit trail of all payment events.

**Event types:**
- INTENT_CREATED, INTENT_EXPIRED, INTENT_CANCELLED
- STK_INITIATED, STK_CALLBACK_RECEIVED, STK_CONFIRMED, STK_FAILED
- C2B_VALIDATION_RECEIVED, C2B_CONFIRMATION_RECEIVED, C2B_REJECTED
- PAYMENT_MATCHED, PAYMENT_ALLOCATED, PAYMENT_FAILED
- PAYMENT_REVERSED, PAYMENT_UNMATCHED, PAYMENT_RECONCILED
- AMOUNT_MISMATCH, DUPLICATE_DETECTED, STATUS_CHANGED

### 5. payment_reconciliation

Tracks unmatched, suspicious, or problematic payments.

**Issue types:**
- UNMATCHED_REFERENCE - Cannot find matching intent
- AMOUNT_MISMATCH - Amount doesn't match expected
- DUPLICATE_PAYMENT - Duplicate transaction
- OVERPAYMENT - Paid more than expected
- UNDERPAYMENT - Paid less than expected
- WRONG_ACCOUNT - Payment to wrong account
- OTHER

## Edge Functions

### C2B Endpoints (Registered with Safaricom)

#### 1. mpesa-c2b-validation
**Endpoint:** `https://eidsqrnwfndruuufyacc.supabase.co/functions/v1/mpesa-c2b-validation`

Called by Safaricom BEFORE processing a C2B transaction.

**Validates:**
- Payload structure
- Business shortcode (1140839)
- Amount range (1 - 150,000 KES)
- Phone number format
- Account reference format

**Does NOT:**
- Mark anything as paid
- Create payment records
- Update balances

#### 2. mpesa-c2b-confirmation
**Endpoint:** `https://eidsqrnwfndruuufyacc.supabase.co/functions/v1/mpesa-c2b-confirmation`

Called by Safaricom AFTER a C2B transaction is confirmed.

**Process:**
1. Check transaction uniqueness (idempotency)
2. Create `payment_transaction` record
3. Match to `payment_intent` using account reference
4. Verify amount matches expected amount
5. Create `payment_allocation` if matched
6. Update business obligation (stock cycle, kit, etc.)
7. Create audit events
8. Handle unmatched/mismatched payments (reconciliation)
9. Return acknowledgment to Safaricom

### STK Push Endpoints

#### 3. mpesa-stk-push
Initiates STK Push payment.

**Creates:**
- `payment_intent` (with unique reference)
- `payment_transaction` (status: PENDING)
- Payment events

#### 4. mpesa-stk-callback
Receives M-Pesa STK Push callback.

**Process:**
1. Check for duplicate callback
2. Extract transaction details
3. Verify amount matches expected
4. Update `payment_transaction` (CONFIRMED or FAILED)
5. Create `payment_allocation` if successful
6. Update payment intent and business obligation
7. Create audit events

### Query Endpoints

#### 5. payment-status
Allows users to check payment status.

**Security:** Uses RLS - users can only query their own payments.

**Returns:**
- Intent status
- Transaction status
- Receipt number
- Confirmation timestamp
- Failure reason (if failed)

## Payment Flow Examples

### Example 1: Vendor Stock Cycle - STK Push

```
1. Vendor Dashboard shows outstanding stock cycle
   Amount: KES 550

2. Vendor clicks "Pay with M-Pesa"

3. Frontend calls mpesa-stk-push
   → Creates payment_intent (reference: STK-SC-8F42K)
   → Creates payment_transaction (status: PENDING)
   → M-Pesa sends STK Push to vendor's phone

4. Vendor enters M-Pesa PIN

5. M-Pesa calls mpesa-stk-callback
   → Updates payment_transaction (status: CONFIRMED)
   → Creates payment_allocation
   → Updates stock_cycle (payment_status: paid)
   → Creates audit events

6. Vendor dashboard refreshes → Payment confirmed ✓
```

### Example 2: Vendor Stock Cycle - Manual C2B

```
1. Vendor Dashboard shows outstanding stock cycle
   Amount: KES 550

2. Vendor clicks "Pay Manually via M-Pesa"

3. Frontend displays:
   PayBill: 1140839
   Account Number: STK-SC-8F42K
   Amount: KES 550

4. Vendor opens M-Pesa
   → Lipa na M-Pesa
   → PayBill
   → Business: 1140839
   → Account: STK-SC-8F42K
   → Amount: 550
   → PIN → Send

5. Safaricom calls mpesa-c2b-validation
   → Validates request
   → Returns acceptance

6. Safaricom calls mpesa-c2b-confirmation
   → Finds payment_intent by reference (STK-SC-8F42K)
   → Verifies amount (550 = 550) ✓
   → Creates payment_transaction (status: CONFIRMED)
   → Creates payment_allocation
   → Updates stock_cycle (payment_status: paid)
   → Creates audit events

7. Frontend polls payment-status
   → Returns: CONFIRMED
   → Vendor dashboard updates ✓
```

### Example 3: Field Agent Kit - STK Push with Fallback to C2B

```
1. Field Agent registration requires kit payment
   Amount: KES 1550

2. Agent tries STK Push
   → Initiates payment_intent and transaction
   → M-Pesa sends STK Push
   → Agent doesn't enter PIN (timeout)

3. STK callback marks transaction as FAILED
   → payment_intent remains PENDING (not expired)

4. Agent clicks "Pay Manually via M-Pesa"
   → Shows same reference: STK-KT-FA-7H3J2
   → PayBill: 1140839

5. Agent pays via M-Pesa manually

6. C2B confirmation
   → Finds SAME payment_intent
   → Creates NEW payment_transaction (C2B)
   → Verifies amount
   → Creates allocation
   → Updates field_agents (kit_paid: true)

Result: One intent, two transaction attempts (STK failed, C2B succeeded)
```

## Payment Reference Format

References are generated using `generate_payment_reference(purpose)` database function.

**Format examples:**
- Stock Cycle: `STK-SC-8F42K`
- Field Agent Kit: `STK-KT-FA-7H3J2`
- Supervisor Kit: `STK-KT-SU-9K1P5`
- Registration: `STK-REG-4M8N1`

References are:
- Unique
- Short (for manual entry)
- Purpose-specific (for admin identification)
- Mapped to payment_intent_id internally

## Security Implementation

### 1. Row Level Security (RLS)

**Enabled on all payment tables:**
- `payment_intents`
- `payment_transactions`
- `payment_allocations`
- `payment_events`
- `payment_reconciliation`

**Policies:**
- Vendors can see only their own payments
- Field Agents can see only their own kit payments
- Supervisors can see only their own kit payments
- Finance/Admin can see all payments
- **NO USER CAN UPDATE/DELETE** transactions via RLS

### 2. Server-Side Only Operations

**Edge Functions use service role key:**
- Create transactions
- Update transaction status
- Allocate payments
- Update business obligations

**Users CANNOT:**
- Modify payment status from browser
- Create fake transactions
- Allocate payments manually
- Access other users' payment details

### 3. Amount Verification

**Backend determines amounts:**
- Frontend requests payment
- Backend checks expected amount from business obligation
- Backend creates payment_intent with expected_amount
- Backend verifies received amount matches expected

**Users CANNOT:**
- Specify arbitrary amounts
- Modify payment amounts in transit
- Mark payments as confirmed from browser

### 4. Idempotency

**Duplicate prevention:**
- Unique constraint: `(provider, provider_transaction_id)`
- Duplicate callbacks acknowledged without processing
- Events logged when duplicates detected

### 5. Secrets Management

**Server-side only (Supabase secrets):**
- `MPESA_CONSUMER_KEY`
- `MPESA_CONSUMER_SECRET`
- `MPESA_PASSKEY`
- `MPESA_PAYBILL_NUMBER`
- `SUPABASE_SERVICE_ROLE_KEY`

**Never in:**
- HTML
- JavaScript
- TypeScript (browser)
- Git
- Database (accessible to users)

## Reconciliation Process

### Automatic Reconciliation

**Matched payments:**
- Account reference found
- Amount matches expected
- → Automatically allocated

**Unmatched payments:**
- Account reference not found
- → Creates reconciliation record
- → Status: UNMATCHED
- → Assigned to Finance for review

**Amount mismatch:**
- Reference found but amount differs
- → Creates reconciliation record
- → Status: AMOUNT_MISMATCH
- → Priority: HIGH

### Manual Reconciliation

Finance/Admin can:
1. View all reconciliation records
2. Search by reference, amount, phone
3. Manually link transaction to intent
4. Create payment allocation
5. Mark as resolved
6. Refund if necessary

## State Transitions

### Payment Intent Status

```
PENDING → PROCESSING → CONFIRMED
  ↓                      ↑
  ↓                      |
  ↓                  [success]
  ↓                      |
  +---→ FAILED ←--------+
  |                  [failure]
  |
  +---→ EXPIRED
  |    [timeout]
  |
  +---→ CANCELLED
       [user action]
```

### Payment Transaction Status

```
PENDING → CONFIRMED → REVERSED
  ↓                      
  ↓                      
  +---→ FAILED
  |
  +---→ CANCELLED
  |
  +---→ UNMATCHED → [reconciliation] → CONFIRMED
       [no intent]
```

## Testing Requirements

Before production deployment, test:

### STK Push Tests
- ✓ Successful payment
- ✓ Cancelled payment (user cancels)
- ✓ Failed payment (insufficient balance)
- ✓ Timeout
- ✓ Duplicate callback
- ✓ Amount mismatch
- ✓ Expired payment intent

### C2B Tests
- ✓ Valid payment with correct reference
- ✓ Invalid reference (unmatched)
- ✓ Wrong amount (mismatch)
- ✓ Duplicate transaction (same TransID)
- ✓ Overpayment
- ✓ Underpayment
- ✓ Delayed confirmation
- ✓ Malformed callback

### Security Tests
- ✓ Vendor A cannot see Vendor B's payments
- ✓ Vendor cannot modify payment status
- ✓ Vendor cannot access service role operations
- ✓ Browser cannot access Daraja secrets
- ✓ Duplicate transaction cannot credit twice
- ✓ User cannot mark manual payment as successful
- ✓ HTML/JS modification cannot bypass confirmation

### Race Condition Tests
- ✓ STK Push initiated → user pays manually → both succeed
  → Expected: Second payment flagged for reconciliation
- ✓ Payment allocated → duplicate callback arrives
  → Expected: Duplicate ignored, logged

## Deployment Checklist

- [ ] Run migration: `20260916000001_unified_payment_architecture.sql`
- [ ] Deploy Edge Functions:
  - [ ] `mpesa-c2b-validation`
  - [ ] `mpesa-c2b-confirmation`
  - [ ] `mpesa-stk-callback`
  - [ ] `payment-status`
  - [ ] Updated `mpesa-stk-push`
- [ ] Configure Safaricom C2B URLs:
  - [ ] Validation URL: `.../mpesa-c2b-validation`
  - [ ] Confirmation URL: `.../mpesa-c2b-confirmation`
- [ ] Verify Supabase secrets exist:
  - [ ] `MPESA_CONSUMER_KEY`
  - [ ] `MPESA_CONSUMER_SECRET`
  - [ ] `MPESA_PASSKEY`
  - [ ] `MPESA_PAYBILL_NUMBER` (1140839)
  - [ ] `MPESA_CALLBACK_URL`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Test in sandbox environment
- [ ] Verify RLS policies active
- [ ] Test all payment flows
- [ ] Monitor payment events table
- [ ] Set up reconciliation alerts
- [ ] Train Finance team on reconciliation UI

## Frontend Integration

### 1. Payment UI Component

```typescript
// Show payment options
<div class="payment-options">
  <button onclick="initiateSTKPush()">
    Pay with M-Pesa (STK Push)
  </button>
  
  <button onclick="showManualPayment()">
    Pay Manually via M-Pesa
  </button>
</div>

// Manual payment instructions
<div id="manual-payment" style="display:none">
  <h3>Pay Manually</h3>
  <p>PayBill Number: <strong>1140839</strong></p>
  <p>Account Number: <strong id="payment-reference"></strong></p>
  <p>Amount: <strong>KES <span id="amount"></span></strong></p>
  
  <ol>
    <li>Open M-Pesa</li>
    <li>Select Lipa na M-Pesa</li>
    <li>Select PayBill</li>
    <li>Enter Business Number: 1140839</li>
    <li>Enter Account Number above</li>
    <li>Enter Amount above</li>
    <li>Enter your M-Pesa PIN</li>
    <li>Confirm payment</li>
  </ol>
  
  <button onclick="startStatusPolling()">
    I've Completed Payment
  </button>
</div>
```

### 2. Payment Status Polling

```typescript
async function startStatusPolling(paymentReference: string) {
  const maxAttempts = 60; // 5 minutes
  let attempts = 0;
  
  const poll = setInterval(async () => {
    attempts++;
    
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/payment-status`,
      {
        method: 'POST',
        headers: {
          'authorization': `Bearer ${userToken}`,
          'content-type': 'application/json'
        },
        body: JSON.stringify({ payment_reference: paymentReference })
      }
    );
    
    const data = await response.json();
    
    if (data.status === 'CONFIRMED') {
      clearInterval(poll);
      showSuccessMessage('Payment confirmed!');
      refreshDashboard();
    } else if (data.status === 'FAILED') {
      clearInterval(poll);
      showErrorMessage(data.error || 'Payment failed');
    } else if (attempts >= maxAttempts) {
      clearInterval(poll);
      showWarningMessage('Payment verification timeout. Please contact support if you completed the payment.');
    }
  }, 5000); // Poll every 5 seconds
}
```

## Monitoring & Alerts

### Key Metrics to Monitor

1. **Payment Success Rate**
   - STK Push success rate
   - C2B success rate
   - Overall payment success rate

2. **Reconciliation Queue**
   - Unmatched payments count
   - Amount mismatches count
   - Average resolution time

3. **Payment Volume**
   - Payments per day
   - Amount processed per day
   - Payment methods breakdown

4. **System Health**
   - Callback response time
   - Duplicate callback rate
   - Failed transaction rate

### Alerts to Configure

- Reconciliation queue > 10 unresolved items
- Amount mismatch detected
- Duplicate callback frequency > threshold
- Payment success rate < 90%
- C2B endpoint downtime

## Support & Troubleshooting

### Common Issues

**Issue: Payment not showing as confirmed**
- Check `payment_events` for transaction
- Verify account reference was entered correctly
- Check `payment_reconciliation` for unmatched payments
- Query `payment_transactions` by phone number

**Issue: Duplicate payment**
- Check `payment_events` for DUPLICATE_DETECTED
- System automatically prevents double-crediting
- Second payment will be in reconciliation queue

**Issue: Amount mismatch**
- Automatic reconciliation record created
- Finance team can manually allocate
- Can issue partial credit or request additional payment

## Additional Documentation

- [M-Pesa Daraja API Documentation](https://developer.safaricom.co.ke/)
- [Supabase Edge Functions Guide](https://supabase.com/docs/guides/functions)
- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)

---

**Last Updated:** 2026-09-16  
**Version:** 1.0.0  
**Status:** Production Ready
