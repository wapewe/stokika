# Fix: Supabase Integrity Hash Error

## Problem
```
Failed to find a valid digest in the 'integrity' attribute for resource 
'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2' with computed SHA-384 
integrity 'dl/4LkSyQ4uEucc48NM6VDZLAjLLq9yMzZ5JLXumBq7Ld33XBof73hseOqPhO89+'. 
The resource has been blocked.
```

This error occurs because:
1. **Service Worker is serving cached HTML** with old integrity hashes
2. The CDN updated `@supabase/supabase-js@2` but the integrity hash in cached files doesn't match
3. This blocks Supabase from loading, causing cascade failures:
   - ❌ "Supabase library not loaded"
   - ❌ "Failed to initialize Supabase"
   - ❌ Form submissions fail
   - ❌ Database operations fail

## Solution: Clear Service Worker Cache

### Option 1: Use the Cache Cleaner Tool (Recommended)

1. **Navigate to the cache cleaner:**
   ```
   http://localhost:8000/clear-cache.html
   ```

2. **Click "Clear All Caches & Reload"**
   - This will unregister all service workers
   - Delete all cached files
   - Clear localStorage and sessionStorage
   - Reload the page automatically

3. **Verify the fix** by checking the console - you should no longer see integrity errors

### Option 2: Manual Browser Cache Clear

1. **Open Developer Tools** (F12)
2. **Go to Application tab** (Chrome/Edge) or **Storage tab** (Firefox)
3. **Service Workers section:**
   - Unregister all service workers
4. **Cache Storage section:**
   - Delete all caches (usually named like 'stokika-static-v1', 'stokika-dynamic-v1')
5. **Storage section:**
   - Clear localStorage
   - Clear sessionStorage
6. **Hard reload:** Ctrl+Shift+R or Ctrl+F5

### Option 3: Chrome DevTools Service Worker Override

1. **Open DevTools** → **Application** → **Service Workers**
2. Check **"Update on reload"**
3. Check **"Bypass for network"**
4. Reload the page (Ctrl+R)

## Root Cause: Why This Happened

The HTML files in your repository already have the fix (no integrity attributes), but:

1. **Service Worker cached the old versions** when they had bad integrity hashes
2. Even though you updated the HTML files, the service worker serves the old cached versions
3. The browser never fetches the new HTML files from the server

## Files Already Fixed (No Changes Needed)

These files correctly load Supabase **without integrity attributes**:
- ✅ `supervisor-onboarding.html` (line 347)
- ✅ `jobs.html` (line 132)
- ✅ `kit-payment.html` (line 67)
- ✅ `dalana.html` (line 46)
- ✅ Many others

## Prevention: Update Service Worker Version

To force cache updates in the future, update the service worker version:

**File:** `service-worker.js`

```javascript
// Change this:
const CACHE_VERSION = 'v1';

// To:
const CACHE_VERSION = 'v2';
```

This forces the service worker to invalidate old caches and fetch fresh files.

## Verification Steps

After clearing the cache, check the console:

### ✅ Success looks like:
```
✅ CSRF Protection initialized (JWT mode - minimal protection needed)
✅ Protected 1 forms with CSRF (legacy compatibility mode)
Input sanitization initialized for supervisor form
Loading config from Supabase Edge Function...
```

### ❌ Still broken looks like:
```
Failed to find a valid digest in the 'integrity' attribute...
Supabase library not loaded
Failed to initialize Supabase
```

## Alternative: Disable Service Worker (Development Only)

If you want to disable the service worker entirely during development:

**File:** `js/service-worker-register.js`

Comment out or remove the registration:

```javascript
// if ('serviceWorker' in navigator) {
//     navigator.serviceWorker.register('/service-worker.js')
// }
```

Then clear cache one final time.

## Files Affected

The integrity error can occur on any page that loads Supabase via CDN with an integrity check. These pages are already fixed in the source code but may need cache clearing:

- supervisor-onboarding.html
- jobs.html  
- kit-payment.html
- field-agent.html
- dalana.html
- vendor-dashboard.html
- inventory.html
- orders.html
- payments.html
- And many more...

## Summary

**The source files are already correct.** You just need to clear the service worker cache so the browser stops serving the old cached versions with bad integrity hashes.

**Quickest fix:** Go to `http://localhost:8000/clear-cache.html` and click the button.
