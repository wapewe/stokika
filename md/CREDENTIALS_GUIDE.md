# Credentials Management Guide

## Important: Client-Side vs Server-Side

### ⚠️ Understanding .env Files

**.env files are SERVER-SIDE ONLY** and cannot be read by client-side JavaScript in the browser.

### Current Setup (Static Site)

Since Stokika is a **static website** (no Node.js backend), credentials are handled as follows:

#### 1. Supabase Anon Key (SAFE to expose)
- **Location:** `js/setup.js`
- **Why it's safe:** Protected by Row Level Security (RLS) policies
- **Purpose:** Allows client-side database access with RLS restrictions

```javascript
// js/setup.js
window.SUPABASE_URL = 'https://iuvlwpkehrnyxaoxznuk.supabase.co';
window.SUPABASE_ANON_KEY = 'eyJhbGci...'; // Safe to expose
```

#### 2. Service Role Key (NEVER expose)
- **Location:** `.env` file (server-side only)
- **Why it's dangerous:** Bypasses ALL security policies
- **Usage:** Only for backend operations (Edge Functions, server scripts)

---

## Credential Locations

### Client-Side (Browser)
✅ **Safe to include:**
- `SUPABASE_URL` - Public URL
- `SUPABASE_ANON_KEY` - RLS-protected key

📍 **Files:**
- `js/setup.js` - Contains anon key
- `js/config-loader.js` - Loads configuration

### Server-Side Only
❌ **NEVER expose in client code:**
- `SUPABASE_SERVICE_ROLE_KEY` - Full database access
- `JWT_SECRET` - Token signing
- `ENCRYPTION_KEY` - Data encryption
- `SMTP_PASS` - Email password
- `MPESA_CONSUMER_SECRET` - Payment secrets

📍 **Files:**
- `.env` - Server-side environment variables
- `.env.example` - Template (no real values)

---

## How It Works

### Current Architecture (Static Site)

```
Browser (Client)
    ↓
js/setup.js (has anon key)
    ↓
Supabase Client Library
    ↓
Supabase API (RLS enforced)
    ↓
Database (secure)
```

### What .env is Used For

The `.env` file contains credentials for:

1. **Supabase Edge Functions** (server-side)
   - Deployed to Supabase
   - Run on Supabase servers
   - Can use SERVICE_ROLE_KEY safely

2. **Backend Scripts** (if you add Node.js later)
   - Email sending
   - M-Pesa integration
   - Admin operations

3. **Development Reference**
   - Keep all credentials in one place
   - Easy to update

---

## Admin Login Fix

### The Issue
Admin login was failing because `initSupabase()` wasn't being called before the credentials were set.

### The Fix
Updated `js/setup.js` to set credentials immediately:

```javascript
// OLD (async, caused timing issues)
(async function() {
    const config = await window.ConfigLoader.loadConfig();
    window.SUPABASE_URL = config.supabaseUrl;
    window.SUPABASE_ANON_KEY = config.supabaseAnonKey;
})();

// NEW (immediate, works reliably)
window.SUPABASE_URL = 'https://iuvlwpkehrnyxaoxznuk.supabase.co';
window.SUPABASE_ANON_KEY = 'eyJhbGci...';
```

---

## Security Best Practices

### ✅ DO:
1. Keep `.env` in `.gitignore` (already done)
2. Use anon key for client-side operations
3. Rely on RLS policies for security
4. Use Edge Functions for sensitive operations
5. Keep service role key server-side only

### ❌ DON'T:
1. Put service role key in client code
2. Commit `.env` to version control
3. Share `.env` file publicly
4. Use service role key in browser

---

## Adding Backend Operations

If you need server-side operations (email, M-Pesa, etc.):

### Option 1: Supabase Edge Functions (Recommended)
```typescript
// config/edge-functions/send-email.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  const SMTP_PASS = Deno.env.get('SMTP_PASS') // From .env
  // Send email securely
})
```

Deploy:
```bash
supabase functions deploy send-email --env-file .env
```

### Option 2: Node.js Backend
Create separate backend server:
```javascript
// server.js
require('dotenv').config(); // Reads .env
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
```

---

## Current Status

### ✅ Working:
- Admin login (uses anon key + RLS)
- User authentication
- Database operations
- All dashboards

### 📝 Requires Backend (Future):
- Email sending (SMTP credentials)
- M-Pesa payments (API secrets)
- SMS notifications
- Advanced admin operations

---

## Quick Reference

| Credential | Location | Safe for Client? | Purpose |
|------------|----------|------------------|---------|
| SUPABASE_URL | js/setup.js | ✅ Yes | Public API endpoint |
| SUPABASE_ANON_KEY | js/setup.js | ✅ Yes | RLS-protected access |
| SUPABASE_SERVICE_ROLE_KEY | .env only | ❌ NO | Full database access |
| JWT_SECRET | .env only | ❌ NO | Token signing |
| SMTP_PASS | .env only | ❌ NO | Email password |
| MPESA_SECRET | .env only | ❌ NO | Payment API |

---

## Testing Admin Login

1. Open `html/admin-login.html`
2. Enter admin credentials
3. Should redirect to `html/admin.html`

If it fails:
- Check browser console for errors
- Verify `window.SUPABASE_URL` is set
- Verify `window.SUPABASE_ANON_KEY` is set
- Check Supabase RLS policies

---

## Summary

- ✅ `.env` file is correct (keep it safe)
- ✅ `.env.example` created (template for others)
- ✅ Anon key in `js/setup.js` (safe and working)
- ✅ Admin login fixed
- ✅ All credentials properly separated

**Your setup is secure and production-ready!**
