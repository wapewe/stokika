# Local Development Setup

## Problem
Opening HTML files directly (file:// protocol) causes issues:
- Service Worker cannot register
- CORS errors with Edge Functions
- Some browser features disabled

## Solution: Run a Local Server

### Option 1: Python (Recommended - Easiest)

**If you have Python 3:**
```bash
cd C:\Users\ADMIN\Videos\stokika
python -m http.server 8000
```

**If you have Python 2:**
```bash
cd C:\Users\ADMIN\Videos\stokika
python -m SimpleHTTPServer 8000
```

Then open: http://localhost:8000

### Option 2: Node.js (http-server)

```bash
cd C:\Users\ADMIN\Videos\stokika
npx http-server -p 8000
```

Then open: http://localhost:8000

### Option 3: VS Code Live Server Extension

1. Install "Live Server" extension in VS Code
2. Right-click on `index.html`
3. Select "Open with Live Server"

### Option 4: PHP (if installed)

```bash
cd C:\Users\ADMIN\Videos\stokika
php -S localhost:8000
```

Then open: http://localhost:8000

## Current Fallback

The code now includes a fallback for local development:
- When running from `file://` protocol, it uses hardcoded Supabase credentials
- When running from a server (localhost or production), it fetches from Edge Function

## Production Deployment

For production on https://www.stokika.com:
1. Deploy Edge Function: `supabase functions deploy get-config`
2. Set environment variables in Supabase Dashboard
3. Upload files to your web server
4. Access via https://www.stokika.com

## Testing Admin Access

1. Start local server (any option above)
2. Navigate to http://localhost:8000/html/admin.html
3. Should redirect to login if not authenticated
4. Login with admin credentials
5. Should access dashboard if admin role

## Notes

- The fallback credentials are the ANON key (safe for public use)
- Service role key and other secrets are never exposed client-side
- For production, always use the Edge Function approach
