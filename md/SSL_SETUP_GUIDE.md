# SSL Certificate Setup Guide for Stokika

## Overview
This guide will help you configure SSL certificates for your Stokika deployment to ensure secure HTTPS connections.

## Option 1: cPanel AutoSSL (Recommended for Shared Hosting)

### Step 1: Enable AutoSSL in cPanel
1. Login to your cPanel account
2. Navigate to **SSL/TLS Status** in the Security section
3. Click **Run AutoSSL** for your domain
4. Wait 5-10 minutes for certificate generation
5. Verify the certificate shows as "SSL Certificate Installed"

### Step 2: Force HTTPS Redirect
Add this to your `.htaccess` file:
```apache
# Force HTTPS
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Security Headers
Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
Header always set X-Content-Type-Options "nosniff"
Header always set X-Frame-Options "SAMEORIGIN"
Header always set X-XSS-Protection "1; mode=block"
Header always set Referrer-Policy "strict-origin-when-cross-origin"
Header always set Permissions-Policy "geolocation=(), microphone=(), camera=()"

# Content Security Policy
Header always set Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://*.supabase.co; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co https://api.ipify.org; frame-ancestors 'none';"
```

### Step 3: Update Supabase Configuration
Update your Supabase project settings:
1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Set Site URL to: `https://yourdomain.com`
3. Add Redirect URLs:
   - `https://yourdomain.com/html/signin.html`
   - `https://yourdomain.com/html/admin.html`
   - `https://yourdomain.com/html/agent.html`
   - `https://yourdomain.com/html/supplier.html`
   - `https://yourdomain.com/html/supervisor.html`
   - `https://yourdomain.com/html/inventory.html`

## Option 2: Let's Encrypt (For VPS/Dedicated Servers)

### Prerequisites
- Root access to your server
- Domain pointing to your server
- Certbot installed

### Step 1: Install Certbot
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install certbot python3-certbot-apache

# CentOS/RHEL
sudo yum install certbot python3-certbot-apache
```

### Step 2: Generate Certificate
```bash
# For Apache
sudo certbot --apache -d yourdomain.com -d www.yourdomain.com

# For Nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### Step 3: Auto-renewal Setup
```bash
# Test renewal
sudo certbot renew --dry-run

# Add to crontab for auto-renewal
sudo crontab -e
# Add this line:
0 12 * * * /usr/bin/certbot renew --quiet
```

## Option 3: Cloudflare SSL (Free Option)

### Step 1: Add Domain to Cloudflare
1. Sign up at cloudflare.com
2. Add your domain
3. Update nameservers at your domain registrar

### Step 2: Configure SSL Settings
1. Go to SSL/TLS → Overview
2. Set encryption mode to "Full (strict)"
3. Enable "Always Use HTTPS"
4. Enable "HTTP Strict Transport Security (HSTS)"

### Step 3: Configure Security Settings
1. Go to Security → WAF
2. Enable Web Application Firewall
3. Set Security Level to "Medium" or "High"
4. Enable Bot Fight Mode

## Verification Steps

### 1. Test SSL Certificate
```bash
# Command line test
curl -I https://yourdomain.com

# Online tools
# Visit: https://www.ssllabs.com/ssltest/
# Enter your domain and run the test
```

### 2. Check Security Headers
```bash
# Test security headers
curl -I https://yourdomain.com

# Online tool
# Visit: https://securityheaders.com
# Enter your domain for analysis
```

### 3. Verify HTTPS Redirect
```bash
# Test HTTP to HTTPS redirect
curl -I http://yourdomain.com
# Should return 301 redirect to HTTPS
```

## Enhanced Security Configuration

### 1. Update .htaccess with Advanced Security
```apache
# Enhanced Security Headers
Header always set Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
Header always set X-Content-Type-Options "nosniff"
Header always set X-Frame-Options "DENY"
Header always set X-XSS-Protection "1; mode=block"
Header always set Referrer-Policy "strict-origin-when-cross-origin"
Header always set Permissions-Policy "geolocation=(), microphone=(), camera=(), payment=(), usb=()"

# Content Security Policy (Enhanced)
Header always set Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://*.supabase.co; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co https://api.ipify.org; frame-ancestors 'none'; base-uri 'self'; form-action 'self';"

# Prevent access to sensitive files
<FilesMatch "\.(env|sql|md|log|bak)$">
    Order Allow,Deny
    Deny from all
</FilesMatch>

# Prevent directory browsing
Options -Indexes

# Protect against clickjacking
Header always append X-Frame-Options DENY

# Enable OCSP Stapling (if supported)
SSLUseStapling on
SSLStaplingCache "shmcb:logs/stapling-cache(150000)"
```

### 2. Create security.txt File
Create `/well-known/security.txt`:
```
Contact: security@stokika.com
Expires: 2025-12-31T23:59:59.000Z
Encryption: https://yourdomain.com/pgp-key.txt
Preferred-Languages: en
Canonical: https://yourdomain.com/.well-known/security.txt
Policy: https://yourdomain.com/security-policy
```

## Monitoring and Maintenance

### 1. Certificate Monitoring
```bash
# Check certificate expiry
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com 2>/dev/null | openssl x509 -noout -dates

# Set up monitoring script
#!/bin/bash
DOMAIN="yourdomain.com"
EXPIRY_DATE=$(echo | openssl s_client -servername $DOMAIN -connect $DOMAIN:443 2>/dev/null | openssl x509 -noout -enddate | cut -d= -f2)
EXPIRY_EPOCH=$(date -d "$EXPIRY_DATE" +%s)
CURRENT_EPOCH=$(date +%s)
DAYS_UNTIL_EXPIRY=$(( ($EXPIRY_EPOCH - $CURRENT_EPOCH) / 86400 ))

if [ $DAYS_UNTIL_EXPIRY -lt 30 ]; then
    echo "SSL certificate for $DOMAIN expires in $DAYS_UNTIL_EXPIRY days!"
    # Send alert email or notification
fi
```

### 2. Security Scanning
```bash
# Regular security scans
nmap --script ssl-enum-ciphers -p 443 yourdomain.com
testssl.sh yourdomain.com
```

## Troubleshooting Common Issues

### 1. Mixed Content Errors
- Ensure all resources (CSS, JS, images) use HTTPS URLs
- Update any hardcoded HTTP links to HTTPS
- Check browser console for mixed content warnings

### 2. Certificate Chain Issues
```bash
# Check certificate chain
openssl s_client -connect yourdomain.com:443 -showcerts
```

### 3. HSTS Issues
- Clear browser HSTS cache if needed
- Chrome: chrome://net-internals/#hsts
- Firefox: Clear site data in developer tools

### 4. Cloudflare SSL Issues
- Ensure SSL mode is "Full (strict)" not "Flexible"
- Check origin certificate is valid
- Verify DNS records are proxied (orange cloud)

## Performance Optimization

### 1. Enable HTTP/2
```apache
# Apache (if mod_http2 is available)
LoadModule http2_module modules/mod_http2.so
Protocols h2 http/1.1
```

### 2. Enable Compression
```apache
# Enable Gzip compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/plain
    AddOutputFilterByType DEFLATE text/html
    AddOutputFilterByType DEFLATE text/xml
    AddOutputFilterByType DEFLATE text/css
    AddOutputFilterByType DEFLATE application/xml
    AddOutputFilterByType DEFLATE application/xhtml+xml
    AddOutputFilterByType DEFLATE application/rss+xml
    AddOutputFilterByType DEFLATE application/javascript
    AddOutputFilterByType DEFLATE application/x-javascript
</IfModule>
```

### 3. Browser Caching
```apache
# Browser caching
<IfModule mod_expires.c>
    ExpiresActive on
    ExpiresByType text/css "access plus 1 year"
    ExpiresByType application/javascript "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/jpg "access plus 1 year"
    ExpiresByType image/jpeg "access plus 1 year"
    ExpiresByType image/gif "access plus 1 year"
    ExpiresByType image/svg+xml "access plus 1 year"
</IfModule>
```

## Final Checklist

- [ ] SSL certificate installed and valid
- [ ] HTTPS redirect working
- [ ] Security headers configured
- [ ] Mixed content issues resolved
- [ ] Supabase URLs updated to HTTPS
- [ ] All authentication redirects use HTTPS
- [ ] SSL Labs test shows A+ rating
- [ ] Security headers test passes
- [ ] Certificate auto-renewal configured
- [ ] Monitoring alerts set up
- [ ] Performance optimizations applied

## Support Resources

### SSL Certificate Providers
- **Let's Encrypt**: Free, automated certificates
- **Cloudflare**: Free SSL with CDN
- **cPanel AutoSSL**: Included with most hosting

### Testing Tools
- **SSL Labs**: https://www.ssllabs.com/ssltest/
- **Security Headers**: https://securityheaders.com/
- **Mozilla Observatory**: https://observatory.mozilla.org/

### Documentation
- **Let's Encrypt**: https://letsencrypt.org/docs/
- **Cloudflare SSL**: https://developers.cloudflare.com/ssl/
- **Mozilla SSL Config**: https://ssl-config.mozilla.org/

## Emergency Contacts

If you encounter issues:
1. **Hosting Provider Support**: Contact your hosting provider
2. **Domain Registrar**: For DNS/nameserver issues
3. **Cloudflare Support**: If using Cloudflare
4. **Let's Encrypt Community**: https://community.letsencrypt.org/

Remember to test thoroughly after implementing SSL to ensure all functionality works correctly with HTTPS.