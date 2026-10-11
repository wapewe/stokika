# Test Edge Function

## Test 1: Check if function exists

Open browser and go to:
```
https://iuvlwpkehrnyxaoxznuk.supabase.co/functions/v1/get-config
```

**Expected:** Should see `Forbidden` (because no origin header)
**If you see 404:** Function not deployed yet

## Test 2: Check from your website

1. Open `admin-login.html` in browser
2. Open Developer Console (F12)
3. Type:
```javascript
fetch('https://iuvlwpkehrnyxaoxznuk.supabase.co/functions/v1/get-config')
  .then(r => r.json())
  .then(console.log)
```

**Expected:** Should see `{supabaseUrl: "...", supabaseAnonKey: "..."}`
**If Forbidden:** Add your domain to allowedOrigins in Edge Function

## Test 3: Check config loading

In browser console:
```javascript
console.log(window.SUPABASE_URL);
console.log(window.SUPABASE_ANON_KEY);
```

**Expected:** Should show URL and key after a moment
**If null:** Config not loading from Edge Function

## Quick Fix: Use Hardcoded (Temporary)

If Edge Function isn't working yet, temporarily use hardcoded:

**js/setup.js:**
```javascript
window.SUPABASE_URL = 'https://iuvlwpkehrnyxaoxznuk.supabase.co';
window.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1dmx3cGtlaHJueXhhb3h6bnVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2OTc0MjMsImV4cCI6MjA3OTI3MzQyM30.q27pxjOcolmMaRy3xhUGgVoDSeqhZYpTwrOiZKdQ4BU';
```

This will make admin login work immediately while you set up Edge Function properly.
