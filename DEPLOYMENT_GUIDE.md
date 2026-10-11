# QUICK DEPLOYMENT GUIDE - Vendor Registration Payment System

## ✅ PRE-DEPLOYMENT CHECKLIST

- [ ] All Edge Functions created locally
- [ ] Frontend files updated
- [ ] Service worker cache updated
- [ ] Registration success page created

---

## 🚀 DEPLOYMENT COMMANDS

### Step 1: Deploy Edge Functions to Supabase

```powershell
# Navigate to project root
cd c:\Users\ADMIN\Music\stokika

# Deploy all new Edge Functions
npx supabase functions deploy validate-vendor-registration
npx supabase functions deploy create-vendor-registration-payment
npx supabase functions deploy create-vendor-from-payment

# Redeploy updated callback
npx supabase functions deploy mpesa-stk-callback
```

### Step 2: Verify Database Function

Login to Supabase Dashboard → SQL Editor:

```sql
-- Test registration fee function
SELECT get_registration_fee();
-- Expected output: 1050.00

-- Check if payment_purpose enum includes REGISTRATION
SELECT unnest(enum_range(NULL::payment_purpose));
-- Should include: REGISTRATION, FIELD_AGENT_KIT, SUPERVISOR_KIT, STOCK_CYCLE
```

### Step 3: Test Edge Functions Locally (Optional)

```powershell
# Start local Supabase
npx supabase start

# Test validate-vendor-registration
curl -X POST http://localhost:54321/functions/v1/validate-vendor-registration `
  -H "Content-Type: application/json" `
  -d '{
    "fullName": "Test User",
    "businessName": "Test Business",
    "businessCategory": "Food & Beverages",
    "email": "test@example.com",
    "phone": "254712345678",
    "county": "Nairobi",
    "businessStatus": "Start-up (0-2 years)",
    "businessSize": "Small (2-10 employees)",
    "businessModel": "Retailer"
  }'

# Expected response: {"valid": true, "token": "..."}
```

---

## 📤 UPLOAD FILES TO CPANEL

### Files to Upload:

**New Files:**
- `js/vendor-registration-validation.js`
- `js/vendor-payment-status-poller.js`
- `js/vendor-registration-payment.js`
- `registration-success.html`

**Updated Files:**
- `js/vendor-modal-fix.js`
- `dalana.html`
- `service-worker.js`
- `supabase/functions/mpesa-stk-callback/index.ts`

### Upload via cPanel:

1. Login to cPanel
2. Open File Manager
3. Navigate to `public_html` (or your site root)
4. Upload files to respective directories:
   - JavaScript files → `js/`
   - HTML files → root directory
   - Service worker → root directory

---

## 🧪 POST-DEPLOYMENT TESTING

### 1. Clear Browser Cache

```
1. Press F12
2. Application → Service Workers → Unregister all
3. Cache Storage → Delete all stokika caches
4. Close DevTools
5. Hard refresh: Ctrl + Shift + R
```

### 2. Test Registration Flow

1. Open https://yoursite.com/dalana.html
2. Click "Get Started" or "Register as Vendor"
3. Fill Steps 1-4
4. Click "Submit Registration"
5. ✅ Verify Step 5 (Payment) appears
6. Enter M-Pesa phone: 254712345678
7. Click "Pay with M-Pesa"
8. ✅ Check phone for STK Push prompt
9. Enter M-Pesa PIN
10. ✅ Verify status updates in real-time
11. ✅ Verify redirect to registration-success.html

### 3. Verify Database Records

Login to Supabase Dashboard → Table Editor:

**Check payment_intents:**
```sql
SELECT * FROM payment_intents 
WHERE payment_purpose = 'REGISTRATION' 
ORDER BY created_at DESC 
LIMIT 5;
```
✅ Verify: status = 'CONFIRMED', expected_amount = 1050

**Check vendors:**
```sql
SELECT * FROM vendors 
WHERE registration_paid = TRUE 
ORDER BY created_at DESC 
LIMIT 5;
```
✅ Verify: approval_status = 'pending_approval'

**Check profiles:**
```sql
SELECT * FROM profiles 
WHERE role = 'vendor' 
ORDER BY created_at DESC 
LIMIT 5;
```
✅ Verify: role = 'vendor'

---

## 🐛 TROUBLESHOOTING

### Issue: "Supabase client not initialized"

**Solution:**
```javascript
// Check in browser console:
console.log(window.SUPABASE_URL);
console.log(window.SUPABASE_ANON_KEY);
// Should not be undefined
```

If undefined, check that Supabase is initialized in dalana.html

---

### Issue: "Validation token expired"

**Solution:**
- Token expires after 5 minutes
- Tell user to resubmit the form
- This is by design for security

---

### Issue: Edge Function 401 Unauthorized

**Solution:**
```powershell
# Check environment variables in Supabase Dashboard
# Settings → Edge Functions → Environment Variables

# Required:
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
MPESA_SHORTCODE=174379
MPESA_PASSKEY=bfb279f9aa...
MPESA_ENVIRONMENT=sandbox (or production)
```

---

### Issue: Payment stuck on "Processing..."

**Check:**
1. M-Pesa callback endpoint is accessible
2. M-Pesa callback function deployed
3. Check logs in Supabase Dashboard → Edge Functions → Logs
4. Verify payment_intent exists in database

**Manual fix:**
```sql
-- Check payment intent status
SELECT * FROM payment_intents WHERE id = 'intent-id-here';

-- If stuck, can manually trigger vendor creation
-- (Use with caution - only if payment actually confirmed)
```

---

### Issue: Vendor not created after payment

**Check:**
1. mpesa-stk-callback logs for errors
2. payment_reconciliation table for failed creations:
   ```sql
   SELECT * FROM payment_reconciliation 
   WHERE issue_type = 'VENDOR_CREATION_FAILED' 
   ORDER BY created_at DESC;
   ```
3. Manually invoke create-vendor-from-payment:
   ```powershell
   curl -X POST http://localhost:54321/functions/v1/create-vendor-from-payment `
     -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" `
     -H "Content-Type: application/json" `
     -d '{"paymentIntentId": "intent-id-here"}'
   ```

---

## 📊 MONITORING

### Key Metrics to Monitor:

1. **Payment Success Rate**
   ```sql
   SELECT 
     COUNT(*) FILTER (WHERE status = 'CONFIRMED') AS successful,
     COUNT(*) FILTER (WHERE status = 'FAILED') AS failed,
     COUNT(*) AS total
   FROM payment_intents 
   WHERE payment_purpose = 'REGISTRATION';
   ```

2. **Vendor Creation Success Rate**
   ```sql
   SELECT 
     COUNT(*) FILTER (WHERE registration_paid = TRUE) AS paid,
     COUNT(*) AS total
   FROM vendors;
   ```

3. **Average Payment Time**
   ```sql
   SELECT AVG(confirmed_at - created_at) AS avg_payment_time
   FROM payment_intents 
   WHERE payment_purpose = 'REGISTRATION' 
     AND status = 'CONFIRMED';
   ```

---

## 🎯 SUCCESS CRITERIA

✅ Vendor fills all 4 steps  
✅ Step 5 (Payment) displays correctly  
✅ M-Pesa STK Push received on phone  
✅ Payment confirmed within 2 minutes  
✅ Vendor account created automatically  
✅ Redirect to success page  
✅ All database records correct  

---

## 📞 SUPPORT

If issues persist:

1. Check Edge Function logs in Supabase Dashboard
2. Check browser console for JavaScript errors
3. Verify M-Pesa credentials in Supabase environment variables
4. Check payment_reconciliation table for error details

**Need help?** Review:
- `VENDOR_PAYMENT_IMPLEMENTATION_COMPLETE.md` (detailed documentation)
- `VENDOR_PAYMENT_IMPLEMENTATION_STATUS.md` (original requirements)

---

**Deployment Time:** ~30 minutes  
**Testing Time:** ~15 minutes  
**Total:** ~45 minutes

Good luck with the deployment! 🚀
