# 🚨 DEPLOY BACKEND NOW - 5 Minutes

## Current Risk
Your Supabase credentials are exposed in client code. Anyone can:
- Copy your keys
- Use them on their project
- Run up your bill to $1000s/month

## Quick Fix (Choose ONE)

### ✅ Option 1: Supabase Edge Function (EASIEST - 5 min)

```bash
# 1. Install Supabase CLI
npm install -g supabase

# 2. Login
supabase login

# 3. Link your project
supabase link --project-ref iuvlwpkehrnyxaoxznuk

# 4. Deploy function
supabase functions deploy get-config

# 5. Update config-loader.js line 13:
# Change: 'https://your-backend-api.vercel.app/api/config'
# To: 'https://iuvlwpkehrnyxaoxznuk.supabase.co/functions/v1/get-config'

# Done! Credentials now secure.
```

### ✅ Option 2: Vercel (FREE - 10 min)

```bash
# 1. Install Vercel
npm install -g vercel

# 2. Deploy
cd server
vercel

# 3. Add environment variables
vercel env add SUPABASE_URL
# Paste: https://iuvlwpkehrnyxaoxznuk.supabase.co

vercel env add SUPABASE_ANON_KEY
# Paste your anon key from .env

# 4. Redeploy
vercel --prod

# 5. Update config-loader.js with your Vercel URL
```

### ✅ Option 3: Netlify (FREE - 10 min)

```bash
# 1. Install Netlify CLI
npm install -g netlify-cli

# 2. Login
netlify login

# 3. Deploy
netlify deploy --prod

# 4. Add environment variables in Netlify dashboard
# 5. Update config-loader.js with your Netlify URL
```

---

## After Deployment

1. **Remove credentials from setup.js** ✅ (Already done)
2. **Update config-loader.js** with your backend URL
3. **Test admin login**
4. **Verify credentials not in client code**

---

## Verification

Open browser console on your site:
```javascript
// Should be null until loaded from backend
console.log(window.SUPABASE_URL);
console.log(window.SUPABASE_ANON_KEY);
```

View page source - credentials should NOT be visible.

---

## Cost

All options: **$0/month** (free tier)

---

## Recommended

**Use Supabase Edge Functions** - Easiest, most secure, already integrated.

Deploy command:
```bash
supabase functions deploy get-config
```

That's it! 🎉
