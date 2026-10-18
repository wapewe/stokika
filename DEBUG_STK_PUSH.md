# 🔍 Debug STK Push 546 Error

## Current Error
```
POST https://eidsqrnwfndruuufyacc.supabase.co/functions/v1/mpesa-stk-push 546
Error: Edge Function returned a non-2xx status code
```

**546 is not a standard HTTP status code** - this indicates the Edge Function is crashing or encountering an unexpected error.

## 🚨 Most Likely Causes

### 1. Migrations Not Applied Yet
**Check:** Did you apply all 5 database migrations?

Go to **Supabase Dashboard → SQL Editor** and run:
```sql
-- Check if migrations were applied
SELECT * FROM _migrations 
WHERE version IN (
  '20261016000000',
  '20261016000001', 
  '20261016000002',
  '20261016000003',
  '20261016000004'
)
ORDER BY version;
```

**Expected:** Should return 5 rows. If not, **apply the missing migrations first** (see `QUICK_DEPLOY_STEPS.md`)

### 2. Edge Function Not Deployed
**Check:** Was the updated Edge Function deployed?

The code changes include critical fixes. If the old version is still running, it might crash.

**Deploy now:**
```bash
# In a regular terminal (not IDE)
cd c:\Users\ADMIN\Music\stokika
supabase functions deploy mpesa-stk-push
```

### 3. Database Connection Issues
The Edge Function might be failing to connect to the database or hitting an error during payment record creation.

---

## 🔍 Immediate Diagnostic Steps

### Step 1: Check Supabase Edge Function Logs
1. Go to **Supabase Dashboard**
2. Navigate to **Edge Functions** → **mpesa-stk-push**
3. Click **Logs** or **Invocations**
4. Look for the most recent failed request
5. **Check the error message** - this will tell us exactly what's failing

### Step 2: Check Database Logs
1. Go to **Supabase Dashboard** → **Logs**
2. Filter by recent timestamp
3. Look for errors related to:
   - `stokika_kit_payments`
   - `payment_intents`
   - `payment_transactions`
   - Permission denied errors (42501)
   - Missing function errors (404)

### Step 3: Test RPC Function
Run this in **SQL Editor** to verify the migration was applied:
```sql
-- Test the timeout query function
SELECT * FROM detect_timeout_payments_query();
```

**Expected:** Query should run without errors (may return 0 rows)
**If Error:** The migration wasn't applied - go apply it now

### Step 4: Verify Policies
```sql
-- Check if service_role policies exist
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE policyname LIKE '%service_role%'
  AND tablename IN ('stokika_kit_payments', 'stokika_kit_config', 'payment_events');
```

**Expected:** Should return 3 rows
**If 0 rows:** Migrations not applied - go apply them

---

## 🛠️ Quick Fixes

### Fix 1: Apply Migrations NOW
If you haven't applied the migrations, **this is likely your issue**:

1. Open **Supabase Dashboard → SQL Editor**
2. Run each migration from `QUICK_DEPLOY_STEPS.md` in order
3. Wait for success confirmation
4. Try the payment again

### Fix 2: Deploy Edge Function
```bash
supabase functions deploy mpesa-stk-push
```

### Fix 3: Check Environment Variables
The Edge Function needs these environment variables in Supabase:
- `SUPABASE_URL`
- `SERVICE_ROLE_KEY`
- `MPESA_SHORTCODE`
- `MPESA_PASSKEY`
- `MPESA_CONSUMER_KEY`
- `MPESA_CONSUMER_SECRET`
- `MPESA_ENVIRONMENT`

**Check:** Supabase Dashboard → Edge Functions → mpesa-stk-push → Settings

---

## 🔬 Detailed Request Debugging

### What the Client is Sending
Based on the code, the payload should be:
```javascript
{
  phoneNumber: "254XXXXXXXXX",
  amount: 1050,
  accountReference: "national_id",
  transactionDesc: "Delivery Partner Activation Fee",
  userType: "vendor",
  applicationCode: "generated_code",
  paymentIntentId: "uuid",
  flowType: "vendor_registration"
}
```

### Expected Edge Function Flow
1. ✅ Validate credentials
2. ✅ Normalize phone number
3. ✅ Validate request
4. ✅ Get timeout config from database
5. ✅ Check rate limits
6. ❌ **Create payment records** ← Most likely failing here
7. ❌ Call M-Pesa API
8. ❌ Return response

**If step 6 fails**, you'll get a 546 or 500 error.

---

## 📊 Common Failure Scenarios

### Scenario A: Permission Denied (Migration 1 & 2 not applied)
**Error in logs:** `permission denied for table stokika_kit_payments`
**Status code:** 500 or 546
**Fix:** Apply migrations 20261016000001 and 20261016000002

### Scenario B: Missing Function (Migration 3 not applied)
**Error in logs:** `function detect_timeout_payments_query() does not exist`
**Status code:** 500 or 546
**Fix:** Apply migration 20261016000003

### Scenario C: FK Constraint Violation (Migration 4 not applied)
**Error in logs:** `violates foreign key constraint payment_metrics_payment_id_fkey`
**Status code:** 500 or 546
**Fix:** Apply migration 20261016000004

### Scenario D: Old Code Still Running
**Issue:** Edge Function hasn't been redeployed
**Status code:** 546 (crashes on new database schema)
**Fix:** Deploy the updated Edge Function

### Scenario E: Rate Limit Still Blocking
**Error in logs:** `Too many payment requests for this phone`
**Status code:** 429 (not 546, but worth checking)
**Fix:** 
```sql
DELETE FROM rate_limits WHERE phone_number = '254XXXXXXXXX';
```

---

## 🎯 Action Plan

### IMMEDIATE (Do This Now)

1. **Check Edge Function Logs** (Dashboard → Edge Functions → mpesa-stk-push → Logs)
   - Look for the exact error message
   - This will tell us what's failing

2. **Verify Migrations Applied**
   ```sql
   SELECT version FROM _migrations WHERE version LIKE '202610160%' ORDER BY version;
   ```
   - Should return 5 rows
   - If not, apply missing migrations

3. **Deploy Edge Function**
   ```bash
   supabase functions deploy mpesa-stk-push
   ```

4. **Test Payment Again**
   - Try making the payment request
   - Check logs again if it fails

### NEXT STEPS (If Still Failing)

1. **Enable Debug Logging**
   - The Edge Function has console.log statements
   - Check the logs to see how far it gets

2. **Test Database Access**
   ```sql
   -- Can we insert into payment_intents?
   SELECT * FROM payment_intents ORDER BY created_at DESC LIMIT 1;
   
   -- Can we insert into stokika_kit_payments?
   SELECT * FROM stokika_kit_payments ORDER BY created_at DESC LIMIT 1;
   ```

3. **Manual Cleanup**
   ```sql
   -- Clear rate limits
   DELETE FROM rate_limits;
   
   -- Check for stuck payments
   SELECT * FROM payment_intents 
   WHERE status = 'PROCESSING' 
   AND created_at < NOW() - INTERVAL '1 hour';
   ```

---

## 📝 What to Report Back

Please check the Edge Function logs and tell me:

1. **Exact error message** from the logs
2. **How many migrations** were applied (run the SELECT query above)
3. **Was the Edge Function deployed?**
4. **What phone number** are you testing with (last 4 digits only)

This will help me pinpoint the exact issue.

---

## 🚀 Expected Behavior After Fix

Once everything is working:
```
✅ POST /functions/v1/mpesa-stk-push → 200 OK
✅ Response: { success: true, checkoutRequestId: "...", ... }
✅ Phone receives STK Push prompt
✅ No errors in Supabase logs
```

---

## 📞 Quick Reference

- **Migrations:** `QUICK_DEPLOY_STEPS.md`
- **Deploy:** `supabase functions deploy mpesa-stk-push`
- **Logs:** Supabase Dashboard → Edge Functions → mpesa-stk-push → Logs
- **Database Logs:** Supabase Dashboard → Logs
