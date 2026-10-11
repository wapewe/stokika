# 🎯 FINAL DEPLOYMENT CHECKLIST - stokika.com
**Date:** 2026-08-26 15:22:58  
**Status:** Ready for secure production deployment

---

## ✅ COMPLETED ENHANCEMENTS

### 1. Payment Status Display (NEW)
- ✅ Payment Phone number displayed
- ✅ M-Pesa receipt code displayed
- ✅ Phone match indicator (✅ same / ⚠️ different)
- ✅ All copyable with one click
- ✅ Real-time updates when payment status changes

### 2. Secure Configuration System
- ✅ config.php reads from environment variables ONLY
- ✅ No hardcoded credentials in production
- ✅ .htaccess protects .env file
- ✅ Security headers enabled

### 3. M-Pesa Production Mode
- ✅ Shortcode: 1140839 (production)
- ✅ Edge Functions support production/sandbox switching
- ✅ Environment variable: MPESA_ENVIRONMENT=production

---

## 📦 UPLOAD TO CPANEL: /public_html/

### ✅ Root Files
\\\
/public_html/
├── .htaccess                      ← IMPORTANT: Upload first!
├── index.html
├── admin.html
├── vendor-dashboard.html
├── field-agent-dashboard.html
├── supervisor-dashboard.html
├── vendor-registration.html
├── supplier-registration.html
├── field-agent-registration.html
└── supervisor-registration.html
\\\

### ✅ Folders to Upload (Complete)
\\\
/public_html/
├── api/
│   └── config.php                 ← Secure endpoint
├── css/                           ← Upload entire folder
│   ├── styles.css
│   ├── admin.css
│   ├── pagination.css
│   └── ...all other CSS files
├── js/                            ← Upload entire folder
│   ├── config-loader.js
│   ├── supabase-config.js
│   ├── admin.js
│   ├── mpesa-admin-dashboard.js
│   └── ...all other JS files
└── assets/                        ← Upload entire folder
    └── logos/
        └── ...all images
\\\

---

## ❌ NEVER UPLOAD TO CPANEL

### 🚨 CRITICAL - These expose secrets!
- ❌ **.env** ← Contains all passwords and API keys!
- ❌ **sql/** folder ← Database scripts (run in Supabase)
- ❌ **config/** folder ← Contains SQL files
- ❌ **supabase/** folder ← Edge functions (deploy separately)

### 🗑️ Development Files
- ❌ **.git/** folder
- ❌ **.gitignore**
- ❌ **.kiro/** folder
- ❌ **node_modules/**
- ❌ **package.json, package-lock.json**
- ❌ **Any .md files** (documentation)
- ❌ **html/** folder (backups)
- ❌ **Any .bak files**

---

## 🗄️ RUN IN SUPABASE (Not cPanel!)

### SQL Files Location
**From:** \c:\Users\ADMIN\Music\stokika\config\  
**Run in:** https://supabase.com/dashboard/project/iuvlwpkehrnyxaoxznuk/sql

### Execution Order (Copy & Paste in SQL Editor)

**Phase 1: Core Tables**
1. unified-database-schema_v2.sql
2. stokika-kit-payment-schema.sql
3. mpesa-schema-update.sql
4. onboarding-steps-schema_v2.sql
5. admin-settings-schema.sql

**Phase 2: Advanced Features**
6. comprehensive-onboarding-schema.sql
7. advanced-features-schema.sql
8. gps-analytics-schema.sql
9. supplier-product-management-schema.sql
10. vendor-product-management-schema.sql
11. vendor-shop-branding-dropship-schema.sql
12. agent-affiliate-system.sql

**Phase 3: Security Policies**
13. admin-rls-fixed.sql
14. newsletter-policy.sql
15. contact-form-policy.sql

---

## 🔐 ENVIRONMENT VARIABLES (MANDATORY)

### Set in cPanel: Select PHP Version → Options → Environment Variables

\\\plaintext
SUPABASE_URL = https://iuvlwpkehrnyxaoxznuk.supabase.co
SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1dmx3cGtlaHJueXhhb3h6bnVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2OTc0MjMsImV4cCI6MjA3OTI3MzQyM30.q27pxjOcolmMaRy3xhUGgVoDSeqhZYpTwrOiZKdQ4BU
\\\

### Set in Supabase: Settings → Edge Functions → Secrets

\\\plaintext
MPESA_CONSUMER_KEY = KaGGFIuheWWB0nQChjjcgJAKLZFyMe2yugWTXk1quo5GQgyP
MPESA_CONSUMER_SECRET = 3fUfkDOoHx2lZN57H8PI9wTehik9LI3LgGMZMn9rM6dtH9XfMhPAiyTVZjxS0GZ8
MPESA_SHORTCODE = 1140839
MPESA_PASSKEY = 3b59425e14b40f802645ad3ab067c351d9886c845719ca30441286c66b785b2d
MPESA_ENVIRONMENT = production
MPESA_CALLBACK_URL = https://iuvlwpkehrnyxaoxznuk.supabase.co/functions/v1/mpesa-callback
\\\

---

## 💳 M-PESA PRODUCTION SETTINGS

### ✅ Configuration
- **Shortcode:** 1140839 (PRODUCTION - Not sandbox 174379)
- **Environment:** production
- **Callback URL:** Supabase Edge Function

### 🚀 Deployment Steps

1. **Set environment variables in Supabase:**
   - Dashboard → Settings → Edge Functions → Secrets
   - Add all MPESA_* variables above
   - Set MPESA_ENVIRONMENT = production

2. **Deploy Edge Functions:**
   \\\ash
   cd c:\Users\ADMIN\Music\stokika
   npx supabase functions deploy mpesa-stk-push
   npx supabase functions deploy mpesa-callback
   npx supabase functions deploy mpesa-status-query
   \\\

3. **Update Safaricom Portal:**
   - Log into https://developer.safaricom.co.ke
   - Go to your production app (shortcode 1140839)
   - Set callback URL: https://iuvlwpkehrnyxaoxznuk.supabase.co/functions/v1/mpesa-callback

---

## 🚀 DEPLOYMENT SEQUENCE (Step-by-Step)

### Step 1: cPanel Environment Variables ⚙️
1. Log into HostPinnacle cPanel
2. Software → Select PHP Version
3. Click Options tab
4. Add SUPABASE_URL and SUPABASE_ANON_KEY
5. Click Save

### Step 2: Upload Files to cPanel 📤
1. File Manager → /public_html/
2. Upload **.htaccess** first (protects site)
3. Create **api/** folder
4. Upload **api/config.php**
5. Upload all **.html files**
6. Upload **css/** folder (complete)
7. Upload **js/** folder (complete)
8. Upload **assets/** folder (complete)

### Step 3: Enable HTTPS 🔒
1. cPanel → Security → SSL/TLS Status
2. Click Run AutoSSL
3. Wait for certificate (instant)
4. Verify: https://www.stokika.com (should load)

### Step 4: Configure Supabase 🗄️
1. Go to Supabase Dashboard
2. Settings → API → Copy anon key
3. Authentication → URL Configuration
4. Set Site URL: https://www.stokika.com
5. Add Redirect URLs: https://www.stokika.com/*

### Step 5: Set M-Pesa Secrets in Supabase 💳
1. Settings → Edge Functions → Secrets
2. Add all MPESA_* variables
3. Set MPESA_ENVIRONMENT = production
4. Click Save

### Step 6: Run SQL Files in Supabase 📊
1. SQL Editor
2. Copy file contents from c:\Users\ADMIN\Music\stokika\config\
3. Paste and Run (in order from list above)
4. Verify tables created (Table Editor)

### Step 7: Deploy Edge Functions 🚀
\\\ash
npx supabase functions deploy mpesa-stk-push
npx supabase functions deploy mpesa-callback
npx supabase functions deploy mpesa-status-query
\\\

### Step 8: Test Everything ✅
1. Visit https://www.stokika.com
2. Test: https://www.stokika.com/.env (should be 403)
3. Admin login: https://www.stokika.com/admin.html
4. Test M-Pesa payment flow (production shortcode 1140839)
5. Check payment status tabs (Paid/Not Paid)
6. Verify real-time updates work

---

## 🛡️ SECURITY VERIFICATION

### ✅ Must Pass These Tests

| Test | Expected Result | Status |
|------|----------------|--------|
| https://www.stokika.com | Site loads | ⏳ |
| https://www.stokika.com/.env | 403 Forbidden | ⏳ |
| Browser Console | No errors | ⏳ |
| config.php reads env vars | Works | ⏳ |
| SSL certificate | Valid & trusted | ⏳ |
| Admin login | Works | ⏳ |
| M-Pesa payment | Works (prod mode) | ⏳ |
| Payment tabs | Show paid/not paid | ⏳ |
| Real-time updates | Works | ⏳ |
| Phone match indicator | Shows ✅ / ⚠️ | ⏳ |

---

## 📞 SUPPORT CONTACTS

- **HostPinnacle:** support@hostpinnacle.co.ke
- **Supabase:** https://supabase.com/dashboard/support
- **Safaricom M-Pesa:** https://developer.safaricom.co.ke/support

---

## 📖 DETAILED GUIDES

- **SECURE_DEPLOYMENT_GUIDE.md** ← Full security-focused guide
- **SQL_EXECUTION_ORDER.md** ← SQL files execution order
- **PAYMENT_STATUS_ENHANCEMENT_SUMMARY.md** ← Payment features docs

---

**✅ READY FOR PRODUCTION DEPLOYMENT**

All files prepared | Security hardened | M-Pesa production mode configured
