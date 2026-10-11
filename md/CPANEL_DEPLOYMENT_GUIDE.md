# cPanel Shared Hosting Deployment Guide

## ⚠️ IMPORTANT: Node.js Limitation on Shared Hosting

**Most shared hosting providers (including cPanel) DO NOT support Node.js applications.** The server we created requires Node.js runtime which is typically only available on:
- VPS hosting
- Dedicated servers  
- Cloud platforms (AWS, DigitalOcean, Heroku)

## 🔄 SOLUTION: Frontend-Only Deployment with Supabase

Since you're using cPanel shared hosting, we'll deploy a **secure frontend-only version** that uses Supabase directly but with enhanced security.

## 📁 File Structure for cPanel

```
public_html/
├── index.html
├── html/
│   ├── signin.html
│   ├── admin.html
│   ├── inventory.html
│   └── (all other HTML files)
├── css/
│   └── (all CSS files)
├── js/
│   └── (all JS files)
├── assets/
│   └── (images, logos)
├── .well-known/
│   └── security.txt
└── .htaccess
```

## 🚀 Step-by-Step Deployment

### Step 1: Upload Files to cPanel
1. **Login to cPanel**
2. **Open File Manager**
3. **Navigate to public_html/**
4. **Upload these folders/files**:
   - `html/` folder → `public_html/html/`
   - `css/` folder → `public_html/css/`
   - `js/` folder → `public_html/js/`
   - `assets/` folder → `public_html/assets/`
   - `index.html` → `public_html/index.html`
   - `.well-known/` folder → `public_html/.well-known/`

### Step 2: Create .htaccess File
Create `public_html/.htaccess`:
```apache
# Security Headers
Header always set X-Frame-Options "DENY"
Header always set X-Content-Type-Options "nosniff"
Header always set Referrer-Policy "strict-origin-when-cross-origin"
Header always set X-XSS-Protection "1; mode=block"

# Force HTTPS
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Hide sensitive files
<Files ".env">
    Order allow,deny
    Deny from all
</Files>

# Custom error pages
ErrorDocument 404 /404.html
ErrorDocument 500 /500.html
```

## 🔑 Credentials Setup

### 1. Supabase Setup
**Go to**: https://supabase.com
1. **Create account** → New project
2. **Project Settings** → API
3. **Copy these values**:
   - Project URL: `https://xxx.supabase.co`
   - Anon public key: `eyJhbGc...`
   - Service role key: `eyJhbGc...` (keep secret)

### 2. Gmail SMTP Setup
**Go to**: https://myaccount.google.com
1. **Security** → 2-Step Verification (enable)
2. **App passwords** → Generate password
3. **Use values**:
   - SMTP_HOST: `smtp.gmail.com`
   - SMTP_PORT: `587`
   - SMTP_USER: `your-email@gmail.com`
   - SMTP_PASS: `generated-app-password`

### 3. M-Pesa Setup (Optional)
**Go to**: https://developer.safaricom.co.ke
1. **Create account** → New app
2. **Get credentials**:
   - Consumer Key
   - Consumer Secret
   - Shortcode: `174379` (sandbox)

### 4. Generate Security Keys
**Run in browser console**:
```javascript
// JWT Secret (32 chars)
console.log(crypto.getRandomValues(new Uint8Array(32)).join(''));

// Encryption Key (32 chars)
console.log(Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join(''));
```

## 📝 Configuration Files

### Create: `public_html/config/config.js`
```javascript
window.CONFIG = {
    SUPABASE_URL: 'https://your-project.supabase.co',
    SUPABASE_ANON_KEY: 'your-anon-key-here',
    DOMAIN: 'https://yourdomain.com',
    SMTP_CONFIG: {
        HOST: 'smtp.gmail.com',
        PORT: 587,
        USER: 'your-email@gmail.com'
    }
};
```

### Update: `public_html/js/enhanced-auth.js`
```javascript
// Replace the loadConfig function
async loadConfig() {
    if (window.CONFIG) {
        window.SUPABASE_URL = window.CONFIG.SUPABASE_URL;
        window.SUPABASE_ANON_KEY = window.CONFIG.SUPABASE_ANON_KEY;
    }
}
```

## 🗄️ Database Setup

### 1. Run SQL in Supabase
1. **Go to Supabase Dashboard**
2. **SQL Editor** → New query
3. **Copy and run**: `config/unified-database-schema.sql`

### 2. Create Admin User
```sql
INSERT INTO users (email, name, role, password_hash, status) 
VALUES (
    'admin@stokika.com', 
    'Admin User', 
    'admin', 
    '$2a$12$encrypted-password-hash', 
    'active'
);
```

## 🔒 Security Configuration

### 1. Row Level Security (RLS)
**Already configured in schema**, but verify:
- Users can only see their own data
- Admins have full access
- Public forms can insert data

### 2. Environment Variables (Supabase)
**Go to**: Project Settings → Environment Variables
```
JWT_SECRET=your-jwt-secret
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

## 🌐 Domain Configuration

### 1. SSL Certificate
**In cPanel**:
1. **SSL/TLS** → Let's Encrypt
2. **Enable** for your domain
3. **Force HTTPS redirect**

### 2. DNS Configuration
**Point domain to cPanel**:
- A Record: `@` → Your server IP
- CNAME: `www` → Your domain

## 🧪 Testing Checklist

### 1. Basic Functionality
- [ ] Website loads at your domain
- [ ] HTTPS redirect works
- [ ] All pages accessible

### 2. Authentication
- [ ] Login form works
- [ ] OTP emails sent
- [ ] Admin can create users
- [ ] Sessions persist

### 3. Security
- [ ] No console errors
- [ ] HTTPS enforced
- [ ] Security headers present
- [ ] File uploads work

## 🚨 Alternative: VPS Hosting

**If you need full Node.js server**, consider:

### Recommended VPS Providers:
1. **DigitalOcean** - $5/month droplet
2. **Linode** - $5/month nanode
3. **Vultr** - $2.50/month instance
4. **AWS Lightsail** - $3.50/month

### VPS Deployment:
```bash
# SSH into VPS
ssh root@your-server-ip

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Upload and run server
cd /var/www
git clone your-repo
cd stokika/server
npm install
npm start
```

## 📞 Support

**If you need help**:
1. **cPanel Issues**: Contact your hosting provider
2. **Supabase Issues**: Check Supabase docs
3. **Code Issues**: Review browser console errors

**Most shared hosting works fine with the frontend-only approach using Supabase for backend operations.**