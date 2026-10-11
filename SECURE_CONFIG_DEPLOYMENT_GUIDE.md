# Secure Configuration Deployment Guide

## Overview
Your application now loads Supabase credentials securely via a Supabase Edge Function. No credentials are hardcoded in your JavaScript files.

## Architecture

```
Browser
   ↓
1. Loads /config.json (ONLY contains Supabase project URL - public, not sensitive)
   ↓
2. Calls Supabase Edge Function: /functions/v1/get-config
   ↓
3. Edge Function returns credentials from environment variables
   ↓
4. Application initializes with secure credentials
```

## Files Modified

### ✅ Removed Hardcoded References
- ❌ **OLD**: `storageKey: 'sb-iuvlwpkehrnyxaoxznuk-auth-token'` (hardcoded old project)
- ✅ **NEW**: `storageKey: 'sb-${projectRef}-auth-token'` (dynamic, extracted from URL)

### 📁 Updated Files
1. `js/core/supabase-config.js` - Dynamic storage key
2. `js/core/supabase-client.js` - Dynamic storage key
3. `js/core/config-loader.js` - Loads from Edge Function
4. `config.json` - Bootstrap file (ONLY URL, no keys)

## Deployment Steps for cPanel

### Step 1: Upload Files to cPanel
Upload these files via cPanel File Manager or FTP:

```
/public_html/
├── config.json (ONLY contains Supabase URL)
├── js/
│   └── core/
│       ├── config-loader.js
│       ├── supabase-config.js
│       └── supabase-client.js
└── .env (Keep this secure - DO NOT expose to web)
```

### Step 2: Protect Sensitive Files in cPanel

Create/update `.htaccess` in your root directory:

```apache
# Deny access to sensitive files
<FilesMatch "^\.env">
    Order allow,deny
    Deny from all
</FilesMatch>

# Deny access to configuration directories
<DirectoryMatch "config|migrations|sql">
    Order allow,deny
    Deny from all
</DirectoryMatch>

# Allow access to config.json (only contains public URL)
<Files "config.json">
    Order allow,deny
    Allow from all
</Files>
```

### Step 3: Deploy Edge Function to Supabase

#### Option A: Via Supabase Dashboard (Easiest)

1. Go to: https://supabase.com/dashboard/project/eidsqrnwfndruuufyacc/functions

2. Click "Deploy new function"

3. Name: `get-config`

4. Copy the code from `supabase/functions/get-config/index.ts`

5. Set environment variables in function settings:
   - `SUPABASE_URL`: `https://eidsqrnwfndruuufyacc.supabase.co`
   - `SUPABASE_ANON_KEY`: (from your .env file - DO NOT expose this publicly)

6. Deploy

#### Option B: Via Supabase CLI (Advanced)

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref eidsqrnwfndruuufyacc

# Deploy function
supabase functions deploy get-config

# Set secrets (environment variables)
supabase secrets set SUPABASE_URL=https://eidsqrnwfndruuufyacc.supabase.co
supabase secrets set SUPABASE_ANON_KEY=your_anon_key_here
```

### Step 4: Test the Configuration

1. Open your browser's Developer Console

2. Navigate to your website

3. Check console for:
   ```
   Loading config from Supabase Edge Function...
   ✅ Supabase client initialized successfully
   ```

4. Verify no errors about `iuvlwpkehrnyxaoxznuk` (old project)

5. Test a form submission (e.g., field agent application)

## Security Checklist

### ✅ What's Secure
- ✅ Supabase anon key served from Edge Function (not hardcoded)
- ✅ Edge Function protected by CORS (only your domain)
- ✅ .env file protected by .htaccess
- ✅ No credentials in JavaScript files
- ✅ Storage keys are dynamic (no hardcoded project IDs)

### ⚠️ What's Public (Safe)
- ℹ️ Supabase project URL in config.json - This is safe! It's public anyway
- ℹ️ Supabase anon key - This is designed to be public, protected by RLS

### ❌ What Must Stay Private
- 🔒 Service role key (NEVER expose to client)
- 🔒 Database password
- 🔒 M-Pesa credentials
- 🔒 JWT secrets

## Troubleshooting

### Issue: "Failed to load config from Supabase Edge Function"

**Solution**: 
1. Check Edge Function is deployed: https://eidsqrnwfndruuufyacc.supabase.co/functions/v1/get-config
2. Verify environment variables are set in Supabase dashboard
3. Check CORS settings allow your domain

### Issue: "Bootstrap configuration not found"

**Solution**: 
1. Ensure `config.json` exists in root directory
2. Check file permissions (should be readable)
3. Verify file contains only: `{"supabaseUrl": "https://eidsqrnwfndruuufyacc.supabase.co"}`

### Issue: Old project reference still appearing

**Solution**: 
1. Clear browser cache and localStorage
2. Check all HTML files load updated JavaScript files
3. Verify no caching headers preventing updates

## Environment Variables Required

### In Supabase Edge Function (via Dashboard or CLI)
```bash
SUPABASE_URL=https://eidsqrnwfndruuufyacc.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### In cPanel .env file (Keep Secure)
```bash
# Supabase Configuration
SUPABASE_URL=https://eidsqrnwfndruuufyacc.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Other sensitive config...
JWT_SECRET=...
ENCRYPTION_KEY=...
# etc.
```

## Final Verification

Run this test in browser console:

```javascript
// Should fetch from Edge Function successfully
fetch('https://eidsqrnwfndruuufyacc.supabase.co/functions/v1/get-config')
  .then(r => r.json())
  .then(config => {
    console.log('✅ Config loaded:', config);
    console.log('Project URL:', config.supabaseUrl);
    console.log('Has anon key:', !!config.supabaseAnonKey);
  })
  .catch(err => console.error('❌ Failed:', err));
```

Expected output:
```
✅ Config loaded: {supabaseUrl: "https://eidsqrnwfndruuufyacc.supabase.co", supabaseAnonKey: "eyJ..."}
Project URL: https://eidsqrnwfndruuufyacc.supabase.co
Has anon key: true
```

## Summary

✅ **Before**: Credentials hardcoded, old project reference in code
✅ **After**: Credentials loaded securely from Edge Function, no hardcoded values
✅ **Security**: .env protected, Edge Function secured by CORS, RLS protects database
✅ **Deployment**: Upload to cPanel, deploy Edge Function, test configuration

---

**Need Help?**
- Supabase Dashboard: https://supabase.com/dashboard/project/eidsqrnwfndruuufyacc
- Edge Functions: https://supabase.com/dashboard/project/eidsqrnwfndruuufyacc/functions
- RLS Policies: https://supabase.com/dashboard/project/eidsqrnwfndruuufyacc/auth/policies
