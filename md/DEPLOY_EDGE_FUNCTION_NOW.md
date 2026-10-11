# Deploy Edge Function - Required for Site to Work

## Your site WILL NOT WORK until you deploy the Edge Function.

### Step 1: Go to Supabase Dashboard
https://supabase.com/dashboard/project/iuvlwpkehrnyxaoxznuk/functions

### Step 2: Create Function
1. Click "Create a new function"
2. Name: `get-config`

### Step 3: Paste This Code
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
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
    const referer = req.headers.get('referer');
    
    const allowedDomains = [
        'stokika.com',
        'localhost',
        '127.0.0.1'
    ];
    
    const isAllowed = allowedDomains.some(domain => 
        origin?.includes(domain) || referer?.includes(domain)
    );
    
    if (!isAllowed && (origin || referer)) {
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

### Step 4: Disable JWT
In function settings: **Disable "Require JWT verification"**

### Step 5: Add Secrets
Settings → Edge Functions → Secrets:
- `SUPABASE_URL` = `https://iuvlwpkehrnyxaoxznuk.supabase.co`
- `SUPABASE_ANON_KEY` = (your anon key from .env)

### Step 6: Deploy
Click "Deploy"

### Step 7: Test
```bash
curl https://iuvlwpkehrnyxaoxznuk.supabase.co/functions/v1/get-config
```

Should return credentials JSON (not 401, not Forbidden).

## Your site will work after this is deployed.
