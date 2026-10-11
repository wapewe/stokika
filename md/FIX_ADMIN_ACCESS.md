# Fix Admin Access - Quick Guide

## Problem
Getting "Access denied. Admin privileges required" even after logging in as admin.

## Root Cause
The admin check was querying the database which returned 406 (Not Acceptable) due to RLS policies blocking the query.

## Solution
Changed to use session metadata instead of database queries.

## Steps to Fix

### Step 1: Run SQL in Supabase Dashboard

1. Go to: https://supabase.com/dashboard/project/iuvlwpkehrnyxaoxznuk/editor
2. Click "SQL Editor"
3. Copy and paste the contents of `config/setup-admin-metadata.sql`
4. **IMPORTANT:** Replace `'admin@stokika.com'` with your actual admin email
5. Click "Run"

### Step 2: Verify Metadata

Run this query to check if metadata is set:

```sql
SELECT 
    au.email,
    au.raw_user_meta_data->>'user_type' as user_type,
    au.raw_user_meta_data->>'role' as role
FROM auth.users au
WHERE au.email = 'your-admin-email@example.com';
```

You should see:
- `user_type`: "admin"
- `role`: "admin"

### Step 3: Clear Browser and Re-login

1. Open browser DevTools (F12)
2. Go to Application tab → Storage → Clear site data
3. Close browser completely
4. Open browser again
5. Go to admin login page
6. Login with your admin credentials

### Step 4: Test Access

1. After login, you should be redirected to admin dashboard
2. Check browser console (F12) for: "Admin authenticated successfully"
3. Dashboard should load without "Access denied" message

## Alternative: Manual Metadata Update

If the SQL script doesn't work, manually update metadata:

```sql
-- Replace USER_ID and EMAIL with your actual values
UPDATE auth.users
SET raw_user_meta_data = jsonb_build_object(
    'user_type', 'admin',
    'role', 'admin',
    'email', 'your-email@example.com'
)
WHERE email = 'your-email@example.com';
```

## Troubleshooting

### Still Getting "Access Denied"?

1. **Check Console Logs:**
   - Open F12 → Console
   - Look for: "Not admin. Metadata: {...}"
   - This shows what metadata the system sees

2. **Verify Session:**
   - Open `check-admin-status.html` in browser
   - It will show your current session and metadata

3. **Check User Record:**
   ```sql
   SELECT * FROM users WHERE email = 'your-email@example.com';
   ```
   Ensure `user_type` and `role` are both set to 'admin'

4. **Force Logout and Re-login:**
   - Clear all browser data
   - Login again
   - The trigger should sync metadata automatically

## What Changed

1. **admin-auth-guard.js**: Now checks session metadata instead of querying database
2. **supabase-config.js**: Fixed multiple client instances warning
3. **Database**: Added trigger to auto-sync metadata on user updates

## Testing

After fixing, test by:
1. Opening admin dashboard directly: `/html/admin.html`
2. Should redirect to login if not logged in
3. After login, should access dashboard successfully
4. No "Access denied" alert should appear
