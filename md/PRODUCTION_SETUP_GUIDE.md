# Production Environment Setup Guide

## Overview
This guide covers the complete setup of Stokika for production deployment with enhanced security, monitoring, and performance optimizations.

## Pre-Deployment Checklist

### 1. Environment Configuration
- [ ] `.env` file configured with production credentials
- [ ] Supabase project set up with production database
- [ ] Domain name configured and pointing to server
- [ ] SSL certificate ready for installation
- [ ] Backup strategy planned

### 2. Security Requirements
- [ ] All security features implemented
- [ ] Rate limiting configured
- [ ] Input validation in place
- [ ] Security headers configured
- [ ] OTP system tested

## Step 1: Supabase Production Setup

### 1.1 Create Production Project
```bash
# 1. Go to https://supabase.com
# 2. Create new project
# 3. Choose production-grade instance
# 4. Select region closest to your users (Europe for Kenya/Africa)
# 5. Set strong database password
```

### 1.2 Configure Database
```sql
-- Run the unified database schema
-- Copy content from config/unified-database-schema.sql
-- Execute in Supabase SQL Editor

-- Verify all tables created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public';
```

### 1.3 Configure Authentication
```bash
# In Supabase Dashboard → Authentication → Settings

# Site URL
https://yourdomain.com

# Redirect URLs
https://yourdomain.com/html/signin.html
https://yourdomain.com/html/admin.html
https://yourdomain.com/html/agent.html
https://yourdomain.com/html/supplier.html
https://yourdomain.com/html/supervisor.html
https://yourdomain.com/html/inventory.html

# JWT Settings
JWT expiry: 3600 (1 hour)
Refresh token expiry: 604800 (7 days)

# Email Templates (customize as needed)
# Configure SMTP settings for production emails
```

### 1.4 Set Environment Variables
```bash
# Update .env file with production values
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-production-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Security Configuration
JWT_SECRET=your-production-jwt-secret-min-32-chars
ENCRYPTION_KEY=your-32-character-encryption-key-here
SESSION_SECRET=your-session-secret-min-32-chars

# Email Configuration (Production SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@yourdomain.com
SMTP_PASS=your-app-specific-password
FROM_EMAIL=noreply@yourdomain.com

# Rate Limiting
MAX_LOGIN_ATTEMPTS=5
RATE_LIMIT_WINDOW=15
OTP_EXPIRY_MINUTES=10

# Production Settings
NODE_ENV=production
DOMAIN=https://yourdomain.com
```

## Step 2: Server Configuration

### 2.1 cPanel Deployment
```bash
# 1. Create deployment package
zip -r stokika-production.zip . -x "*.git*" "node_modules/*" "*.md"

# 2. Upload to cPanel File Manager
# 3. Extract in public_html directory
# 4. Set proper permissions

# File permissions
find . -type f -name "*.html" -exec chmod 644 {} \;
find . -type f -name "*.css" -exec chmod 644 {} \;
find . -type f -name "*.js" -exec chmod 644 {} \;
find . -type f -name ".htaccess" -exec chmod 644 {} \;
find . -type f -name ".env" -exec chmod 600 {} \;

# Directory permissions
find . -type d -exec chmod 755 {} \;
```

### 2.2 Enhanced .htaccess Configuration
```apache
# Production .htaccess with enhanced security
RewriteEngine On

# Force HTTPS
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Security Headers
Header always set Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
Header always set X-Content-Type-Options "nosniff"
Header always set X-Frame-Options "DENY"
Header always set X-XSS-Protection "1; mode=block"
Header always set Referrer-Policy "strict-origin-when-cross-origin"
Header always set Permissions-Policy "geolocation=(), microphone=(), camera=(), payment=(), usb=()"

# Enhanced Content Security Policy
Header always set Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://*.supabase.co; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co https://api.ipify.org; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests;"

# Protect sensitive files
<FilesMatch "\.(env|sql|md|log|bak|config)$">
    Order Allow,Deny
    Deny from all
</FilesMatch>

# Prevent access to hidden files
<FilesMatch "^\.">
    Order Allow,Deny
    Deny from all
</FilesMatch>

# Prevent directory browsing
Options -Indexes

# Block suspicious requests
RewriteCond %{QUERY_STRING} (\<|%3C).*script.*(\>|%3E) [NC,OR]
RewriteCond %{QUERY_STRING} GLOBALS(=|\[|\%[0-9A-Z]{0,2}) [OR]
RewriteCond %{QUERY_STRING} _REQUEST(=|\[|\%[0-9A-Z]{0,2}) [OR]
RewriteCond %{QUERY_STRING} \.\./\.\. [OR]
RewriteCond %{QUERY_STRING} (localhost|loopback|127\.0\.0\.1) [NC,OR]
RewriteCond %{QUERY_STRING} (<|%3C)([^s]*s)+cript.*(>|%3E) [NC,OR]
RewriteCond %{QUERY_STRING} (<|%3C)([^e]*e)+mbed.*(>|%3E) [NC,OR]
RewriteCond %{QUERY_STRING} (<|%3C)([^o]*o)+bject.*(>|%3E) [NC,OR]
RewriteCond %{QUERY_STRING} (<|%3C)([^i]*i)+frame.*(>|%3E) [NC,OR]
RewriteCond %{QUERY_STRING} base64_encode.*\(.*\) [NC,OR]
RewriteCond %{QUERY_STRING} base64_(en|de)code[^(]*\([^)]*\) [NC,OR]
RewriteCond %{QUERY_STRING} GLOBALS(=|\[|\%[0-9A-Z]{0,2}) [OR]
RewriteCond %{QUERY_STRING} _REQUEST(=|\[|\%[0-9A-Z]{0,2})
RewriteRule ^(.*)$ - [F,L]

# Performance optimizations
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
    AddOutputFilterByType DEFLATE application/json
</IfModule>

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
    ExpiresByType image/webp "access plus 1 year"
    ExpiresByType font/woff "access plus 1 year"
    ExpiresByType font/woff2 "access plus 1 year"
</IfModule>

# Cache control
<IfModule mod_headers.c>
    <FilesMatch "\.(css|js|png|jpg|jpeg|gif|svg|webp|woff|woff2)$">
        Header set Cache-Control "public, max-age=31536000"
    </FilesMatch>
    <FilesMatch "\.(html|htm)$">
        Header set Cache-Control "public, max-age=3600"
    </FilesMatch>
</IfModule>
```

## Step 3: Security Implementation

### 3.1 Update Configuration Files
```javascript
// Update config/setup.js for production
window.SUPABASE_URL = 'https://your-project-ref.supabase.co';
window.SUPABASE_ANON_KEY = 'your-production-anon-key';

// Remove any development/debug code
// Ensure no console.log statements in production
```

### 3.2 Implement Server-Side Validation
```javascript
// Create config/server-validation.js
const validateRequest = (req, res, next) => {
    // Rate limiting check
    const clientIP = req.ip || req.connection.remoteAddress;
    
    // Input validation
    if (req.body) {
        for (const [key, value] of Object.entries(req.body)) {
            if (typeof value === 'string') {
                // Sanitize input
                req.body[key] = value
                    .trim()
                    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                    .replace(/javascript:/gi, '')
                    .replace(/on\w+\s*=/gi, '');
            }
        }
    }
    
    next();
};

module.exports = { validateRequest };
```

### 3.3 Enhanced Monitoring Setup
```javascript
// Create js/monitoring-system.js
class MonitoringSystem {
    constructor() {
        this.errors = [];
        this.performance = [];
        this.init();
    }

    init() {
        this.setupErrorTracking();
        this.setupPerformanceTracking();
        this.setupSecurityMonitoring();
    }

    setupErrorTracking() {
        window.addEventListener('error', (event) => {
            this.logError({
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                stack: event.error?.stack,
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                url: window.location.href
            });
        });

        window.addEventListener('unhandledrejection', (event) => {
            this.logError({
                message: 'Unhandled Promise Rejection',
                reason: event.reason,
                timestamp: new Date().toISOString(),
                url: window.location.href
            });
        });
    }

    setupPerformanceTracking() {
        // Track page load performance
        window.addEventListener('load', () => {
            setTimeout(() => {
                const perfData = performance.getEntriesByType('navigation')[0];
                this.logPerformance({
                    loadTime: perfData.loadEventEnd - perfData.loadEventStart,
                    domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
                    firstPaint: performance.getEntriesByType('paint')[0]?.startTime,
                    timestamp: new Date().toISOString(),
                    url: window.location.href
                });
            }, 1000);
        });
    }

    setupSecurityMonitoring() {
        // Monitor for suspicious activities
        let suspiciousAttempts = 0;
        
        document.addEventListener('keydown', (e) => {
            // Detect potential XSS attempts
            if (e.ctrlKey && e.shiftKey && e.key === 'I') {
                suspiciousAttempts++;
                if (suspiciousAttempts > 5) {
                    this.logSecurityEvent('Potential developer tools access');
                }
            }
        });

        // Monitor for console access
        let devtools = {open: false, orientation: null};
        setInterval(() => {
            if (window.outerHeight - window.innerHeight > 200 || 
                window.outerWidth - window.innerWidth > 200) {
                if (!devtools.open) {
                    devtools.open = true;
                    this.logSecurityEvent('Developer tools opened');
                }
            } else {
                devtools.open = false;
            }
        }, 500);
    }

    async logError(errorData) {
        try {
            // Send to monitoring service or log locally
            console.error('Application Error:', errorData);
            
            // In production, send to your monitoring service
            // await fetch('/api/log-error', {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify(errorData)
            // });
        } catch (e) {
            console.error('Failed to log error:', e);
        }
    }

    async logPerformance(perfData) {
        try {
            console.log('Performance Data:', perfData);
            
            // Send to analytics service
            // await fetch('/api/log-performance', {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify(perfData)
            // });
        } catch (e) {
            console.error('Failed to log performance:', e);
        }
    }

    async logSecurityEvent(event) {
        try {
            const securityData = {
                event,
                timestamp: new Date().toISOString(),
                url: window.location.href,
                userAgent: navigator.userAgent,
                userId: AuthManager?.currentUser?.id
            };
            
            console.warn('Security Event:', securityData);
            
            // Send to security monitoring
            // await fetch('/api/log-security', {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify(securityData)
            // });
        } catch (e) {
            console.error('Failed to log security event:', e);
        }
    }
}

// Initialize monitoring
window.MonitoringSystem = new MonitoringSystem();
```

## Step 4: Performance Optimization

### 4.1 Image Optimization
```bash
# Optimize images before deployment
# Use tools like ImageOptim, TinyPNG, or command line tools

# WebP conversion for better performance
cwebp input.jpg -q 80 -o output.webp

# Responsive images
convert input.jpg -resize 800x600 output-800.jpg
convert input.jpg -resize 400x300 output-400.jpg
convert input.jpg -resize 200x150 output-200.jpg
```

### 4.2 Code Minification
```javascript
// Minify CSS and JS files for production
// Use tools like UglifyJS, Terser, or online minifiers

// Example minified CSS (use build tools in real projects)
/* Minified styles.css */
.btn{padding:8px 16px;border:none;border-radius:4px;cursor:pointer}
.btn-primary{background:#007bff;color:white}
```

### 4.3 CDN Configuration
```html
<!-- Use CDN for external libraries -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
```

## Step 5: Monitoring and Logging

### 5.1 Health Check Endpoint
```javascript
// Create health-check.html
<!DOCTYPE html>
<html>
<head>
    <title>Health Check</title>
</head>
<body>
    <script>
        // Simple health check
        const healthCheck = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            services: {
                database: 'checking...',
                auth: 'checking...'
            }
        };

        // Check Supabase connection
        if (window.supabase) {
            window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY)
                .from('users')
                .select('count')
                .limit(1)
                .then(() => {
                    healthCheck.services.database = 'healthy';
                })
                .catch(() => {
                    healthCheck.services.database = 'unhealthy';
                })
                .finally(() => {
                    document.body.innerHTML = `<pre>${JSON.stringify(healthCheck, null, 2)}</pre>`;
                });
        }
    </script>
</body>
</html>
```

### 5.2 Uptime Monitoring
```bash
# Set up external monitoring (choose one):

# 1. UptimeRobot (Free)
# - Add your domain to monitor
# - Set check interval to 5 minutes
# - Configure email/SMS alerts

# 2. Pingdom
# - Create account and add website
# - Set up alerts for downtime

# 3. StatusCake
# - Free tier available
# - Multiple check locations

# 4. Custom monitoring script
#!/bin/bash
DOMAIN="yourdomain.com"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN)

if [ $STATUS -ne 200 ]; then
    echo "Website down! Status: $STATUS"
    # Send alert (email, Slack, etc.)
fi
```

## Step 6: Backup Strategy

### 6.1 Database Backup
```sql
-- Supabase automatic backups are included
-- For additional backups, use pg_dump equivalent

-- Manual backup script (run via cron)
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/path/to/backups"

# Export data via Supabase API
curl -X GET "https://your-project.supabase.co/rest/v1/users" \
  -H "apikey: your-service-role-key" \
  -H "Authorization: Bearer your-service-role-key" \
  > "$BACKUP_DIR/users_$DATE.json"

# Repeat for other important tables
```

### 6.2 File Backup
```bash
# Daily file backup script
#!/bin/bash
DATE=$(date +%Y%m%d)
BACKUP_DIR="/path/to/backups"
SOURCE_DIR="/path/to/website"

# Create compressed backup
tar -czf "$BACKUP_DIR/website_backup_$DATE.tar.gz" -C "$SOURCE_DIR" .

# Keep only last 30 days of backups
find "$BACKUP_DIR" -name "website_backup_*.tar.gz" -mtime +30 -delete

# Upload to cloud storage (optional)
# aws s3 cp "$BACKUP_DIR/website_backup_$DATE.tar.gz" s3://your-backup-bucket/
```

## Step 7: Testing and Validation

### 7.1 Automated Testing Script
```bash
#!/bin/bash
# Production deployment test script

DOMAIN="https://yourdomain.com"
FAILED=0

echo "Testing Stokika Production Deployment..."

# Test main page
echo "Testing main page..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" $DOMAIN)
if [ $STATUS -ne 200 ]; then
    echo "❌ Main page failed: $STATUS"
    FAILED=1
else
    echo "✅ Main page OK"
fi

# Test SSL
echo "Testing SSL certificate..."
SSL_EXPIRY=$(echo | openssl s_client -servername yourdomain.com -connect yourdomain.com:443 2>/dev/null | openssl x509 -noout -enddate | cut -d= -f2)
SSL_DAYS=$(( ($(date -d "$SSL_EXPIRY" +%s) - $(date +%s)) / 86400 ))
if [ $SSL_DAYS -lt 30 ]; then
    echo "⚠️  SSL certificate expires in $SSL_DAYS days"
else
    echo "✅ SSL certificate valid for $SSL_DAYS days"
fi

# Test security headers
echo "Testing security headers..."
HEADERS=$(curl -s -I $DOMAIN)
if echo "$HEADERS" | grep -q "Strict-Transport-Security"; then
    echo "✅ HSTS header present"
else
    echo "❌ HSTS header missing"
    FAILED=1
fi

# Test authentication pages
echo "Testing authentication..."
AUTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $DOMAIN/html/signin.html)
if [ $AUTH_STATUS -ne 200 ]; then
    echo "❌ Sign-in page failed: $AUTH_STATUS"
    FAILED=1
else
    echo "✅ Sign-in page OK"
fi

# Test dashboard pages
for PAGE in admin agent supplier supervisor inventory; do
    echo "Testing $PAGE dashboard..."
    PAGE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $DOMAIN/html/$PAGE.html)
    if [ $PAGE_STATUS -ne 200 ]; then
        echo "❌ $PAGE dashboard failed: $PAGE_STATUS"
        FAILED=1
    else
        echo "✅ $PAGE dashboard OK"
    fi
done

# Test API connectivity (if applicable)
echo "Testing API connectivity..."
# Add your API tests here

if [ $FAILED -eq 0 ]; then
    echo "🎉 All tests passed! Deployment successful."
    exit 0
else
    echo "💥 Some tests failed. Please check the issues above."
    exit 1
fi
```

### 7.2 Performance Testing
```bash
# Use tools like:
# - Google PageSpeed Insights
# - GTmetrix
# - WebPageTest
# - Lighthouse CLI

# Lighthouse CLI test
npx lighthouse https://yourdomain.com --output=html --output-path=./lighthouse-report.html

# Load testing with Apache Bench
ab -n 1000 -c 10 https://yourdomain.com/
```

## Step 8: Go-Live Checklist

### Final Pre-Launch Checklist
- [ ] All environment variables set correctly
- [ ] Database schema deployed and tested
- [ ] SSL certificate installed and working
- [ ] Security headers configured
- [ ] All authentication flows tested
- [ ] OTP system working
- [ ] Email notifications configured
- [ ] Backup systems in place
- [ ] Monitoring alerts configured
- [ ] Performance optimized
- [ ] All dashboards tested
- [ ] Export functions working
- [ ] Search functionality tested
- [ ] Dark mode working
- [ ] Help system functional
- [ ] Activity logging active
- [ ] Rate limiting effective
- [ ] Error handling working
- [ ] Mobile responsiveness verified
- [ ] Cross-browser compatibility tested

### Post-Launch Monitoring
1. **First 24 Hours**: Monitor closely for any issues
2. **First Week**: Check performance metrics and user feedback
3. **First Month**: Review security logs and optimize based on usage patterns

### Emergency Procedures
1. **Rollback Plan**: Keep previous version ready for quick rollback
2. **Emergency Contacts**: List of technical contacts for critical issues
3. **Incident Response**: Documented procedures for handling security incidents

## Maintenance Schedule

### Daily
- [ ] Check error logs
- [ ] Monitor uptime
- [ ] Review security alerts

### Weekly
- [ ] Review performance metrics
- [ ] Check SSL certificate status
- [ ] Update security patches

### Monthly
- [ ] Full security audit
- [ ] Performance optimization review
- [ ] Backup verification
- [ ] User feedback analysis

### Quarterly
- [ ] Dependency updates
- [ ] Security penetration testing
- [ ] Disaster recovery testing
- [ ] Capacity planning review

## Support and Documentation

### Technical Documentation
- Keep all configuration files documented
- Maintain deployment procedures
- Document any customizations made

### User Training
- Prepare user guides for each role
- Create video tutorials
- Set up support channels

### Ongoing Support
- Establish support procedures
- Set up user feedback collection
- Plan for feature updates and improvements

This production setup ensures a secure, performant, and maintainable Stokika deployment ready for real-world use.