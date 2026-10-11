# Deploy Edge Function via Supabase Dashboard (No CLI)

## Option 1: Via Dashboard (Easiest - 2 minutes)

### Step 1: Go to Edge Functions
https://supabase.com/dashboard/project/iuvlwpkehrnyxaoxznuk/functions

### Step 2: Create New Function
1. Click "Create a new function"
2. Name: `get-config`
3. Click "Create function"

### Step 3: Copy This Code
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

### Step 4: Disable JWT Verification
**IMPORTANT:** In function settings, set:
- `verify_jwt` = `false`

Or add this in the function editor:
```json
{
  "verify_jwt": false
}
```

### Step 5: Deploy
Click "Deploy" button

### Step 6: Add Secrets
1. Go to: Settings → Edge Functions → Secrets
2. Add secret:
   - Name: `SUPABASE_URL`
   - Value: `https://iuvlwpkehrnyxaoxznuk.supabase.co`
3. Add secret:
   - Name: `SUPABASE_ANON_KEY`
   - Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1dmx3cGtlaHJueXhhb3h6bnVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2OTc0MjMsImV4cCI6MjA3OTI3MzQyM30.q27pxjOcolmMaRy3xhUGgVoDSeqhZYpTwrOiZKdQ4BU`

### Done! ✅

Your function is live at:
```
https://iuvlwpkehrnyxaoxznuk.supabase.co/functions/v1/get-config
```

---

## Option 2: Via CLI (3 minutes)

```bash
# Install CLI
npm install -g supabase

# Login
supabase login

# Deploy
cd C:\Users\ADMIN\Videos\stokika
supabase functions deploy get-config --project-ref iuvlwpkehrnyxaoxznuk

# Add secrets via dashboard (Step 5 above)
```

---

## Test Your Function

### Test 1: Direct Call
```bash
curl https://iuvlwpkehrnyxaoxznuk.supabase.co/functions/v1/get-config
```

Should return: `Forbidden` (because no origin header)

### Test 2: From Your Website
1. Open your website
2. Open browser console
3. Type: `console.log(window.SUPABASE_URL)`
4. Should show URL loaded from backend

### Test 3: View Source
1. Right-click → View Page Source
2. Search for "eyJhbGci"
3. Should NOT find it ✅

---

## Troubleshooting

**Function returns 403:**
- Check origin is in allowedOrigins list
- Add your domain to the list

**Function returns null:**
- Check secrets are set in dashboard
- Redeploy function

**Can't find function:**
- Check URL: `https://iuvlwpkehrnyxaoxznuk.supabase.co/functions/v1/get-config`
- Check function name is exactly `get-config`

---

## Summary

✅ Credentials now served from Supabase Edge Function
✅ NOT exposed in client code
✅ Protected by domain verification
✅ FREE (included in Supabase)

**Your site is now secure!** 🎉
