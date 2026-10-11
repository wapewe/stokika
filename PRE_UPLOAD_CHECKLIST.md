# ✅ Pre-Upload Checklist

Complete this checklist BEFORE uploading to production.

---

## 📋 Configuration Files

### .user.ini
- [ ] File exists in project root
- [ ] Path contains YOUR actual cPanel username (not `youruser`)
- [ ] Path format: `/home/YOURUSERNAME/private/load-env.php`
- [ ] File will be uploaded to `public_html/`

### private/load-env.php
- [ ] File exists in `private/` folder
- [ ] All placeholder values replaced (no `YOUR-` or `GENERATE-` text)
- [ ] Supabase Service Role Key set (line 30)
- [ ] JWT_SECRET generated and set (line 40)
- [ ] ENCRYPTION_KEY generated and set (line 43)
- [ ] SESSION_SECRET generated and set (line 46)
- [ ] REQUEST_SIGNING_KEY generated and set (line 49)
- [ ] M-Pesa Consumer Key set (line 56)
- [ ] M-Pesa Consumer Secret set (line 57)
- [ ] M-Pesa Shortcode set (line 58)
- [ ] M-Pesa Passkey set (line 59)
- [ ] M-Pesa Environment = `production` (line 61)
- [ ] SMTP Password set (line 69)
- [ ] Admin IP whitelist updated (line 78)

---

## 🔐 Credentials Gathered

### Supabase
- [ ] Service Role Key copied from dashboard
- [ ] Anon Key verified (already in file)
- [ ] Project URL verified (already in file)

### M-Pesa (Production)
- [ ] Consumer Key from Safaricom production
- [ ] Consumer Secret from Safaricom production
- [ ] Production Shortcode (Paybill number)
- [ ] Production Passkey from Safaricom
- [ ] Go-Live approval received from Safaricom
- [ ] Callback URL is accessible: `https://stokika.com/api/mpesa-callback`

### Email (Gmail)
- [ ] Gmail App Password generated
- [ ] Not using regular Gmail password
- [ ] App Password is 16 characters (no spaces)
- [ ] Email address verified: `noreply@stokika.com`

### Security
- [ ] 4 strong secrets generated (64, 32, 64, 32 chars)
- [ ] Secrets are random (not dictionary words)
- [ ] Different secret for each field
- [ ] Secrets saved in password manager for backup

---

## 🌐 Domain & Hosting

- [ ] Domain pointing to HostPinnacle servers
- [ ] SSL certificate installed in cPanel
- [ ] HTTPS working (visit https://stokika.com)
- [ ] cPanel username known
- [ ] cPanel login credentials available
- [ ] File Manager accessible

---

## 📁 Project Files Ready

- [ ] All HTML files updated with security scripts
- [ ] All JavaScript files uploaded (including fixed ones)
- [ ] `api/` folder ready with all PHP files
- [ ] `js/` folder ready with all scripts
- [ ] `css/` folder ready
- [ ] `.htaccess` file present
- [ ] `.gitignore` present (won't be uploaded, just for reference)
- [ ] No `.env` file in upload (using load-env.php instead)

---

## 🔍 Pre-Flight Checks

### Security Scripts in HTML
- [ ] Checked at least 3 HTML files
- [ ] All contain `<script src="js/xss-protection.js"></script>`
- [ ] All contain `<script src="js/secure-session.js"></script>`
- [ ] All contain `<script src="js/csrf-protection.js"></script>`
- [ ] Old `load-env.js` references removed

### API Files
- [ ] `api/config.php` exists
- [ ] `api/session.php` exists
- [ ] `api/session-manager.php` exists
- [ ] `api/csrf-validator.php` exists
- [ ] `api/cors-config.php` exists

### Security Files
- [ ] `js/xss-protection.js` exists
- [ ] `js/secure-session.js` exists
- [ ] `js/csrf-protection.js` exists
- [ ] `js/config-loader.js` exists (not load-env.js)

---

## 📝 Documentation Ready

- [ ] Read `SETUP_CHECKLIST.md`
- [ ] Read `QUICK_START.md`
- [ ] Understand file structure
- [ ] Know how to check PHP error logs
- [ ] Know how to set file permissions

---

## 🎯 Upload Plan

### Phase 1: Create Structure
1. [ ] Login to cPanel File Manager
2. [ ] Navigate to home directory (`/home/youruser/`)
3. [ ] Create `private/` folder (if doesn't exist)
4. [ ] Navigate to `public_html/`

### Phase 2: Upload Configuration
1. [ ] Upload `.user.ini` to `public_html/`
2. [ ] Upload `load-env.php` to `private/` folder
3. [ ] Set `.user.ini` permissions to 644
4. [ ] Set `load-env.php` permissions to 600

### Phase 3: Upload Application
1. [ ] Upload all HTML files
2. [ ] Upload `api/` folder
3. [ ] Upload `js/` folder
4. [ ] Upload `css/` folder
5. [ ] Upload `assets/` folder
6. [ ] Upload `.htaccess`
7. [ ] Verify all files uploaded

### Phase 4: Test
1. [ ] Wait 10 minutes
2. [ ] Create and run `test-config.php`
3. [ ] Test website functionality
4. [ ] Delete `test-config.php`

---

## ⚠️ STOP! Don't Upload If:

- ❌ Still have `YOUR-` or `GENERATE-` placeholders in load-env.php
- ❌ Using sandbox M-Pesa credentials
- ❌ Using regular Gmail password (not App Password)
- ❌ Haven't verified Supabase Service Role Key
- ❌ Haven't generated strong random secrets
- ❌ Don't know your cPanel username
- ❌ `.user.ini` still says `/home/youruser/` (not YOUR username)

**If any above are true:** Complete those steps first!

---

## ✅ Ready to Upload When:

- ✅ All placeholders replaced
- ✅ All credentials verified and correct
- ✅ Secrets generated and saved
- ✅ cPanel username known and in `.user.ini`
- ✅ Production M-Pesa credentials set
- ✅ Gmail App Password set
- ✅ Documentation read and understood
- ✅ Backup of configuration saved locally
- ✅ Can access cPanel File Manager
- ✅ Know how to check error logs

---

## 💾 Backup Reminder

Before uploading:

- [ ] Save `load-env.php` to password manager
- [ ] Backup all secrets separately
- [ ] Document M-Pesa credentials
- [ ] Save Supabase dashboard login

---

## 📞 Support Ready

Have these ready before upload:

- [ ] HostPinnacle support contact info
- [ ] Supabase dashboard access
- [ ] M-Pesa Safaricom support contact
- [ ] Gmail account access
- [ ] This checklist printed/open

---

## 🎉 Final Verification

I confirm that:

- [ ] All credentials are PRODUCTION (not sandbox/test)
- [ ] All secrets are STRONG and RANDOM
- [ ] All placeholders are REPLACED
- [ ] I have BACKUPS of all credentials
- [ ] I understand the UPLOAD PROCESS
- [ ] I'm ready to MONITOR after deployment
- [ ] I know how to ROLLBACK if needed

---

**Date:** _______________  
**Checked by:** _______________  
**Ready for production:** ⬜ YES  ⬜ NO

---

## Next Step

If all boxes checked:

👉 Proceed to `SETUP_CHECKLIST.md` Step 5 (Upload Files)

If not all checked:

👉 Complete remaining items before uploading
