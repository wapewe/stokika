# Production Deployment Checklist

## ✅ Step 1: Deploy Edge Function

### Via Supabase Dashboard:
1. Go to: https://supabase.com/dashboard/project/iuvlwpkehrnyxaoxznuk/functions
2. Create function named `get-config`
3. Paste code from `supabase/functions/get-config/index.ts`
4. **CRITICAL:** Disable JWT verification in function settings
5. Deploy

### Add Secrets:
1. Go to: Settings → Edge Functions → Secrets
2. Add `SUPABASE_URL` = `https://iuvlwpkehrnyxaoxznuk.supabase.co`
3. Add `SUPABASE_ANON_KEY` = (your anon key)

## ✅ Step 2: Test Edge Function

```bash
curl https://iuvlwpkehrnyxaoxznuk.supabase.co/functions/v1/get-config
```

Should return: `Forbidden` (not 401)

## ✅ Step 3: Update Production Domain

Edit `supabase/functions/get-config/index.ts`:
```typescript
const allowedOrigins = [
    'https://stokika.com',
    'https://www.stokika.com'
];
```

Remove localhost entries for production.

## ✅ Step 4: Deploy Site

Upload all files to production server.

## ✅ Step 5: Test Production

1. Open https://stokika.com/html/admin-login.html
2. Should load credentials from Edge Function
3. Login should work

## ✅ Step 6: Verify Security

View page source - credentials should NOT be visible.

---

## If Edge Function Returns 401:

**Fix:** Disable JWT verification in Supabase Dashboard:
1. Functions → get-config → Settings
2. Toggle OFF "Require JWT verification"
3. Save

---

## Current Status:

- ✅ Hardcoded credentials removed
- ✅ Edge Function configured
- ⚠️ Must deploy Edge Function before site works
