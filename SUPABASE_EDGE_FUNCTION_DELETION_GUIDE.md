# Supabase Edge Function Deletion Guide

## Manual Payment Edge Functions to Delete

These Edge Functions were removed from the local codebase and need to be deleted from your Supabase project:

1. `verify-manual-payment`
2. `manual-payment-verify`
3. `verify-kit-manual-payment`

---

## Method 1: Using Supabase CLI (Recommended)

### Prerequisites
- Supabase CLI installed: https://supabase.com/docs/guides/cli
- Authenticated to Supabase
- Project linked locally

### Step 1: Check if CLI is Installed
```bash
supabase --version
```

If not installed, install it:
```bash
# Windows (PowerShell)
scoop install supabase

# Or download from: https://github.com/supabase/cli/releases
```

### Step 2: Login to Supabase
```bash
supabase login
```

This will open your browser to authenticate.

### Step 3: Link Your Project
```bash
supabase link --project-ref YOUR_PROJECT_REF
```

**Where to find your Project Reference:**
1. Go to https://app.supabase.com
2. Select your project
3. Go to **Settings** → **General**
4. Copy **Reference ID**

### Step 4: Delete the Edge Functions
```bash
# Delete each function
supabase functions delete verify-manual-payment
supabase functions delete manual-payment-verify
supabase functions delete verify-kit-manual-payment
```

### Step 5: Verify Deletion
```bash
# List all deployed functions
supabase functions list
```

The three deleted functions should NOT appear in the list.

---

## Method 2: Using Supabase Dashboard

### Step 1: Access Edge Functions
1. Go to https://app.supabase.com
2. Select your **stokika project**
3. Click **Edge Functions** in the left sidebar

### Step 2: Delete Each Function
For each of these functions:
- `verify-manual-payment`
- `manual-payment-verify`
- `verify-kit-manual-payment`

**Do this:**
1. Find the function in the list
2. Click the **⋮** (three dots) menu or trash icon
3. Click **Delete**
4. Confirm the deletion

### Step 3: Verify
- Refresh the Edge Functions page
- Confirm all three functions are gone

---

## Method 3: Using PowerShell Script

We've created a script to automate the deletion:

```powershell
# Run from your project directory
cd c:\Users\ADMIN\Music\stokika

# Execute the deletion script
.\delete-manual-payment-functions.ps1
```

The script will:
1. Check if Supabase CLI is available
2. List functions to be deleted
3. Ask for confirmation
4. Delete each function
5. Show remaining functions

---

## Getting Your Supabase Tokens

### Access Token (for CLI)

**Location:**
1. Go to https://app.supabase.com
2. Click your **profile icon** (top right corner)
3. Select **Access Tokens**
4. Click **Generate New Token**
5. Give it a name (e.g., "CLI Access")
6. Copy the token
7. Use it:
   ```bash
   supabase login --token YOUR_ACCESS_TOKEN
   ```

### Project API Keys (for application)

**Location:**
1. Go to https://app.supabase.com
2. Select your **project**
3. Click **Settings** → **API**
4. You'll find:

**Project URL:**
```
https://YOUR_PROJECT_REF.supabase.co
```

**API Keys:**
- **anon (public) key**: Safe for client-side use
  - Already in your `.env` file as `VITE_SUPABASE_ANON_KEY` or `SUPABASE_ANON_KEY`
  
- **service_role key**: ⚠️ **NEVER expose publicly!**
  - Used for server-side operations
  - Has full database access
  - Keep in `.env` file, never commit to git

### Project Reference ID

**Location:**
1. Go to https://app.supabase.com
2. Select your **project**
3. Click **Settings** → **General**
4. Copy **Reference ID** (format: `abc123xyz456`)

---

## Verification After Deletion

### 1. Via CLI
```bash
# Should NOT show the deleted functions
supabase functions list
```

Expected output should NOT include:
- verify-manual-payment
- manual-payment-verify
- verify-kit-manual-payment

### 2. Via Dashboard
1. Go to **Edge Functions** page
2. Verify the three functions are not listed

### 3. Check Application Logs
After deletion, check your application for any errors:
1. Go to **Logs** → **Edge Functions**
2. Look for any 404 errors for deleted functions
3. If you see errors, it means frontend code is still trying to call them (shouldn't happen if frontend cleanup was complete)

---

## Common Issues

### Issue: "Function not found"
**Solution:** The function may already be deleted or never deployed. This is OK.

### Issue: "Not authenticated"
**Solution:** Run `supabase login` again

### Issue: "Project not linked"
**Solution:** Run `supabase link --project-ref YOUR_PROJECT_REF`

### Issue: CLI not installed
**Solution:** 
- Windows: `scoop install supabase`
- Or download from: https://github.com/supabase/cli/releases

---

## After Deletion Checklist

- [ ] Run `supabase functions list` - confirm 3 functions deleted
- [ ] Check Supabase Dashboard - Edge Functions page is clean
- [ ] Deploy database migration: `supabase db push`
- [ ] Test STK Push payments on all forms
- [ ] Check application error logs
- [ ] Monitor for 24 hours

---

## Rollback (If Needed)

If you need to restore the Edge Functions:

1. **Restore code from git:**
   ```bash
   git checkout <commit-before-deletion> -- supabase/functions/verify-manual-payment
   git checkout <commit-before-deletion> -- supabase/functions/manual-payment-verify
   git checkout <commit-before-deletion> -- supabase/functions/verify-kit-manual-payment
   ```

2. **Redeploy functions:**
   ```bash
   supabase functions deploy verify-manual-payment
   supabase functions deploy manual-payment-verify
   supabase functions deploy verify-kit-manual-payment
   ```

3. **Restore database:**
   - Run rollback migration in Supabase SQL Editor

---

## Support

If you encounter issues:
1. Check Supabase CLI documentation: https://supabase.com/docs/reference/cli
2. Check Edge Functions docs: https://supabase.com/docs/guides/functions
3. Contact Supabase support: https://supabase.com/dashboard/support

---

**Status:** Ready to delete  
**Risk:** Low (functions are unused after frontend removal)  
**Rollback:** Available if needed
