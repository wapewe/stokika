# Final Deployment Steps

## Issue Fixed:
- ✅ config-loader.js now loads before setup.js
- ✅ Edge Function updated to check referer header

## Deploy Edge Function Now:

### Copy This Updated Code:

```typescript
// @ts-ignore
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

### Steps:
1. Go to: https://supabase.com/dashboard/project/iuvlwpkehrnyxaoxznuk/functions
2. Edit `get-config` function
3. Paste code above
4. **Settings → Disable JWT verification**
5. Deploy
6. Add secrets (SUPABASE_URL and SUPABASE_ANON_KEY)

### Test:
```bash
curl -H "Referer: https://stokika.com" https://iuvlwpkehrnyxaoxznuk.supabase.co/functions/v1/get-config
```

Should return credentials JSON.

## Your site will work once Edge Function is deployed!
