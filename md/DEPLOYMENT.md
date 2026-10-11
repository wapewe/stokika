# Deployment Guide - Stokika

## Prerequisites

1. Supabase account (https://supabase.com)
2. cPanel hosting account at pinnacle.co.ke
3. Domain configured with SSL certificate

## Step 1: Setup Supabase Database

### 1.1 Create Supabase Project
1. Go to https://supabase.com
2. Click "New Project"
3. Enter project details:
   - Name: Stokika
   - Database Password: (save this securely)
   - Region: Choose closest to Kenya

### 1.2 Run Database Schema
1. In Supabase Dashboard, go to SQL Editor
2. Open `config/database-schema.sql`
3. Copy and paste the entire SQL script
4. Click "Run" to create all tables and policies

### 1.3 Get API Credentials
1. Go to Project Settings → API
2. Copy:
   - Project URL (e.g., https://xxxxx.supabase.co)
   - anon/public key

## Step 2: Configure Application

### 2.1 Update Credentials
1. Open `config/setup.js`
2. Replace with your actual credentials:
```javascript
window.SUPABASE_URL = 'https://your-project.supabase.co';
window.SUPABASE_ANON_KEY = 'your-actual-anon-key';
```

### 2.2 Test Locally
1. Open `index.html` in a browser
2. Test contact form submission
3. Check Supabase Dashboard → Table Editor → contact_submissions
4. Verify data is being saved

## Step 3: Deploy to cPanel

### 3.1 Prepare Files
1. Ensure all files are ready:
   - ✓ HTML files
   - ✓ CSS folder
   - ✓ JS folder
   - ✓ Config folder (with updated credentials)
   - ✓ Assets folder (logos)
   - ✓ .htaccess file

2. Create a ZIP file of the entire project

### 3.2 Upload to cPanel
1. Login to cPanel at pinnacle.co.ke
2. Go to File Manager
3. Navigate to `public_html`
4. Upload the ZIP file
5. Extract the ZIP file
6. Delete the ZIP file after extraction

### 3.3 Set Permissions
1. Set folder permissions to 755:
   - css/
   - js/
   - config/
   - assets/

2. Set file permissions to 644:
   - All .html files
   - All .css files
   - All .js files
   - .htaccess

### 3.4 Configure SSL
1. In cPanel, go to SSL/TLS Status
2. Enable AutoSSL for your domain
3. Wait for certificate to be issued (5-10 minutes)

## Step 4: Verify Deployment

### 4.1 Test Website
1. Visit your domain: https://yourdomain.com
2. Check all pages load correctly
3. Verify transparent header works
4. Test hero section scroll snapping

### 4.2 Test Forms
1. Submit contact form with test data
2. Subscribe to newsletter with test email
3. Check Supabase Dashboard for entries
4. Verify email validation works
5. Test rate limiting (try submitting 4+ times)

### 4.3 Security Check
1. Visit https://securityheaders.com
2. Enter your domain
3. Verify security headers are present:
   - X-Frame-Options
   - X-Content-Type-Options
   - X-XSS-Protection
   - Content-Security-Policy

### 4.4 Performance Check
1. Visit https://pagespeed.web.dev
2. Test your domain
3. Aim for 90+ score

## Step 5: Post-Deployment

### 5.1 Monitor Submissions
1. Check Supabase Dashboard daily
2. Review contact submissions
3. Export newsletter subscribers

### 5.2 Backup Strategy
1. Enable Supabase automatic backups
2. Setup weekly cPanel backups
3. Download local backup monthly

### 5.3 Update DNS (if needed)
1. Point domain to hosting server
2. Add A record: @ → Server IP
3. Add CNAME: www → yourdomain.com
4. Wait 24-48 hours for propagation

## Troubleshooting

### Forms not submitting
- Check browser console for errors
- Verify Supabase credentials in setup.js
- Check RLS policies in Supabase
- Ensure CORS is enabled in Supabase

### Images not loading
- Check file paths are correct
- Verify assets folder uploaded
- Check file permissions (644)

### Security headers not working
- Verify .htaccess uploaded
- Check if mod_headers enabled in cPanel
- Contact hosting support if needed

### SSL certificate issues
- Wait 10-15 minutes after enabling
- Clear browser cache
- Try incognito/private mode
- Contact hosting support

## Support

### Supabase Issues
- Documentation: https://supabase.com/docs
- Support: support@supabase.io

### Hosting Issues
- Contact: pinnacle.co.ke support
- cPanel documentation

### Application Issues
- Check SECURITY.md for security concerns
- Review browser console for errors
- Check Supabase logs for API errors

## Maintenance Checklist

### Daily
- [ ] Check contact form submissions
- [ ] Review error logs

### Weekly
- [ ] Export newsletter subscribers
- [ ] Review Supabase usage
- [ ] Check website performance

### Monthly
- [ ] Update dependencies
- [ ] Review security headers
- [ ] Backup database
- [ ] Test all forms

### Quarterly
- [ ] Security audit
- [ ] Performance optimization
- [ ] Review RLS policies
- [ ] Update documentation
