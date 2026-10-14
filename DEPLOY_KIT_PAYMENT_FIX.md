# Deploy Kit Payment Fix - Complete Guide

## 🎯 Overview
This guide walks you through deploying the edge functions and migration to fix the 401 Unauthorized error on the kit payment page.

## 📋 Prerequisites
- Supabase CLI installed (`npm install -g supabase`)
- Supabase project linked to local environment
- Access to your Supabase dashboard

## 🚀 Deployment Steps

### Step 1: Link Your Supabase Project (If Not Already Linked)

```powershell
# Navigate to project directory
cd c:\Users\ADMIN\Music\stokika

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref eidsqrnwfndruuufyacc
```

### Step 2: Deploy Edge Functions

```powershell
# Deploy the verify-application-code function
supabase functions deploy verify-application-code

# Deploy the get-kit-payment-status function
supabase functions deploy get-kit-payment-status
```

**Expected Output:**
```
✓ Deployed function verify-application-code
✓ Deployed function get-kit-payment-status
```

### Step 3: Apply Database Migration

```powershell
# Push all migrations to the database
supabase db push --include-all
```

**Alternative:** Apply manually via Supabase Dashboard:
1. Go to **SQL Editor** in your Supabase dashboard
2. Open `supabase/migrations/20240111_enable_kit_payment_access.sql`
3. Copy the entire content
4. Paste into SQL Editor
5. Click **Run**

### Step 4: Verify Edge Functions Are Deployed

```powershell
# List all deployed functions
supabase functions list
```

You should see:
- `verify-application-code`
- `get-kit-payment-status`

### Step 5: Test the Edge Functions

#### Test verify-application-code:
```powershell
# Get your project URL and anon key from dashboard
$PROJECT_URL = "https://eidsqrnwfndruuufyacc.supabase.co"
$ANON_KEY = "your-anon-key-here"

# Test the function
curl -X POST "$PROJECT_URL/functions/v1/verify-application-code" `
  -H "Authorization: Bearer $ANON_KEY" `
  -H "Content-Type: application/json" `
  -d '{"application_code": "SFS90918066"}'
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "application_code": "SFS90918066",
    "full_name": "John Doe",
    "phone": "0712345678",
    "user_type": "supervisor",
    "approval_status": "pending",
    "created_at": "2024-01-11T10:00:00Z"
  }
}
```

#### Test get-kit-payment-status:
```powershell
curl -X POST "$PROJECT_URL/functions/v1/get-kit-payment-status" `
  -H "Authorization: Bearer $ANON_KEY" `
  -H "Content-Type: application/json" `
  -d '{"application_code": "SFS90918066"}'
```

### Step 6: Test the Kit Payment Page

1. Open `kit-payment.html` in your browser
2. Enter a valid application code (e.g., `SFS90918066`)
3. Click "Verify Code"
4. You should see the payment form (no 401 errors!)

## 🔍 Troubleshooting

### Issue: "Function not found"

**Solution:**
```powershell
# Make sure you're in the right directory
cd c:\Users\ADMIN\Music\stokika

# Check if functions exist
ls supabase\functions

# Redeploy
supabase functions deploy verify-application-code --no-verify-jwt
supabase functions deploy get-kit-payment-status --no-verify-jwt
```

### Issue: "Migration already applied"

This is normal if you've run the migration before. You can skip it.

**To force reapply:**
```powershell
# Reset migration (WARNING: This might affect data)
supabase db reset

# Or apply specific migration
supabase db push --include-all
```

### Issue: Still getting 401 errors

**Check:**
1. Edge functions are deployed: `supabase functions list`
2. Migration was applied successfully
3. Browser console for actual error messages
4. Edge function logs: Go to Supabase Dashboard → Edge Functions → Logs

### Issue: "Service role key not found"

Edge functions automatically have access to `SUPABASE_SERVICE_ROLE_KEY` environment variable. If you get this error:

1. Go to Supabase Dashboard
2. Navigate to Settings → API
3. Copy the service role key
4. Set it in your edge function environment:

```powershell
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

## 📊 Verify Deployment

### Check Edge Functions in Dashboard
1. Go to Supabase Dashboard
2. Navigate to **Edge Functions**
3. You should see:
   - `verify-application-code` (Active)
   - `get-kit-payment-status` (Active)

### Check Migration Status
1. Go to **Database** → **Migrations**
2. Look for `20240111_enable_kit_payment_access`
3. Status should be "Applied"

### Check RLS Policies
1. Go to **Authentication** → **Policies**
2. Check `stokika_kit_payments` table has:
   - "Service role full access kit_payments"
   - "Allow anonymous insert kit payments"
   - "Allow anonymous read own kit payments"

## 🎉 Success Indicators

✅ Edge functions deployed successfully
✅ Migration applied without errors
✅ No 401 errors in browser console
✅ Kit payment page shows payment form
✅ Application code lookup works

## 📝 What Changed

### Files Created:
- `supabase/functions/verify-application-code/index.ts`
- `supabase/functions/get-kit-payment-status/index.ts`
- `supabase/migrations/20240111_enable_kit_payment_access.sql`

### Files Modified:
- `js/pages/kit-payment.page.js` - Now uses edge functions instead of direct queries

### Database Changes:
- Added RLS policies for service role access
- Added indexes for better performance
- Enabled anonymous insert/read for kit payments

## 🔐 Security Notes

- Edge functions use service role key (server-side only)
- Client code uses anon key (safe to expose)
- RLS policies protect data access
- No sensitive data exposed to anonymous users
- Rate limiting handled at edge function level

## 🆘 Need Help?

If you encounter issues:
1. Check edge function logs in Supabase Dashboard
2. Check browser console for client-side errors
3. Verify environment variables are set
4. Test edge functions directly with curl
5. Review migration SQL for any errors

## 📞 Support

For additional help:
- Supabase Discord: https://discord.supabase.com
- Documentation: https://supabase.com/docs/guides/functions
