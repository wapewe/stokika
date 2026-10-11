# ⚡ Action Items - Do These NOW Before Upload

**Time Required:** 10 minutes  
**Status:** Must complete before deployment

---

## 1️⃣ Edit .user.ini (1 minute)

**File:** `.user.ini`  
**Line to change:** Line 10

**Current:**
```ini
auto_prepend_file = "/home/youruser/private/load-env.php"
```

**Change to:**
```ini
auto_prepend_file = "/home/YOUR_ACTUAL_USERNAME/private/load-env.php"
```

**How to find your username:**
- Login to cPanel
- Open File Manager
- Look at the path: `/home/USERNAME/public_html`
- Use that USERNAME

**Example:**
- If path shows: `/home/stokika123/public_html`
- Then use: `/home/stokika123/private/load-env.php`

---

## 2️⃣ Complete private/load-env.php (9 minutes)

**File:** `private/load-env.php`

✅ **Good news:** Most values already populated from your .env file!

### Required Changes:

#### A. Supabase Service Role Key (Line 34)

**Current:**
```php
$_ENV['SUPABASE_SERVICE_ROLE_KEY'] = 'your-service-role-key-here-NEVER-EXPOSE-TO-CLIENT';
```

**Where to get it:**
1. Go to: https://app.supabase.com
2. Select your project
3. Click **Settings** (gear icon)
4. Click **API**
5. Find **service_role** key (NOT anon key)
6. Copy the long string starting with `eyJ...`

**Change to:**
```php
$_ENV['SUPABASE_SERVICE_ROLE_KEY'] = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // Your actual key
```

---

#### B. Request Signing Key (Line 48)

**Current:**
```php
$_ENV['REQUEST_SIGNING_KEY'] = 'your-request-signing-key-here';
```

**Generate new key:**

**Option 1 - On your computer:**
```bash
openssl rand -base64 32
```

**Option 2 - Online:**
- Visit: https://www.random.org/strings/
- Set: 1 string, 32 characters, alphanumeric
- Click: Get Strings
- Copy result

**Change to:**
```php
$_ENV['REQUEST_SIGNING_KEY'] = 'abc123def456...'; // Paste generated key
```

---

#### C. M-Pesa Production Credentials (Lines 57-60)

⚠️ **IMPORTANT:** Only complete if you have production credentials from Safaricom.

**If you have them:**

```php
$_ENV['MPESA_CONSUMER_KEY'] = 'your-actual-production-key';
$_ENV['MPESA_CONSUMER_SECRET'] = 'your-actual-production-secret';
$_ENV['MPESA_SHORTCODE'] = '123456'; // Your actual shortcode
$_ENV['MPESA_PASSKEY'] = 'your-actual-production-passkey';
```

**If you DON'T have them yet:**
- Leave as placeholder for now
- You can update later via cPanel File Manager
- Application will work without M-Pesa initially

---

#### D. Gmail App Password (Line 72)

**Current:**
```php
$_ENV['SMTP_PASS'] = 'your-smtp-password-here-use-app-specific-password';
```

**Generate App Password:**
1. Go to: https://myaccount.google.com/apppasswords
2. Login to Gmail account: noreply@stokika.com
3. Click: **Select app** → Choose "Mail"
4. Click: **Select device** → Choose "Other" → Type "Stokika"
5. Click: **Generate**
6. Copy the 16-character password (no spaces)

**Change to:**
```php
$_ENV['SMTP_PASS'] = 'abcd efgh ijkl mnop'; // Your 16-char app password
```

---

#### E. Admin IP Whitelist (Line 80)

**Current:**
```php
$_ENV['ADMIN_IP_WHITELIST'] = '127.0.0.1,::1';  // Add your IP here
```

**Find your IP:**
1. Visit: https://whatismyipaddress.com/
2. Copy your IPv4 address (e.g., 196.201.214.136)

**Change to:**
```php
$_ENV['ADMIN_IP_WHITELIST'] = '127.0.0.1,::1,196.201.214.136';  // Your actual IP
```

---

## ✅ Quick Verification

After making changes, verify:

### .user.ini
- [ ] Line 10 has YOUR username (not 'youruser')
- [ ] Path looks like: `/home/ACTUAL_USERNAME/private/load-env.php`

### private/load-env.php
- [ ] Line 34: Supabase Service Role Key (starts with eyJ)
- [ ] Line 48: Request Signing Key (random string)
- [ ] Line 72: Gmail App Password (16 characters) OR marked TODO
- [ ] Line 80: Your IP address added
- [ ] Lines 57-60: M-Pesa credentials OR marked TODO

---

## 📝 What Can Wait

These can be updated AFTER initial upload if needed:

### Optional (can add later):
- M-Pesa production credentials (if still in approval process)
- Additional admin IP addresses
- Adjusted rate limits

### Do NOT wait on:
- Supabase Service Role Key (required for admin functions)
- Gmail App Password (required for emails)
- Your username in .user.ini (required for file to work)

---

## 🎯 Quick Summary

**Must Complete NOW:**
1. ✅ Update .user.ini with your username
2. ✅ Add Supabase Service Role Key
3. ✅ Generate REQUEST_SIGNING_KEY
4. ✅ Add Gmail App Password
5. ✅ Add your IP to whitelist

**Can Complete LATER (but recommended now):**
6. ⏰ M-Pesa production credentials (if available)

**Time:** ~10 minutes total

---

## ⏭️ After Completing

Once all changes saved:

1. ✅ Double-check both files
2. ✅ Save changes
3. 📖 Open `COMPLETE_UPLOAD_PLAN.md`
4. 🚀 Follow upload procedure

---

**Status Tracker:**

- [ ] .user.ini username updated
- [ ] Supabase Service Role Key added
- [ ] REQUEST_SIGNING_KEY generated
- [ ] Gmail App Password added
- [ ] IP whitelist updated
- [ ] M-Pesa credentials added (or marked TODO)

**When all checked:** You're ready to upload! 🎉

---

**Next:** See `COMPLETE_UPLOAD_PLAN.md` for detailed upload instructions
