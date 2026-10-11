# VENDOR REGISTRATION PAYMENT IMPLEMENTATION - STATUS REPORT

## ✅ COMPLETED

### Edge Functions Created (3/3)

1. **validate-vendor-registration** (`supabase/functions/validate-vendor-registration/index.ts`)
   - ✅ Field validation (name, email, phone, required fields)
   - ✅ Duplicate checking (business name, phone, email)
   - ✅ Rate limiting (5 requests/15 minutes per IP)
   - ✅ JWT validation token generation (5 min expiration)
   - ✅ Returns `{valid: true, token: "..."}` or `{valid: false, errors: [...]}`

2. **create-vendor-registration-payment** (`supabase/functions/create-vendor-registration-payment/index.ts`)
   - ✅ Verifies validation token
   - ✅ Calls `get_registration_fee()` for authoritative amount (KES 1,050)
   - ✅ Creates payment_intent with metadata
   - ✅ Generates payment reference (STK-REG-XXXXX)
   - ✅ Calls mpesa-stk-push Edge Function
   - ✅ Rate limiting (3 requests/hour per user)
   - ✅ Returns `{success: true, paymentIntentId, checkoutRequestId, paymentReference}`

3. **create-vendor-from-payment** (`supabase/functions/create-vendor-from-payment/index.ts`)
   - ✅ Verifies payment intent is CONFIRMED
   - ✅ Creates auth.users (email_confirm=true, phone_confirm=true)
   - ✅ Creates profiles record (role='vendor')
   - ✅ Creates vendors record (approval_status='pending_approval')
   - ✅ Sets registration_paid=TRUE
   - ✅ Links to payment_intent via registration_payment_id
   - ✅ Idempotency check (won't create duplicate vendors)
   - ✅ Error logging to payment_reconciliation
   - ✅ Audit logging

### Client-Side Classes Created (1/3)

1. **vendor-registration-validation.js** (`js/vendor-registration-validation.js`)
   - ✅ InputSanitizer class (XSS prevention)
   - ✅ RegistrationValidator class
   - ✅ Field-level validation (name, email, phone, required fields)
   - ✅ Inline error display
   - ✅ Error clearing on fix

## ⚠️ REMAINING WORK

### Client-Side JavaScript (2 more files needed)

2. **Payment Service** (`js/vendor-registration-payment.js`)
   - Create RegistrationPaymentService class
   - Implement initiatePayment() method
   - Call validate-vendor-registration Edge Function
   - Call create-vendor-registration-payment Edge Function
   - Handle errors and rate limiting
   - Integration with PaymentStatusPoller

3. **Payment Status Poller** (`js/vendor-payment-status-poller.js`)
   - Create PaymentStatusPoller class
   - Poll payment-status every 5 seconds
   - 2-minute timeout
   - Stop on terminal status (CONFIRMED/FAILED/EXPIRED)
   - Callback on status updates

### Form Integration (vendor-modal-fix.js updates)

Need to update `js/vendor-modal-fix.js` to:
1. Load validation, payment, and poller classes
2. Instantiate validator and sanitizer
3. Add Step 5 (Payment) UI to modal HTML
4. Update form submission to:
   - Validate all fields
   - Sanitize inputs
   - Call validation API
   - Show payment step
   - Collect M-Pesa phone number
   - Call payment API
   - Poll payment status
   - Handle success → redirect to signin.html
   - Handle failure → show retry button

### M-Pesa Callback Update

Update `supabase/functions/mpesa-stk-callback/index.ts`:
- When payment_purpose === 'REGISTRATION' and status === 'CONFIRMED'
- Call create-vendor-from-payment Edge Function
- Pass paymentIntentId
- Don't fail if vendor already exists (idempotency)

### HTML Updates (dalana.html)

Add to `<head>`:
```html
<script src="js/vendor-registration-validation.js"></script>
<script src="js/vendor-registration-payment.js"></script>
<script src="js/vendor-payment-status-poller.js"></script>
```

Add Step 5 HTML inside vendor registration modal (after Step 4):
```html
<div class="form-step" data-step="5">
    <h3>Payment - Registration Fee</h3>
    <p class="step-description">Complete payment to activate your vendor account</p>
    
    <div class="fee-display">
        <h4>Registration Fee</h4>
        <div class="fee-amount">KES 1,050.00</div>
        <p class="fee-note">One-time payment • Secure M-Pesa payment</p>
    </div>
    
    <div class="form-group">
        <label for="mpesaPhone">M-Pesa Phone Number *</label>
        <input type="tel" 
               id="mpesaPhone" 
               name="mpesaPhone" 
               placeholder="254712345678 or 0712345678" 
               required>
        <small>Enter the phone number to receive M-Pesa payment prompt</small>
    </div>
    
    <div id="paymentStatus" class="payment-status hidden">
        <div class="status-spinner"></div>
        <p id="paymentStatusMessage">Waiting for M-Pesa confirmation...</p>
    </div>
    
    <div class="form-buttons">
        <button type="button" class="btn-previous" data-prev-step="4">Previous</button>
        <button type="button" class="btn-pay" id="payWithMpesa">Pay with M-Pesa</button>
        <button type="button" class="btn-retry hidden" id="retryPayment">Retry Payment</button>
    </div>
</div>
```

## 🎯 NEXT STEPS

To complete the implementation:

1. **Create remaining 2 JavaScript files** (payment service & status poller)
2. **Update vendor-modal-fix.js** to integrate payment flow
3. **Update mpesa-stk-callback.ts** to trigger vendor creation
4. **Add Step 5 HTML** to dalana.html modal
5. **Add script tags** to dalana.html
6. **Deploy Edge Functions** to Supabase
7. **Test end-to-end** flow

## 📋 TESTING CHECKLIST

After implementation:
- [ ] Form validation works (client-side)
- [ ] Duplicate detection works (server-side)
- [ ] Validation token generated and verified
- [ ] Payment intent created with correct amount (KES 1,050)
- [ ] M-Pesa STK Push sent to phone
- [ ] Payment status polling works
- [ ] Successful payment triggers vendor creation
- [ ] Vendor account created with pending_approval status
- [ ] User redirected to signin.html after creation
- [ ] Retry works on payment failure
- [ ] Rate limiting prevents abuse
- [ ] Idempotency prevents duplicate vendors
- [ ] Audit logs capture all events

## 🔒 SECURITY FEATURES

✅ Implemented:
- Fee stored in database (backend)
- Server-side amount validation
- JWT validation tokens (5 min expiration)
- Rate limiting on all endpoints
- Input sanitization (XSS prevention)
- Duplicate detection
- Idempotency checks
- Audit logging
- Payment reconciliation for errors

## 💰 PAYMENT FLOW DIAGRAM

```
User submits form
    ↓
[Client] Validate fields
    ↓
[Client] Sanitize inputs
    ↓
[API] validate-vendor-registration
    ↓
[Client] Show Step 5 (Payment)
    ↓
[User] Enter M-Pesa phone
    ↓
[API] create-vendor-registration-payment
    ├─ get_registration_fee() → KES 1,050
    ├─ Create payment_intent
    └─ Call mpesa-stk-push
    ↓
[M-Pesa] Send STK Push to phone
    ↓
[User] Enter M-Pesa PIN
    ↓
[M-Pesa] Callback to mpesa-stk-callback
    ↓
[API] create-vendor-from-payment
    ├─ Create auth.users
    ├─ Create profiles
    ├─ Create vendors (pending_approval)
    └─ Log audit trail
    ↓
[Client] Redirect to signin.html
```

## 📝 NOTES

- Registration fee is **KES 1,050.00** (stored in database)
- Vendor approval status defaults to **'pending_approval'**
- Payment intents expire after **30 minutes**
- Validation tokens expire after **5 minutes**
- Status polling interval: **5 seconds** (max 2 minutes)
- After successful payment, redirect to **signin.html** (not dashboard)
- SMS welcome message (placeholder - needs SMS service integration)

