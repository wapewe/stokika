# Fix 401 "Missing authorization header" Error

## The Problem
Edge Functions require JWT auth by default. Your function needs to be public.

## The Fix

### Option 1: Via Dashboard (Easiest)

1. **Go to your function:**
   https://supabase.com/dashboard/project/iuvlwpkehrnyxaoxznuk/functions

2. **Click on `get-config` function**

3. **Go to Settings tab**

4. **Find "Require JWT verification"**

5. **Toggle it OFF** (disable)

6. **Save changes**

### Option 2: Add config.json

In function editor, create `config.json`:
```json
{
  "verify_jwt": false
}
```

### Option 3: Via CLI

```bash
# In supabase/config.toml, add:
[functions.get-config]
verify_jwt = false

# Then redeploy:
supabase functions deploy get-config --project-ref iuvlwpkehrnyxaoxznuk --no-verify-jwt
```

---

## Updated Function Code

Use this code (includes CORS preflight):

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            }
        });
    }

    const origin = req.headers.get('origin');
    
    const allowedOrigins = [
        'https://stokika.com',
        'https://www.stokika.com',
        'http://localhost:5500',
        'http://127.0.0.1:5500'
    ];
    
    if (!allowedOrigins.some(allowed => origin?.includes(allowed))) {
        return new Response('Forbidden', { status: 403 });
    }

    return new Response(
        JSON.stringify({
            supabaseUrl: Deno.env.get('SUPABASE_URL'),
            supabaseAnonKey: Deno.env.get('SUPABASE_ANON_KEY')
        }),
        {
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': origin || '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            }
        }
    );
});
```

---

## Test After Fix

```bash
curl https://iuvlwpkehrnyxaoxznuk.supabase.co/functions/v1/get-config
```

**Should return:** `Forbidden` (not 401)

From your website console:
```javascript
fetch('https://iuvlwpkehrnyxaoxznuk.supabase.co/functions/v1/get-config')
  .then(r => r.json())
  .then(console.log)
```

**Should return:** `{supabaseUrl: "...", supabaseAnonKey: "..."}`

---

## Summary

✅ Disable JWT verification in function settings
✅ Update function code with CORS preflight
✅ Redeploy function
✅ Test - should work without 401 error

**This makes the function public but protected by domain check.**
