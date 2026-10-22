# Supplier Registration Fix Summary

## Issue Identified

**Error:** `null value in column "profile_id" of relation "suppliers" violates not-null constraint`

**Root Cause:**
The supplier registration Edge Function was attempting to insert supplier records without a `profile_id`, but the database schema had a NOT NULL constraint on this column.

**Log Evidence:**
```
Supplier insert error: {
  code: "23502",
  message: 'null value in column "profile_id" of relation "suppliers" violates not-null constraint'
}
```

## Solution Applied

### 1. Database Schema Change
**File:** `supabase/migrations/20261020_make_supplier_profile_id_nullable.sql`

- Made `profile_id` column nullable in the `suppliers` table
- This allows supplier registration without requiring authentication
- `profile_id` will be linked later during the verification process

### 2. Edge Function Update
**File:** `supabase/functions/supplier-registration-submit/index.ts`

- Added explicit `profile_id: null` in the supplier insert statement
- Added comment explaining that profile_id is null for unauthenticated registration
- Will be linked during the verification process

## Deployment Steps

Run the deployment script:
```powershell
.\fix-supplier-registration.ps1
```

Or manually:
```powershell
# 1. Apply database migration
supabase db push

# 2. Deploy Edge Function
supabase functions deploy supplier-registration-submit --no-verify-jwt
```

## Design Decision

**Why allow nullable profile_id?**
- Suppliers should be able to register without creating an account first (similar to vendor registration)
- This reduces friction in the registration process
- The supplier can create an account later during the verification/onboarding process
- The `profile_id` is linked when the supplier is verified and given system access

## Testing

1. Navigate to: `https://your-domain.com/dalana.html`
2. Click "Join as Supplier" button
3. Complete the 5-step registration form
4. Submit the form
5. Should see success message: "Registration submitted successfully. We will contact you shortly."

## Related Files Modified

- ✅ `supabase/migrations/20261020_make_supplier_profile_id_nullable.sql` - New migration
- ✅ `supabase/functions/supplier-registration-submit/index.ts` - Updated Edge Function
- ✅ `fix-supplier-registration.ps1` - Deployment script
- ✅ `SUPPLIER_REGISTRATION_FIX_SUMMARY.md` - This documentation

## Future Considerations

When implementing supplier verification/onboarding:
1. Create user profile (auth.users + public.profiles)
2. Link the profile_id to the existing supplier record
3. Grant appropriate permissions/roles
4. Notify the supplier of their account credentials
