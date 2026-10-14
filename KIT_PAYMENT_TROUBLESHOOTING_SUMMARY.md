# Kit Payment Code Verification - Complete Troubleshooting Guide

## 🎯 Problem
When you enter an application code on `kit-payment.html` and click verify, you get:
```
Code verification error: Error: Invalid application code. Please check and try again.
```

## 🔍 Root Causes (One of These)

1. **Edge function not deployed** - The `verify-application-code` function doesn't exist in Supabase
2. **No application records exist** - The database has no field agents or supervisors with application codes
3. **Wrong code format** - The code you're entering doesn't match records in the database

## ⚡ Quick Fix Steps

### Step 1: Use the Diagnostic Tool

I've created a testing tool for you:

1. **Open:** `http://localhost:8000/test-application-code.html`
2. **Check connection status** (should show green "Online" badge)
3. **Test a code** using one of the quick test buttons:
   - `SFA-20261012-0001`
   - `STS-20261012-0001`
   - `SFS90918066`
4. **Review results:**
   - ✅ **Success** = Code is valid, edge function works
   - ❌ **"Code Invalid"** = Code doesn't exist in database
   - ❌ **"Edge Function Error"** = Function not deployed or misconfigured

### Step 2: If Edge Function Error

The function needs to be deployed:

```powershell
cd c:\Users\ADMIN\Music\stokika

# Login to Supabase (if not already)
supabase login

# Link project (if not already linked)
supabase link --project-ref eidsqrnwfndruuufyacc

# Deploy the edge functions
supabase functions deploy verify-application-code
supabase functions deploy get-kit-payment-status

# Verify deployment
supabase functions list
```

**Expected output:**
```
verify-application-code
get-kit-payment-status
```

### Step 3: If Code Not Found in Database

You need to create test data. Choose one:

#### Option A: Submit a Test Application

1. **For Field Agent:**
   - Go to `http://localhost:8000/field-agent.html`
   - Fill out and submit the form
   - Note the generated application code
   - Use that code in kit-payment.html

2. **For Supervisor:**
   - Go to `http://localhost:8000/supervisor-onboarding.html`
   - Fill out and submit the form
   - Note the generated application code
   - Use that code in kit-payment.html

#### Option B: Insert Test Data Manually

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Run this SQL:

```sql
-- Insert test field agent
INSERT INTO field_agents (
    full_name, 
    phone, 
    email,
    county,
    id_number,
    application_code,
    approval_status,
    created_at
) VALUES (
    'Test Field Agent',
    '0712345678',
    'test.agent@example.com',
    'Nairobi',
    '12345678',
    'SFA-20261012-0001',
    'pending',
    NOW()
);

-- Insert test supervisor
INSERT INTO supervisors (
    full_name,
    phone,
    email,
    county,
    id_number,
    application_code,
    approval_status,
    created_at
) VALUES (
    'Test Supervisor',
    '0723456789',
    'test.supervisor@example.com',
    'Nairobi',
    '87654321',
    'STS-20261012-0001',
    'pending',
    NOW()
);
```

3. Now test with these codes:
   - `SFA-20261012-0001`
   - `STS-20261012-0001`

### Step 4: Test in Kit Payment Page

1. Open `http://localhost:8000/kit-payment.html`
2. Enter your test code (e.g., `SFA-20261012-0001`)
3. Click "Verify Code"
4. **Expected:** Payment dashboard loads with applicant information

## 📋 Verification Checklist

Use this checklist to verify everything is working:

- [ ] Supabase connection is active (green badge in test tool)
- [ ] Edge function `verify-application-code` is deployed
- [ ] Edge function `get-kit-payment-status` is deployed
- [ ] At least one application record exists with a valid application code
- [ ] Test code verification in test tool shows success
- [ ] Kit payment page accepts the code and loads payment form

## 🛠 Troubleshooting Tools Created

I've created 3 helper files for you:

1. **`test-application-code.html`** (USE THIS FIRST)
   - Interactive diagnostic tool
   - Tests edge function directly
   - Shows connection status
   - Tests application codes
   - Checks database records

2. **`DIAGNOSE_KIT_PAYMENT.md`**
   - Complete diagnostic guide
   - Step-by-step troubleshooting
   - SQL queries for test data
   - Common issues and solutions

3. **`KIT_PAYMENT_TROUBLESHOOTING_SUMMARY.md`** (this file)
   - Quick reference guide
   - Fast fix steps
   - Verification checklist

## 📞 Common Error Messages & Fixes

### Error: "Failed to initialize database connection"
**Fix:** Check `.env` file has correct Supabase credentials

### Error: "Edge function not found"
**Fix:** Deploy edge functions (Step 2 above)

### Error: "Invalid application code"
**Fix:** Create test data (Step 3 above)

### Error: "CORS policy error"
**Fix:** Redeploy edge function: `supabase functions deploy verify-application-code`

### Error: "Service role key not found"
**Fix:** Edge functions should have this automatically. If not:
```powershell
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## 🎯 Success Indicators

When everything is working, you should see:

✅ **In test tool:**
```
✅ Code Valid!

Application Data:
{
  "application_code": "SFA-20261012-0001",
  "full_name": "Test Field Agent",
  "phone": "0712345678",
  "user_type": "field_agent",
  "approval_status": "pending",
  "created_at": "2026-10-12T..."
}
```

✅ **In kit-payment.html:**
- Code entry form disappears
- Payment dashboard appears
- Shows applicant information
- Shows kit payment form

✅ **In browser console:**
```
✅ Supabase client initialized successfully
✅ CSRF Protection initialized
✅ Payment notification system initialized
```

## 🚀 Next Steps After Fix

Once code verification works:

1. Test the complete payment flow
2. Verify kit configuration loads correctly
3. Test M-Pesa payment integration (if applicable)
4. Test payment status tracking
5. Test payment confirmation flow

## 📚 Additional Resources

- **DEPLOY_KIT_PAYMENT_FIX.md** - Detailed deployment guide
- **Supabase Dashboard** - Check edge function logs
- **Browser Console (F12)** - Check for JavaScript errors
- **Network Tab (F12)** - Monitor API requests

## 💡 Pro Tips

1. **Always test with the diagnostic tool first** - it will tell you exactly what's wrong
2. **Check edge function logs** in Supabase Dashboard if something isn't working
3. **Use browser console** (F12) to see detailed error messages
4. **Create test data early** to avoid this issue during development

---

## Quick Command Reference

```powershell
# Deploy edge functions
supabase functions deploy verify-application-code
supabase functions deploy get-kit-payment-status

# List deployed functions
supabase functions list

# View function logs
supabase functions logs verify-application-code

# Test function via curl
curl -X POST "https://eidsqrnwfndruuufyacc.supabase.co/functions/v1/verify-application-code" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"application_code": "SFA-20261012-0001"}'
```

---

**START HERE:** `http://localhost:8000/test-application-code.html`

This tool will diagnose the exact issue and guide you to the solution!
