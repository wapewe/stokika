# 🚀 Quick Start - Production Deployment

Fast deployment guide for experienced users.

---

## Files Created for You

✅ `.user.ini` - PHP configuration (upload to public_html/)  
✅ `private/load-env.php` - Your secrets (upload to /home/youruser/private/)  
✅ `SETUP_CHECKLIST.md` - Detailed step-by-step guide

---

## 3-Minute Setup

### 1. Edit Files (Local)

**Edit `.user.ini`:**
```ini
# Replace 'youruser' with your cPanel username
auto_prepend_file = "/home/YOURUSERNAME/private/load-env.php"
```

**Edit `private/load-env.php`:**
- Replace `SUPABASE_SERVICE_ROLE_KEY` (line 30)
- Generate and set 4 secrets (lines 40-49)
- Set M-Pesa production credentials (lines 56-60)
- Set Gmail app password (line 69)
- Add your IP to whitelist (line 78)

### 2. Upload Files (cPanel)

```
/home/youruser/
├── public_html/
│   ├── .user.ini           ← Upload here (644)
│   └── [all your files]    ← Upload all project files
└── private/
    └── load-env.php        ← Upload here (600)
```

### 3. Set Permissions

```
.user.ini         → 644
load-env.php      → 600
```

### 4. Wait & Test

- ⏰ Wait 10 minutes for PHP reload
- 🧪 Test: Create `test-config.php` (see SETUP_CHECKLIST.md)
- ✅ Verify variables load
- 🗑️ Delete test file immediately

---

## Generate Secrets Quickly

```bash
# Run these 4 commands locally:
openssl rand -base64 48  # JWT_SECRET
openssl rand -base64 24  # ENCRYPTION_KEY
openssl rand -base64 48  # SESSION_SECRET
openssl rand -base64 32  # REQUEST_SIGNING_KEY
```

Or use: https://www.random.org/strings/ (64 chars, alphanumeric)

---

## File Structure

```
Current directory:
├── .user.ini                    ✅ Upload to public_html/
├── private/
│   └── load-env.php             ✅ Upload to /home/youruser/private/
├── SETUP_CHECKLIST.md           📖 Detailed guide
├── HOSTPINNACLE_SETUP_GUIDE.md  📖 Full instructions
└── [all other project files]    ✅ Upload to public_html/
```

---

## Quick Verification

```bash
# 1. Variables should load
curl https://stokika.com/test-config.php

# 2. Config endpoint should work
curl https://stokika.com/api/config.php

# 3. Private file NOT accessible
curl https://stokika.com/../private/load-env.php
# Should: 403/404

# 4. HTTPS enforced
curl -I http://stokika.com
# Should: 301 redirect
```

---

## Troubleshooting Quick Fixes

| Issue | Fix |
|-------|-----|
| Variables not loading | Check username in `.user.ini` path |
| 500 error | Check PHP syntax in `load-env.php` |
| Still not working after 10 min | Verify file location: `/home/youruser/private/` |
| Permission denied | Set `load-env.php` to 600, `.user.ini` to 644 |

---

## What's Configured

✅ Supabase credentials  
✅ Security secrets (JWT, encryption, session)  
✅ M-Pesa production mode  
✅ Email (SMTP)  
✅ Rate limiting  
✅ Session security  
✅ Admin IP whitelist  

---

## Next: Full Guide

For detailed instructions with screenshots and troubleshooting:

📖 **SETUP_CHECKLIST.md** - Step-by-step with explanations  
📖 **HOSTPINNACLE_SETUP_GUIDE.md** - Complete deployment guide  
📖 **SECURE_DEPLOYMENT_GUIDE.md** - Security best practices

---

**Ready?** Start with Step 1 above or read `SETUP_CHECKLIST.md` for details.
