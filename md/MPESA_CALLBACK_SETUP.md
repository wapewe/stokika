# M-Pesa Callback Setup Guide

## Why You Got 404 Error

The callback URL is **NOT meant to be visited in a browser**. It's an API endpoint that:
- Only accepts **POST requests** from M-Pesa
- Returns 404 when you click it (GET request)
- Will work automatically when M-Pesa sends payment notifications

## What I Created

✅ **Supabase Edge Function**: `supabase/functions/mpesa-callback/index.ts`
- Receives M-Pesa payment notifications
- Updates payment status in database
- Logs all transactions

## Deploy via Supabase Dashboard (Remote)

### Step 1: Go to Supabase Dashboard
1. Open: https://supabase.com/dashboard/project/iuvlwpkehrnyxaoxznuk
2. Click **"Edge Functions"** in left sidebar
3. Click **"Create a new function"**

### Step 2: Create Function
1. **Function name:** `mpesa-callback`
2. Copy the code from `supabase/functions/mpesa-callback/index.ts`
3. Paste into the editor
4. Click **"Deploy function"**

### Step 3: Function is Auto-Deployed!
Your callback URL is now live at:
```
https://iuvlwpkehrnyxaoxznuk.supabase.co/functions/v1/mpesa-callback
```

### Step 4: Environment Variables (Already Set)
Supabase automatically provides:
- `SUPABASE_URL` ✅
- `SUPABASE_SERVICE_ROLE_KEY` ✅

No additional configuration needed!

## Your Callback URL

**Updated in .env file:**
```
MPESA_CALLBACK_URL=https://iuvlwpkehrnyxaoxznuk.supabase.co/functions/v1/mpesa-callback
```

## Update M-Pesa Daraja Portal

1. Go to https://developer.safaricom.co.ke
2. Login → My Apps → Select your app
3. Update callback URL to:
   ```
   https://iuvlwpkehrnyxaoxznuk.supabase.co/functions/v1/mpesa-callback
   ```

## Testing

### Test the endpoint is live:
```bash
curl -X POST https://iuvlwpkehrnyxaoxznuk.supabase.co/functions/v1/mpesa-callback \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

### Check function logs:
1. Go to Supabase Dashboard → Edge Functions
2. Click on `mpesa-callback`
3. Click **"Logs"** tab to see all requests

## How It Works

1. **User initiates payment** → Your app calls M-Pesa STK Push
2. **User enters PIN** → M-Pesa processes payment
3. **M-Pesa sends callback** → POST request to your edge function
4. **Edge function updates database** → Payment status changes to "completed"
5. **User sees confirmation** → Your app shows success message

## Important Notes

- ✅ Callback URL should return 404 when clicked (normal behavior)
- ✅ Only M-Pesa can successfully POST to this endpoint
- ✅ All callbacks are logged in Supabase function logs
- ✅ Payment status automatically updates in `kit_payments` table

## Troubleshooting

**If payments don't update:**
1. Check function logs: `supabase functions logs mpesa-callback`
2. Verify callback URL in Daraja portal matches your edge function URL
3. Ensure `kit_payments` table has `checkout_request_id` column
4. Check M-Pesa is sending to correct URL (sandbox vs production)

**Common Issues:**
- **404 in browser**: Normal! It's a POST-only endpoint
- **Callback not received**: Check Daraja portal callback URL
- **Database not updating**: Check function logs for errors
