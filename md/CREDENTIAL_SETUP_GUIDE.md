# Credential Setup Guide

## 🔑 **SMTP EMAIL CONFIGURATION**

### **Option 1: Gmail (Recommended)**
```bash
1. Go to: https://myaccount.google.com/security
2. Enable 2-Step Verification
3. Go to: App passwords
4. Select "Mail" and generate password
5. Use generated 16-character password

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=generated-app-password
```

### **Option 2: SendGrid (Professional)**
```bash
1. Sign up at: https://sendgrid.com
2. Create API key in Settings → API Keys
3. Verify sender identity

SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-api-key
```

### **Option 3: Mailgun**
```bash
1. Sign up at: https://mailgun.com
2. Add and verify domain
3. Get SMTP credentials from dashboard

SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@your-domain.mailgun.org
SMTP_PASS=your-mailgun-password
```

## 🔐 **SECURITY KEYS GENERATION**

### **Method 1: OpenSSL (Linux/Mac)**
```bash
# JWT Secret (32 characters minimum)
openssl rand -hex 32

# Encryption Key (exactly 32 characters)
openssl rand -hex 16

# Session Secret (32+ characters)
openssl rand -base64 32
```

### **Method 2: Node.js**
```javascript
// Run in Node.js console
const crypto = require('crypto');

// JWT Secret
console.log('JWT_SECRET=' + crypto.randomBytes(32).toString('hex'));

// Encryption Key
console.log('ENCRYPTION_KEY=' + crypto.randomBytes(16).toString('hex'));

// Session Secret
console.log('SESSION_SECRET=' + crypto.randomBytes(32).toString('base64'));
```

### **Method 3: Online Generator**
```bash
Visit: https://generate-secret.vercel.app/32
Or: https://www.allkeysgenerator.com/Random/Security-Encryption-Key-Generator.aspx

Generate 3 different keys:
- 64 character hex for JWT_SECRET
- 32 character hex for ENCRYPTION_KEY  
- 44 character base64 for SESSION_SECRET
```

### **Method 4: Manual Generation**
```bash
# Use any password generator with these requirements:
JWT_SECRET: 64+ characters, alphanumeric
ENCRYPTION_KEY: exactly 32 characters, hex (0-9, a-f)
SESSION_SECRET: 32+ characters, any characters
```

## 📱 **M-PESA INTEGRATION SETUP**

### **Step 1: Safaricom Developer Account**
```bash
1. Visit: https://developer.safaricom.co.ke
2. Click "Sign Up" → Create account
3. Verify email and complete profile
4. Login to developer portal
```

### **Step 2: Create Daraja App**
```bash
1. Go to "My Apps" → "Create App"
2. App Name: "Stokika Payment System"
3. Select APIs:
   - Lipa Na M-Pesa Online
   - M-Pesa Express (STK Push)
4. Submit application
```

### **Step 3: Get Sandbox Credentials**
```bash
After app approval, you'll get:

MPESA_CONSUMER_KEY=your_consumer_key_here
MPESA_CONSUMER_SECRET=your_consumer_secret_here

# Sandbox Test Credentials
MPESA_SHORTCODE=174379
MPESA_PASSKEY=bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919
MPESA_ENVIRONMENT=sandbox
```

### **Step 4: Production Credentials**
```bash
# After testing, apply for production:
1. Go to "Go Live" in developer portal
2. Submit business documents
3. Wait for approval (2-5 business days)
4. Get production credentials

MPESA_ENVIRONMENT=production
MPESA_SHORTCODE=your_business_shortcode
MPESA_PASSKEY=your_production_passkey
```

### **Step 5: Callback URL Setup**
```bash
# Your callback URL must be HTTPS and publicly accessible
MPESA_CALLBACK_URL=https://yourdomain.com/api/mpesa/callback

# Test callback URL (for development)
# Use ngrok or similar service:
ngrok http 3000
# Then use: https://abc123.ngrok.io/api/mpesa/callback
```

## 🌐 **SUPABASE CREDENTIALS**

### **Step 1: Create Supabase Project**
```bash
1. Go to: https://supabase.com
2. Sign up/Login
3. Click "New Project"
4. Choose organization
5. Enter project details:
   - Name: Stokika Production
   - Database Password: (generate strong password)
   - Region: Europe (closest to Kenya)
```

### **Step 2: Get API Credentials**
```bash
1. Go to Project Settings → API
2. Copy the following:

SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-public-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### **Step 3: Configure Authentication**
```bash
1. Go to Authentication → Settings
2. Site URL: https://yourdomain.com
3. Redirect URLs:
   - https://yourdomain.com/html/signin.html
   - https://yourdomain.com/html/admin.html
   - https://yourdomain.com/html/agent.html
   - https://yourdomain.com/html/supplier.html
   - https://yourdomain.com/html/supervisor.html
   - https://yourdomain.com/html/inventory.html
```

## 📋 **COMPLETE .env TEMPLATE**

```env
# Supabase Configuration
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Security Configuration (Generate these)
JWT_SECRET=a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456
ENCRYPTION_KEY=1234567890abcdef1234567890abcdef
SESSION_SECRET=YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXoxMjM0NTY3ODkw

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@yourdomain.com
SMTP_PASS=your-16-char-app-password
FROM_EMAIL=noreply@yourdomain.com

# M-Pesa Configuration (Sandbox)
MPESA_CONSUMER_KEY=your_consumer_key_from_daraja
MPESA_CONSUMER_SECRET=your_consumer_secret_from_daraja
MPESA_SHORTCODE=174379
MPESA_PASSKEY=bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919
MPESA_CALLBACK_URL=https://yourdomain.com/api/mpesa/callback
MPESA_ENVIRONMENT=sandbox

# Rate Limiting
MAX_LOGIN_ATTEMPTS=5
RATE_LIMIT_WINDOW=15
OTP_EXPIRY_MINUTES=10

# Production Settings
NODE_ENV=production
DOMAIN=https://yourdomain.com
```

## ⚠️ **SECURITY WARNINGS**

### **Never Commit Credentials**
```bash
# Add to .gitignore
.env
.env.local
.env.production
config/credentials.js
```

### **Environment-Specific Files**
```bash
# Development
.env.development

# Staging  
.env.staging

# Production
.env.production
```

### **Credential Rotation**
```bash
# Rotate credentials every 90 days:
1. Generate new keys
2. Update .env file
3. Restart application
4. Revoke old credentials
```

## 🔍 **TESTING CREDENTIALS**

### **Test SMTP**
```bash
# Use online SMTP tester or send test email
curl -X POST https://yourdomain.com/api/test-email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

### **Test M-Pesa (Sandbox)**
```bash
# Test phone numbers for sandbox:
254708374149 - Success
254711XXXXXX - Insufficient funds
254732XXXXXX - Invalid account
```

### **Test Supabase**
```bash
# Test connection in browser console:
const { createClient } = supabase;
const client = createClient('your-url', 'your-anon-key');
client.from('users').select('count').then(console.log);
```

## 📞 **SUPPORT CONTACTS**

### **Safaricom M-Pesa**
- Email: apisupport@safaricom.co.ke
- Phone: +254 722 000 000
- Portal: https://developer.safaricom.co.ke

### **Supabase**
- Email: support@supabase.io
- Discord: https://discord.supabase.com
- Docs: https://supabase.com/docs

### **Email Providers**
- Gmail: https://support.google.com
- SendGrid: https://support.sendgrid.com
- Mailgun: https://help.mailgun.com