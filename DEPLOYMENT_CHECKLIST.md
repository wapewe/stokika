# 🚀 M-Pesa Fix Deployment Checklist

## Overview
This deployment fixes 7 critical issues:
1. ✅ Rate limiting 429 errors (permanent lockouts)
2. ✅ Permission denied 42501 errors (service_role access)
3. ✅ Missing RPC function 404 errors (timeout monitoring)
4. ✅ Payment metrics FK violations
5. ✅ M-Pesa OAuth timeout (546 errors)
6. ✅ Security hole (fake payment codes accepted)
7. ✅ Duplicate registrations (same ID/phone used twice)

---

## Step 1: Apply Database Migrations ⏱️ 2 minutes

### 1.1 Open Supabase SQL Editor
1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor** (left sidebar)
3. Click **New Query**

### 1.2 Run the Migration Script
1. Open the file `DEPLOY_ALL_MPESA_FIXES.sql` (in your project root)
2. Copy the entire contents
3. Paste into the Supabase SQL Editor
4. Click **RUN** (bottom right)

### 1.3 Verify Success
You should see output like:
```
NOTICE: Unique constraints created: 6
```

If you see any errors:
- Red errors about "already exists" are OK (skip and continue)
- Red errors about "does not exist" mean a table is missing (contact support)

---

## Step 2: Deploy Edge Functions ⏱️ 5 minutes

### Option A: Using Supabase Dashboard (Recommended)

#### 2.1 Deploy mpesa-stk-push
1. Go to **Edge Functions** in Supabase Dashboard
2. Click **Create a new function** or find `mpesa-stk-push`
3. Click **Deploy new version**
4. Copy contents from `supabase/functions/mpesa-stk-push/index.ts`
5. Paste and deploy
6. Verify it shows "Active" status

#### 2.2 Deploy verify-manual-payment
1. Click **Create a new function**
2. Name it: `verify-manual-payment`
3. Copy contents from `supabase/functions/verify-manual-payment/index.ts`
4. Paste and deploy
5. Verify it shows "Active" status

### Option B: Using Supabase CLI (If installed)

```powershell
# Navigate to project directory
cd c:\Users\ADMIN\Music\stokika

# Deploy both functions
supabase functions deploy mpesa-stk-push
supabase functions deploy verify-manual-payment
```

---

## Step 3: Verify M-Pesa Credentials ⏱️ 2 minutes

### 3.1 Check Environment Variables
1. In Supabase Dashboard → **Edge Functions**
2. Click on `mpesa-stk-push`
3. Go to **Settings** tab
4. Verify these secrets exist:
   - ✅ `MPESA_CONSUMER_KEY`
   - ✅ `MPESA_CONSUMER_SECRET`
   - ✅ `MPESA_BUSINESS_SHORT_CODE`
   - ✅ `MPESA_PASS_KEY`
   - ✅ `MPESA_ENVIRONMENT` (must be **exactly** `production` in lowercase)

### 3.2 Check Callback URL Registration
Your callback URL is:
```
https://eidsqrnwfndruuufyacc.supabase.co/functions/v1/mpesa-stk-callback
```

**Register this in Daraja Portal:**
1. Go to https://developer.safaricom.co.ke
2. Navigate to **My Apps** → Select your app
3. Go to **Lipa Na M-Pesa Online** → **Register URLs**
4. Set **Validation URL**: (same as callback)
5. Set **Confirmation URL**: (same as callback)
6. Click **Submit**

---

## Step 4: Upload Frontend File ⏱️ 3 minutes

### 4.1 Locate the File
Find: `c:\Users\ADMIN\Music\stokika\js\pages\delivery-partner-form.page.js`

### 4.2 Upload to Server
Use your preferred method:
- FTP client (FileZilla, WinSCP)
- cPanel File Manager
- VS Code SFTP extension
- Git push (if using deployment workflow)

**Upload to**: `/js/pages/delivery-partner-form.page.js` on your web server

### 4.3 Clear Browser Cache
**Important**: Users must clear cache to see new changes:
- Press `Ctrl + Shift + R` (hard refresh)
- Or clear browser cache completely

---

## Step 5: Test the Fixes ⏱️ 5 minutes

### Test 1: Fake M-Pesa Code (Security Fix)
1. Go to delivery partner registration form
2. Complete Steps 1-3 (Personal Info, Documents, Skills)
3. In Step 4, choose **"Already Paid"**
4. Enter a fake M-Pesa code: `FAKE123456`
5. **Expected Result**: 
   - ❌ Should NOT auto-activate account
   - ✅ Should show: "⏳ Payment verification pending. Admin will review within 24 hours."

### Test 2: Duplicate National ID
1. Try to register with an ID that already exists in the system
2. **Expected Result**: 
   - ❌ Should NOT allow registration
   - ✅ Should show: "🚫 This National ID is already registered"

### Test 3: Duplicate Phone Number
1. Try to register with a phone number already in use
2. **Expected Result**:
   - ❌ Should NOT allow registration
   - ✅ Should show: "🚫 This phone number is already registered"

### Test 4: Real M-Pesa Payment
1. Complete Steps 1-3
2. In Step 4, choose **"Pay via M-Pesa"**
3. Enter your phone number
4. Click **"Send Payment Request"**
5. Complete payment on your phone
6. **Expected Results**:
   - ✅ No 429 rate limit errors
   - ✅ No 546 timeout errors
   - ✅ Clear success/error messages
   - ✅ Account activated after successful payment

### Test 5: Payment Failure Messages
1. Initiate M-Pesa payment
2. Cancel on your phone
3. **Expected Result**:
   - ✅ Should show: "❌ Payment was cancelled. Please try again."

---

## Step 6: Monitor Edge Function Logs ⏱️ 2 minutes

### 6.1 Check for Errors
1. Go to **Edge Functions** → **Logs**
2. Filter by `mpesa-stk-push`
3. Look for:
   - ❌ 429 errors (should be gone)
   - ❌ 42501 permission errors (should be gone)
   - ❌ 546 timeout errors (should be gone)
   - ✅ 200 success responses

### 6.2 Check Rate Limit Cleanup
1. Go to **Database** → **Tables** → `rate_limits`
2. Click **View data**
3. Old entries should auto-delete every 10 minutes

---

## Troubleshooting

### Issue: "function cleanup_old_rate_limits() does not exist"
**Solution**: The function was created in an earlier migration. Run:
```sql
SELECT * FROM pg_proc WHERE proname = 'cleanup_old_rate_limits';
```
If empty, check migration `20260918130851_create_rate_limits_table.sql`

### Issue: "permission denied for table X"
**Solution**: Run this for each affected table:
```sql
GRANT ALL ON <table_name> TO service_role;

CREATE POLICY <table_name>_service_role_all ON <table_name>
    FOR ALL TO service_role USING (true) WITH CHECK (true);
```

### Issue: Edge Function still showing old code
**Solution**: 
1. Delete the function in dashboard
2. Redeploy from scratch
3. Hard refresh your browser cache

### Issue: M-Pesa OAuth still timing out
**Solution**:
1. Check credentials in Edge Function settings
2. Verify `MPESA_ENVIRONMENT` is exactly `production` (lowercase)
3. Test OAuth directly: Go to Edge Functions → mpesa-stk-push → Invoke
4. Check logs for specific error message

### Issue: Duplicate constraints failing (23505 error)
**Solution**: You already have duplicate data. Find and clean it:
```sql
-- Find duplicate National IDs
SELECT id_number, COUNT(*) 
FROM delivery_partners 
GROUP BY id_number 
HAVING COUNT(*) > 1;

-- Manually resolve duplicates before applying constraints
```

---

## Success Criteria ✅

Deployment is complete when:
- [ ] All 7 migration scripts ran successfully
- [ ] Both Edge Functions show "Active" status
- [ ] Frontend file uploaded to server
- [ ] Test 1: Fake M-Pesa code shows "pending verification"
- [ ] Test 2: Duplicate ID rejected
- [ ] Test 3: Duplicate phone rejected
- [ ] Test 4: Real payment works end-to-end
- [ ] Test 5: Payment errors show clear messages
- [ ] No 429, 42501, 546 errors in Edge Function logs

---

## Post-Deployment Tasks (Optional)

### Create Admin Dashboard for Manual Verifications
Currently, manual payments go into `manual_verification_queue` table but there's no admin UI to approve/reject them.

**To create admin dashboard:**
1. Create new page: `admin/manual-payments.html`
2. Query `manual_verification_queue` where `status = 'PENDING'`
3. Show M-Pesa code, phone, amount, transaction_found status
4. Add buttons: **Approve** / **Reject**
5. Call Edge Function to update status

**Sample query for admins:**
```sql
SELECT * FROM manual_verification_queue 
WHERE status = 'PENDING' 
ORDER BY created_at DESC;
```

---

## Rollback Plan (If Something Goes Wrong)

### Rollback Database Migrations
```sql
-- 1. Remove duplicate constraints
ALTER TABLE delivery_partners DROP CONSTRAINT IF EXISTS delivery_partners_id_number_unique;
ALTER TABLE delivery_partners DROP CONSTRAINT IF EXISTS delivery_partners_phone_unique;

-- 2. Drop manual verification queue
DROP TABLE IF EXISTS manual_verification_queue;

-- 3. Restore payment_metrics FK (optional)
-- Only if you need the old behavior

-- 4. Remove cron job
SELECT cron.unschedule('cleanup-rate-limits');
```

### Rollback Edge Functions
1. Go to **Edge Functions** → Select function
2. Click **Versions** tab
3. Find previous version
4. Click **Restore**

---

## Need Help?

- **Database Issues**: Check Supabase Dashboard → Database → Logs
- **Edge Function Issues**: Check Edge Functions → Logs (filter by function name)
- **Frontend Issues**: Check browser console (F12)
- **M-Pesa Issues**: Check Daraja Portal → Logs

---

**Deployment Time Estimate**: 15-20 minutes total
**Downtime Required**: None (all changes are backwards compatible)
