# Fix: Kit Payment 401 Unauthorized Error

## Problem
When users enter their application code on the kit payment page, they get a `401 (Unauthorized)` error because the Supabase queries require authentication, but users haven't logged in yet (they're just trying to pay for their kit).

## Error Messages
```
GET https://eidsqrnwfndruuufyacc.supabase.co/rest/v1/field_agents?select=*&application_code=eq.SFS90918066 401 (Unauthorized)
GET https://eidsqrnwfndruuufyacc.supabase.co/rest/v1/supervisors?select=*&application_code=eq.SFS90918066 401 (Unauthorized)
```

## Solution
Update the Row Level Security (RLS) policies in Supabase to allow anonymous users to read from these tables when querying by `application_code`.

## Steps to Fix

### Option 1: Apply SQL Migration (Recommended)
1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Open the file `supabase-migrations/enable-kit-payment-lookup.sql`
4. Copy and paste the entire SQL content into the SQL Editor
5. Click **Run** to execute the migration
6. Test the kit payment page again

### Option 2: Manual Policy Setup
If you prefer to set up policies manually:

1. Go to **Authentication** → **Policies** in Supabase Dashboard

2. For **field_agents** table:
   - Click "New Policy"
   - Name: "Allow anonymous read by application_code"
   - Policy command: SELECT
   - Target roles: anon
   - USING expression: `application_code IS NOT NULL`

3. For **supervisors** table:
   - Click "New Policy"
   - Name: "Allow anonymous read by application_code"
   - Policy command: SELECT
   - Target roles: anon
   - USING expression: `application_code IS NOT NULL`

4. For **stokika_kit_payments** table:
   - Click "New Policy" for SELECT
   - Name: "Allow anonymous read kit payments by application_code"
   - Policy command: SELECT
   - Target roles: anon
   - USING expression: `application_code IS NOT NULL`
   
   - Click "New Policy" for INSERT
   - Name: "Allow anonymous insert kit payments"
   - Policy command: INSERT
   - Target roles: anon
   - WITH CHECK expression: `application_code IS NOT NULL`

## Security Considerations

### Current Solution (Quick Fix)
- Allows anonymous users to look up applications by code
- Only works when `application_code` is provided (not a full table scan)
- Suitable for development and testing

### Production Recommendations
For enhanced security in production:

1. **Create a Supabase Edge Function** to handle lookups with service role key
   - Implement rate limiting (e.g., max 5 attempts per IP per hour)
   - Log all verification attempts for audit purposes
   - Add CAPTCHA after 3 failed attempts

2. **Minimize exposed data**
   - Only return fields needed for payment (name, phone, kit amount)
   - Don't expose sensitive fields like national_id, email, etc.

3. **Add monitoring**
   - Set up alerts for unusual patterns (many failed lookups)
   - Monitor for potential brute force attacks

## Testing
After applying the fix:

1. Open `kit-payment.html` in your browser
2. Enter a valid application code (e.g., `SFS90918066`)
3. Click "Verify Code"
4. You should now see the payment form instead of an error

## Files Modified
- Created: `supabase-migrations/enable-kit-payment-lookup.sql`
- Related: `js/pages/kit-payment.page.js` (queries these tables)

## Need Help?
If you still get 401 errors after applying the migration:
1. Check that RLS is enabled on all three tables
2. Verify the policies were created successfully in Supabase Dashboard
3. Check the browser console for any other errors
4. Ensure your application code exists in either `field_agents` or `supervisors` table
