# Production Deployment Security Checklist
**Stokika B2B Marketplace Platform**  
**Last Updated:** August 29, 2026

---

## Pre-Deployment Security Checklist

### 📋 Phase 1: Environment Configuration (CRITICAL)

- [ ] **cPanel Username Updated**
  - Open `.user.ini`
  - Replace `youruser` with actual cPanel username
  - Path should be: `/home/YOUR_USERNAME/private/load-env.php`

- [ ] **Environment Variables Set in cPanel**
  - Go to: cPanel → Select PHP Version → Options → Environment Variables
  - Add ALL variables from `.env.production.example`
  - Verify each variable is set correctly
  - **NEVER** leave placeholder values

- [ ] **M-Pesa Production Credentials**
  - Replace sandbox keys with production keys
  - `MPESA_CONSUMER_KEY`: ✅ Set
  - `MPESA_CONSUMER_SECRET`: ✅ Set
  - `MPESA_SHORTCODE`: ✅ Set
  - `MPESA_PASSKEY`: ✅ Set
  - `MPESA_CALLBACK_URL`: ✅ Points to production Supabase function
  - `MPESA_ENVIRONMENT`: ✅ Set to `production`

- [ ] **Supabase Configuration**
  - `SUPABASE_URL`: ✅ Correct production URL
  - `SUPABASE_ANON_KEY`: ✅ Production anon key
  - `SUPABASE_SERVICE_ROLE_KEY`: ✅ Set (KEEP SECRET!)
  - Row Level Security (RLS) enabled on all tables
  - Service role key NEVER exposed to frontend

- [ ] **Security Secrets Generated**
  - `JWT_SECRET`: ✅ 64+ character random string
  - `ENCRYPTION_KEY`: ✅ 32+ character random string
  - `SESSION_SECRET`: ✅ 64+ character random string
  - `REQUEST_SIGNING_KEY`: ✅ Generated and set
  - Generate using: `openssl rand -base64 48`

- [ ] **Email Configuration**
  - `SMTP_HOST`: ✅ smtp.gmail.com
  - `SMTP_PORT`: ✅ 465 (SSL)
  - `SMTP_USER`: ✅ noreply@stokika.com
  - `SMTP_PASS`: ✅ Gmail App Password (NOT regular password!)
  - `FROM_EMAIL`: ✅ noreply@stokika.com
  - Generate App Password: https://myaccount.google.com/apppasswords

- [ ] **IP Whitelist**
  - `ADMIN_IP_WHITELIST`: ✅ Add your office/home IP
  - Format: `123.123.123.123,456.456.456.456`
  - Find your IP: https://whatismyipaddress.com/

### 📋 Phase 2: File Permissions & Security

- [ ] **Sensitive Files Protected**
  - `.env` file: ✅ Blocked by .htaccess
  - `private/` folder: ✅ Outside web root OR protected
  - `.git/` folder: ✅ Blocked by .htaccess
  - `config/` files: ✅ Blocked by .htaccess
  - `.htaccess` rules: ✅ Tested and working

- [ ] **Directory Permissions**
  - `private/`: 0700 (owner only)
  - `private/load-env.php`: 0600 (owner read/write only)
  - `api/`: 0755 (standard web directory)
  - `uploads/`: 0755 with PHP execution disabled
  - `.htaccess`: 0644 (read-only)

- [ ] **Create Required Directories**
  ```bash
  mkdir -p private/security-logs
  mkdir -p private/rate-limits
  mkdir -p private/mpesa-idempotency
  chmod 0700 private/security-logs
  chmod 0700 private/rate-limits
  chmod 0700 private/mpesa-idempotency
  ```

### 📋 Phase 3: Security Headers & Configuration

- [ ] **HTTPS Enforced**
  - SSL certificate installed
  - HTTP to HTTPS redirect working
  - Mixed content warnings resolved
  - Test: http://stokika.com → redirects to https://

- [ ] **Security Headers Verified**
  - Test at: https://securityheaders.com/
  - Expected grade: A or A+
  - All headers present in `.htaccess`
  - CSP policy working (no console errors)

- [ ] **CORS Configuration**
  - Production domains whitelisted in `cors-config.php`
  - Development domains removed for production
  - Strict CORS mode enabled
  - Test cross-origin requests

- [ ] **PHP Configuration**
  - `display_errors`: Off
  - `log_errors`: On
  - `expose_php`: Off
  - `session.cookie_httponly`: On
  - `session.cookie_secure`: On
  - `session.use_strict_mode`: On

### 📋 Phase 4: Security Components Integration

- [ ] **Rate Limiting Active**
  - `api/rate-limiter.php`: ✅ Uploaded
  - Integrated in login endpoint
  - Integrated in API endpoints
  - Integrated in M-Pesa callback
  - Test: Try 10 failed logins (should block after 5)

- [ ] **Input Validation Active**
  - `api/input-validator.php`: ✅ Uploaded
  - Used in all form handlers
  - Used in all API endpoints
  - Test: Submit SQL injection string (should be blocked)

- [ ] **M-Pesa Security Active**
  - `api/mpesa-callback-validator.php`: ✅ Uploaded
  - Safaricom IPs whitelisted
  - Idempotency enforcement working
  - Test callback with staging data

- [ ] **Security Logging Active**
  - `api/security-logger.php`: ✅ Uploaded
  - Logs being written to `private/security-logs/`
  - Critical events logged
  - Log rotation configured

- [ ] **Session Management Secure**
  - httpOnly cookies enabled
  - Secure flag enabled (HTTPS only)
  - SameSite=Strict
  - 30-minute timeout
  - IP validation enabled
  - CSRF tokens working

### 📋 Phase 5: Database Security

- [ ] **Supabase Row Level Security (RLS)**
  - RLS enabled on ALL tables
  - Policies tested for each user role
  - Service role key never exposed to frontend
  - Test: Try to access another user's data (should fail)

- [ ] **Database Backups**
  - Automatic backups enabled in Supabase
  - Backup retention: 7 days minimum
  - Test restore procedure
  - Document backup location

- [ ] **SQL Injection Protection**
  - No raw SQL queries in PHP
  - All queries through Supabase client
  - Parameterized queries only
  - Test: Try SQL injection in forms

### 📋 Phase 6: Payment Security

- [ ] **M-Pesa Production Setup**
  - Production credentials active
  - Callback URL updated in Safaricom portal
  - Test with KES 1 transaction
  - Verify callback received and processed
  - Check idempotency (send duplicate callback)

- [ ] **Payment Validation**
  - Amount validation working
  - Phone number validation working
  - Payment status tracked correctly
  - Failed payments handled properly

- [ ] **Payment Logging**
  - All transactions logged
  - Failed attempts logged
  - Security events logged
  - Audit trail complete

### 📋 Phase 7: Frontend Security

- [ ] **XSS Protection**
  - `xss-protection.js` loaded on all pages
  - All user data escaped
  - No `innerHTML` with raw user data
  - Test: Submit `<script>alert('XSS')</script>` (should be escaped)

- [ ] **CSRF Protection**
  - `csrf-protection.js` loaded on all pages
  - All forms protected
  - All AJAX requests include tokens
  - Test: Submit form without token (should fail)

- [ ] **Content Security Policy**
  - CSP header configured
  - No inline scripts (or nonce-based)
  - No `eval()` usage
  - No `document.write()` usage
  - Check browser console for CSP violations

- [ ] **Secure Communication**
  - All API calls over HTTPS
  - No sensitive data in URLs
  - No sensitive data in localStorage (use httpOnly cookies)
  - Test: Check network tab for sensitive data

### 📋 Phase 8: Monitoring & Logging

- [ ] **Security Monitoring Setup**
  - Security logs accessible to admins
  - Failed login alerts configured
  - Rate limit violation alerts
  - M-Pesa callback failures monitored

- [ ] **Cron Jobs Configured**
  - Daily rate limit cleanup (3 AM)
  - Weekly security log cleanup (Sunday 4 AM)
  - Daily M-Pesa idempotency cleanup (2 AM)
  - Test: Run each cron job manually

- [ ] **Log Rotation**
  - Logs rotate at 10MB
  - 90-day retention
  - Compressed storage
  - Disk space monitored

### 📋 Phase 9: Testing

- [ ] **Security Testing**
  - OWASP ZAP scan completed
  - No critical vulnerabilities
  - SSL Labs test: A rating
  - Security headers test: A rating
  - Load testing completed
  - Penetration testing completed (if applicable)

- [ ] **Functional Testing**
  - User registration works
  - Login/logout works
  - Session timeout works
  - Password reset works
  - M-Pesa payment works
  - File uploads work
  - All forms submit correctly

- [ ] **Rate Limiting Testing**
  - Login rate limiting works
  - API rate limiting works
  - M-Pesa callback rate limiting works
  - Rate limit reset works correctly

- [ ] **Error Handling**
  - No sensitive errors shown to users
  - All errors logged properly
  - Custom error pages for 404, 500, etc.
  - Stack traces hidden in production

### 📋 Phase 10: Documentation & Training

- [ ] **Documentation Complete**
  - README.md updated
  - SECURITY_IMPLEMENTATION_GUIDE.md reviewed
  - API documentation current
  - Deployment guide current
  - Incident response plan documented

- [ ] **Team Training**
  - Team aware of security procedures
  - Incident response plan reviewed
  - Emergency contacts documented
  - Backup/restore procedure documented

- [ ] **Access Control**
  - Admin credentials secured
  - Database credentials secured
  - API keys secured
  - No shared passwords
  - Password manager in use

---

## Post-Deployment Verification

### Day 1 (Launch Day)

- [ ] **Hour 1:**
  - Monitor security logs closely
  - Check for errors
  - Verify M-Pesa callbacks working
  - Monitor user signups

- [ ] **Hour 4:**
  - Review security logs
  - Check rate limit violations
  - Verify no critical errors
  - Monitor performance

- [ ] **Hour 8:**
  - Full security log review
  - Check failed login attempts
  - Verify backups running
  - Performance check

- [ ] **Hour 24:**
  - Complete security audit
  - Review all logs
  - Check for unusual patterns
  - Verify all systems operational

### Week 1

- [ ] **Daily Tasks:**
  - Review security logs
  - Monitor failed logins
  - Check M-Pesa transactions
  - Verify backups

- [ ] **End of Week:**
  - Comprehensive security review
  - Performance optimization
  - User feedback review
  - Bug fixes deployed

### Month 1

- [ ] **Weekly Reviews:**
  - Security log analysis
  - Performance metrics
  - User growth tracking
  - Security incidents (if any)

- [ ] **End of Month:**
  - Full security audit
  - Penetration testing
  - Update documentation
  - Plan improvements

---

## Emergency Procedures

### Security Breach Detected

1. **Immediate Actions:**
   ```bash
   # Block suspicious IP
   echo "Deny from <SUSPICIOUS_IP>" >> .htaccess
   
   # Check security logs
   tail -n 1000 private/security-logs/security-$(date +%Y-%m-%d).log
   
   # Reset rate limits if needed
   rm -rf private/rate-limits/*.json
   
   # Force logout all users (if needed)
   rm -rf /tmp/sess_*
   ```

2. **Assessment:**
   - Check what data was accessed
   - Identify vulnerability
   - Determine scope of breach

3. **Containment:**
   - Patch vulnerability immediately
   - Reset affected credentials
   - Notify affected users if required
   - Document incident

### Service Outage

1. **Check Components:**
   ```bash
   # Check if Supabase is up
   curl -I https://eidsqrnwfndruuufyacc.supabase.co
   
   # Check PHP errors
   tail -n 100 /path/to/error_log
   
   # Check disk space
   df -h
   
   # Check file permissions
   ls -la private/
   ```

2. **Common Issues:**
   - Rate limit files filling disk → Run cleanup
   - Session files accumulating → Clear old sessions
   - Logs too large → Run log rotation
   - Database connection → Check Supabase status

---

## Security Contacts

**Immediate Response Team:**
- Security Lead: [Add email/phone]
- System Administrator: [Add email/phone]
- Database Administrator: [Add email/phone]

**External Contacts:**
- Hosting Support: support@hostpinnacle.com
- Supabase Support: support@supabase.io
- Safaricom M-Pesa: [Add contact]
- SSL Certificate Provider: [Add contact]

---

## Sign-Off

**Deployment Checklist Completed By:**

Name: ____________________________  
Role: ____________________________  
Date: ____________________________  
Signature: ____________________________

**Verified By:**

Name: ____________________________  
Role: ____________________________  
Date: ____________________________  
Signature: ____________________________

---

**Checklist Version:** 1.0  
**Last Updated:** August 29, 2026  
**Next Review:** September 29, 2026

---

## Notes

Record any deviations from this checklist or additional security measures implemented:

```
[Add notes here]
```

---

**🎉 Once all items are checked, you're ready for production deployment!**

**⚠️ Remember:** Security is an ongoing process, not a one-time task. Continue to monitor, update, and improve your security posture regularly.
