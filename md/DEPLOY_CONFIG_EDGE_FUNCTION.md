# Deploy Config Edge Function

## Critical: Deploy the updated Edge Function to fix CORS errors

### Step 1: Deploy via Supabase CLI

```bash
# Login to Supabase
supabase login

# Link your project
supabase link --project-ref iuvlwpkehrnyxaoxznuk

# Deploy the get-config function
supabase functions deploy get-config
```

### Step 2: Set Environment Variables in Supabase Dashboard

1. Go to: https://supabase.com/dashboard/project/iuvlwpkehrnyxaoxznuk/settings/functions
2. Click on "get-config" function
3. Add these environment variables:
   - `SUPABASE_URL`: https://iuvlwpkehrnyxaoxznuk.supabase.co
   - `SUPABASE_ANON_KEY`: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1dmx3cGtlaHJueXhhb3h6bnVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2OTc0MjMsImV4cCI6MjA3OTI3MzQyM30.q27pxjOcolmMaRy3xhUGgVoDSeqhZYpTwrOiZKdQ4BU

### Step 3: Test the Function

```bash
curl https://iuvlwpkehrnyxaoxznuk.supabase.co/functions/v1/get-config
```

Expected response:
```json
{
  "supabaseUrl": "https://iuvlwpkehrnyxaoxznuk.supabase.co",
  "supabaseAnonKey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Step 4: Clear Browser Cache

After deployment:
1. Open your website
2. Press F12 to open DevTools
3. Right-click the refresh button
4. Select "Empty Cache and Hard Reload"
5. Unregister the old service worker:
   - Go to Application tab > Service Workers
   - Click "Unregister"
   - Refresh the page

## What Was Fixed

1. **CORS Policy**: Changed from wildcard `*` to specific origin with credentials support
2. **Service Worker**: Excluded API calls from caching and disabled for file:// protocol
3. **Config Loader**: Added fallback for local development (file:// protocol)
4. **Credentials**: Moved from client-side to server-side Edge Function
5. **Local Development**: Added automatic detection and fallback for testing

## Security Notes

- The `.env` file is already in `.gitignore` - DO NOT commit it
- Only SUPABASE_URL and SUPABASE_ANON_KEY are exposed (these are safe for client-side)
- Service role key and other secrets remain server-side only
- Local fallback uses only public credentials (ANON key)

## Local Development

For local testing, run a local server instead of opening files directly:

```bash
# Python 3
python -m http.server 8000

# Then open http://localhost:8000
```

See `LOCAL_DEVELOPMENT_SETUP.md` for more options.
