# 🔧 M-Pesa OAuth Timeout Issue - Fix & Diagnosis

## 🎯 Current Problem

From the logs, the Edge Function is **hanging at M-Pesa OAuth authentication**:
```
✅ [M-Pesa Auth] Requesting OAuth token (attempt 1/3)...
❌ [No response logged - function times out]
🔴 shutdown
```

The function reaches the M-Pesa OAuth API call but never gets a response, causing it to timeout and return **status 546**.

---

## 🔍 Root Causes (In Order of Likelihood)

### 1. Invalid M-Pesa Credentials (Most Likely)
If the Consumer Key or Consumer Secret is incorrect, M-Pesa's OAuth endpoint might:
- Not respond at all
- Take extremely long to timeout
- Return a silent error

### 2. M-Pesa API Endpoint Slow/Down
The production M-Pesa API (`https://api.safaricom.co.ke`) might be:
- Experiencing high load
- Having network issues
- Blocking requests from certain regions/IPs

### 3. Network/Firewall Issues
Supabase Edge Functions might be:
- Blocked by M-Pesa's firewall
- Experiencing DNS resolution issues
- Unable to reach Safaricom's servers

---

## ✅ Fixes Applied

### 1. Added 30-Second Timeout
The OAuth request now has a **30-second timeout** to prevent indefinite hanging:
```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 30000);
```

### 2. Better Error Logging
Added detailed logging to see:
- The exact API URL being called
- Response status codes
- Timeout errors vs network errors

### 3. Clearer Error Messages
Timeout errors now explicitly state: `"M-Pesa OAuth request timed out after 30 seconds"`

---

## 🚀 Deploy the Fix

### Step 1: Deploy Updated Edge Function
Open a terminal and run:
```bash
cd c:\Users\ADMIN\Music\stokika
supabase functions deploy mpesa-stk-push
```

This will deploy the updated `mpesa-auth.ts` with timeout handling.

### Step 2: Test Again
Try making a payment request. You should now see one of:
- ✅ **Success:** OAuth token obtained
- ❌ **Timeout Error:** "M-Pesa OAuth request timed out after 30 seconds"
- ❌ **Auth Error:** "M-Pesa OAuth failed: 401 Unauthorized"

---

## 🔎 Diagnostic Steps

### Check 1: Verify M-Pesa Environment Variables

Go to **Supabase Dashboard** → **Edge Functions** → **mpesa-stk-push** → **Settings**

Verify these variables are set **correctly**:

| Variable | Expected Value | Notes |
|----------|---------------|-------|
| `MPESA_ENVIRONMENT` | `production` | Must be exact (not "prod" or "live") |
| `MPESA_CONSUMER_KEY` | Your Consumer Key | From Daraja Portal |
| `MPESA_CONSUMER_SECRET` | Your Consumer Secret | From Daraja Portal |
| `MPESA_SHORTCODE` | Your Paybill/Till | The shortcode receiving payments |
| `MPESA_PASSKEY` | Your Lipa Na M-Pesa Passkey | From Daraja Portal |

**Common Issues:**
- ❌ Extra spaces before/after values
- ❌ Using sandbox credentials in production mode
- ❌ Copy-paste errors (missing characters)
- ❌ Expired/revoked credentials

### Check 2: Test Credentials Locally

You can test if your M-Pesa credentials work by making a direct OAuth request:

```bash
# Replace with your actual credentials
curl -X GET \
  'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials' \
  -H 'Authorization: Basic BASE64_ENCODED_CREDENTIALS'
```

To generate the Base64 credentials:
```javascript
// In browser console or Node.js
btoa('YOUR_CONSUMER_KEY:YOUR_CONSUMER_SECRET')
```

**Expected Response (Success):**
```json
{
  "access_token": "xxxxx",
  "expires_in": "3599"
}
```

**Error Responses:**
```json
// 401 Unauthorized - Invalid credentials
{
  "errorCode": "401.002.01",
  "errorMessage": "Invalid Credentials"
}

// 400 Bad Request - Malformed request
{
  "fault": {
    "code": "400",
    "message": "Bad Request"
  }
}
```

### Check 3: Verify Production API Access

Some M-Pesa production apps require:
- **IP Whitelisting** - Your server IP must be registered with Safaricom
- **App Activation** - Your Daraja app must be approved for production
- **Valid Subscription** - Your M-Pesa Business account must be active

**To Check:**
1. Login to [Daraja Portal](https://developer.safaricom.co.ke/)
2. Go to **My Apps**
3. Select your production app
4. Check **Status**: Should be "Active" or "Live"
5. Check **Environment**: Should show production keys

### Check 4: Test with Sandbox First

If production isn't working, test with sandbox to isolate the issue:

**Temporary Change:**
1. Go to **Supabase Dashboard** → **Edge Functions** → **mpesa-stk-push** → **Settings**
2. Change `MPESA_ENVIRONMENT` to `sandbox`
3. Update credentials to sandbox keys
4. Test payment
5. Check logs

If **sandbox works** but **production doesn't**, it's a credential/access issue.

---

## 📊 Expected Log Patterns

### Success Pattern
```
✅ [M-Pesa Auth] Requesting OAuth token (attempt 1/3)...
✅ [M-Pesa Auth] API URL: https://api.safaricom.co.ke/oauth/v1/generate
✅ [M-Pesa Auth] Response status: 200
✅ [M-Pesa Auth] Successfully obtained OAuth token (expires in 3599s)
✅ [STK Push] Calling M-Pesa API...
```

### Timeout Pattern (After Fix)
```
✅ [M-Pesa Auth] Requesting OAuth token (attempt 1/3)...
✅ [M-Pesa Auth] API URL: https://api.safaricom.co.ke/oauth/v1/generate
❌ [M-Pesa Auth] Request timeout on attempt 1 (30s limit exceeded)
⏳ [M-Pesa Auth] Waiting 1000ms before retry...
✅ [M-Pesa Auth] Requesting OAuth token (attempt 2/3)...
```

### Invalid Credentials Pattern
```
✅ [M-Pesa Auth] Requesting OAuth token (attempt 1/3)...
✅ [M-Pesa Auth] API URL: https://api.safaricom.co.ke/oauth/v1/generate
✅ [M-Pesa Auth] Response status: 401
❌ [M-Pesa Auth] Non-retryable error: M-Pesa OAuth failed: 401 Unauthorized
❌ [STK Push] Unexpected error: Failed to obtain M-Pesa OAuth token...
```

---

## 🛠️ Solutions by Error Type

### If You See: "Request timeout after 30 seconds"

**Cause:** M-Pesa API not responding
**Solutions:**
1. Check if M-Pesa API is down (check Safaricom status page)
2. Verify your IP isn't blocked by Safaricom
3. Try again in a few minutes
4. Contact Safaricom support

### If You See: "401 Unauthorized" or "Invalid Credentials"

**Cause:** Wrong Consumer Key/Secret
**Solutions:**
1. Double-check credentials in Daraja Portal
2. Regenerate credentials if needed
3. Ensure no extra spaces in environment variables
4. Verify using production keys (not sandbox) when `MPESA_ENVIRONMENT=production`

### If You See: "400 Bad Request"

**Cause:** Malformed OAuth request
**Solutions:**
1. Check if credentials have special characters that need escaping
2. Verify Base64 encoding is correct
3. Ensure no newlines in environment variables

### If Function Still Times Out (No Logs)

**Cause:** Edge Function crashed before timeout fix deployed
**Solutions:**
1. Verify you deployed the updated function: `supabase functions deploy mpesa-stk-push`
2. Check Edge Function logs for boot errors
3. Try redeploying: `supabase functions deploy mpesa-stk-push --no-verify-jwt`

---

## 🎯 Quick Action Plan

### IMMEDIATE (Do Right Now)

1. **Deploy the timeout fix:**
   ```bash
   supabase functions deploy mpesa-stk-push
   ```

2. **Test payment again** and check logs

3. **Copy the new logs** and look for:
   - "Response status: XXX" line
   - "Request timeout" message
   - "Invalid Credentials" error

### NEXT STEPS (Based on Logs)

**If you see timeout:**
- Check M-Pesa API status
- Try sandbox environment temporarily
- Contact Safaricom support

**If you see 401/401 error:**
- Verify credentials in Supabase Dashboard
- Double-check Daraja Portal for correct keys
- Regenerate credentials if needed

**If you see 400 error:**
- Check for special characters in credentials
- Verify environment variable format

---

## 📞 Need Help?

After deploying the fix, test again and share:
1. **New Edge Function logs** (first 20 lines of latest request)
2. **Response status code** if visible
3. **Error message** if any
4. **M-Pesa environment** (production or sandbox)

This will help diagnose the exact issue.

---

## ✨ Summary

- ✅ Added 30-second timeout to prevent indefinite hanging
- ✅ Added detailed logging for OAuth requests
- ✅ Improved error messages for debugging
- 🚀 Deploy with: `supabase functions deploy mpesa-stk-push`
- 🔍 Check logs after testing to see specific error
- 🎯 Most likely issue: Invalid M-Pesa credentials

---

**Files Modified:**
- `supabase/functions/shared/mpesa-auth.ts` (timeout & logging)

**Deploy Command:**
```bash
cd c:\Users\ADMIN\Music\stokika
supabase functions deploy mpesa-stk-push
```
