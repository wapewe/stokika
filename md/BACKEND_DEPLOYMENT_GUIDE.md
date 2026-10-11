# Backend API Deployment Guide

## Why You Need This

**Problem:** Exposing Supabase credentials in client code allows anyone to:
- Use your API keys on their projects
- Run up your Supabase bill
- Abuse your rate limits
- Access your database (even with RLS)

**Solution:** Backend API that serves credentials only to your domain.

---

## Quick Deploy Options

### Option 1: Vercel (Recommended - FREE)

1. **Install Vercel CLI:**
```bash
npm install -g vercel
```

2. **Deploy:**
```bash
cd server
vercel
```

3. **Add Environment Variables:**
```bash
vercel env add SUPABASE_URL
vercel env add SUPABASE_ANON_KEY
```

4. **Update config-loader.js:**
```javascript
const apiUrl = 'https://your-project.vercel.app/api/config';
```

### Option 2: Netlify Functions (FREE)

1. **Create `netlify/functions/config.js`:**
```javascript
exports.handler = async (event) => {
    const referer = event.headers.referer;
    if (!referer?.includes('stokika.com')) {
        return { statusCode: 403, body: 'Forbidden' };
    }
    
    return {
        statusCode: 200,
        body: JSON.stringify({
            supabaseUrl: process.env.SUPABASE_URL,
            supabaseAnonKey: process.env.SUPABASE_ANON_KEY
        })
    };
};
```

2. **Deploy:**
```bash
netlify deploy --prod
```

### Option 3: Railway (FREE tier)

1. **Push to GitHub**
2. **Connect Railway to repo**
3. **Add environment variables**
4. **Deploy automatically**

---

## Better Solution: Supabase Edge Functions (BEST)

**Advantages:**
- No separate backend needed
- Built into Supabase
- Free tier included
- Automatic scaling

### Setup:

1. **Create `supabase/functions/get-config/index.ts`:**
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
    const origin = req.headers.get('origin');
    
    if (!origin?.includes('stokika.com') && !origin?.includes('localhost')) {
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
                'Access-Control-Allow-Origin': origin
            }
        }
    );
});
```

2. **Deploy:**
```bash
supabase functions deploy get-config
```

3. **Update config-loader.js:**
```javascript
const apiUrl = 'https://iuvlwpkehrnyxaoxznuk.supabase.co/functions/v1/get-config';
```

---

## Additional Security Layers

### 1. Domain Verification
```javascript
// In backend
const allowedDomains = ['stokika.com', 'www.stokika.com'];
const referer = req.get('Referer');
if (!allowedDomains.some(d => referer?.includes(d))) {
    return res.status(403).json({ error: 'Forbidden' });
}
```

### 2. Rate Limiting (Already in server/config-api.js)
- 100 requests per 15 minutes per IP
- Prevents abuse

### 3. Supabase RLS Policies
Even with credentials, users can only:
- Read public data
- Insert their own data
- Update their own data

### 4. API Key Rotation
Rotate your anon key monthly:
1. Generate new key in Supabase
2. Update backend .env
3. Redeploy
4. Old key expires

---

## Cost Comparison

| Solution | Cost | Setup Time | Security |
|----------|------|------------|----------|
| Exposed in client | $0 | 0 min | ❌ Low |
| Vercel | $0 | 10 min | ✅ High |
| Netlify | $0 | 10 min | ✅ High |
| Railway | $0-5/mo | 15 min | ✅ High |
| Supabase Edge | $0 | 5 min | ✅✅ Highest |

---

## Recommended: Supabase Edge Functions

**Why:**
1. No separate backend to maintain
2. Same infrastructure as your database
3. Automatic scaling
4. Built-in security
5. Free tier generous

**Deploy Now:**
```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref iuvlwpkehrnyxaoxznuk

# Deploy function
supabase functions deploy get-config
```

---

## Current Status

### ⚠️ Temporary (Development Only)
Your credentials are currently in `js/setup.js` for development.

### ✅ Production Ready
Deploy backend API before going live.

---

## Quick Start (5 Minutes)

1. **Choose Supabase Edge Functions**
2. **Create function file** (see above)
3. **Deploy:** `supabase functions deploy get-config`
4. **Update config-loader.js** with function URL
5. **Done!** Credentials now secure

---

## Summary

- ❌ **Don't:** Expose credentials in client code
- ✅ **Do:** Use backend API or Edge Functions
- 🎯 **Best:** Supabase Edge Functions (easiest + most secure)
- 💰 **Cost:** $0 with free tier
- ⏱️ **Time:** 5-10 minutes setup

**Deploy backend before production launch!**
