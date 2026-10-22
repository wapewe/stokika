# Deploy Supplier Registration Fix

## Quick Fix Steps

### Step 1: Apply Database Change
1. Go to Supabase Dashboard → SQL Editor
2. Open the file: `APPLY_SUPPLIER_FIX.sql`
3. Copy and paste the SQL into the editor
4. Click "Run" to execute
5. Verify: `is_nullable` column should show "YES"

### Step 2: Deploy Edge Function
```powershell
cd C:\Users\ADMIN\Music\stokika
supabase functions deploy supplier-registration-submit --no-verify-jwt
```

Or if you're already logged in to Supabase:
```powershell
supabase functions deploy supplier-registration-submit
```

## Verification

Test the supplier registration:
1. Open: http://localhost:your-port/dalana.html (or your live site)
2. Click "Join as Supplier"
3. Fill out the registration form
4. Click Submit
5. Should see: "Registration submitted successfully"

## What Was Fixed

**Problem:**
```
Error: null value in column "profile_id" violates not-null constraint
```

**Solution:**
- Made `profile_id` column nullable in `suppliers` table
- Added explicit `profile_id: null` in Edge Function insert
- Suppliers can now register without authentication
- `profile_id` will be linked later during verification

## Files Changed

✅ `supabase/functions/supplier-registration-submit/index.ts`
✅ `APPLY_SUPPLIER_FIX.sql`
✅ `supabase/migrations/20261020_make_supplier_profile_id_nullable.sql`

## If You Encounter Issues

Check the error logs at:
- Supabase Dashboard → Edge Functions → supplier-registration-submit → Logs
- Look for insert errors or validation failures

Common issues:
- **Duplicate phone/email**: Clear test data from `suppliers` table
- **Missing required fields**: Check form validation in browser console
- **401 Unauthorized**: Make sure Edge Function is deployed with `--no-verify-jwt`
