# Deploy Supabase Edge Function - 3 Minutes

## Step 1: Install Supabase CLI

```bash
npm install -g supabase
```

## Step 2: Login to Supabase

```bash
supabase login
```

## Step 3: Deploy Function

```bash
cd C:\Users\ADMIN\Videos\stokika
supabase functions deploy get-config --project-ref iuvlwpkehrnyxaoxznuk
```

## Step 4: Set Secrets in Supabase Dashboard

1. Go to: https://supabase.com/dashboard/project/iuvlwpkehrnyxaoxznuk/settings/functions
2. Click "Edge Functions" → "Secrets"
3. Add:
   - `SUPABASE_URL` = `https://iuvlwpkehrnyxaoxznuk.supabase.co`
   - `SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1dmx3cGtlaHJueXhhb3h6bnVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2OTc0MjMsImV4cCI6MjA3OTI3MzQyM30.q27pxjOcolmMaRy3xhUGgVoDSeqhZYpTwrOiZKdQ4BU`

## Done! ✅

Function deployed to:
```
https://iuvlwpkehrnyxaoxznuk.supabase.co/functions/v1/get-config
```

## Test It

1. Test function directly:
```bash
curl https://iuvlwpkehrnyxaoxznuk.supabase.co/functions/v1/get-config
```

2. Open your website - credentials load from backend
3. View page source - credentials NOT visible ✅

## Alternative: Deploy via Supabase Dashboard

1. Go to: https://supabase.com/dashboard/project/iuvlwpkehrnyxaoxznuk/functions
2. Click "Create Function"
3. Name: `get-config`
4. Copy code from `supabase/functions/get-config/index.ts`
5. Deploy
6. Add secrets in Settings → Edge Functions → Secrets
