# Deployment Checklist - Stokika Security Implementation

## Pre-Deployment (Complete Before Going Live)

### 1. Credential Management
- [ ] Rotate Supabase anon key
- [ ] Rotate Supabase service_role key
- [ ] Create `.env` file with new credentials
- [ ] Verify `.env` is in `.gitignore`
- [ ] Verify no credentials in code
- [ ] Test with new credentials locally

### 2. File Cleanup
- [ ] Delete `html/ultra-secure-signin.html`
- [ ] Delete `js/ultra-secure-auth.js`
- [ ] Delete `js/enhanced-security.js`
- [ ] Delete `js/enhanced-auth.js`
- [ ] Check if `css/otp-styles.css` is used elsewhere
- [ ] Check if `css/security-styles.css` is used elsewhere
- [ ] Delete unused CSS files
- [ ] Clear browser cache after deletion

### 3. Supabase Configuration
- [ ] Enable Email Authentication
- [ ] Set Site URL: `https://stokika.com`
- [ ] Add Redirect URL: `https://stokika.com/html/signin.html`
- [ ] Add Redirect URL: `https://stokika.com/html/reset-password.html`
- [ ] Set password minimum length: 12
- [ ] Enable password requirements (uppercase, lowercase, number, special)
- [ ] Configure SMTP settings
- [ ] Test email delivery
- [ ] Create storage buckets (uploads, avatars, documents, products)
- [ ] Run `config/storage-setup.sql`
- [ ] Test file upload
- [ ] Enable automatic backups (if Pro plan)

### 4. Testing
- [ ] Test vendor login → inventory.html
- [ ] Test supplier login → supplier.html
- [ ] Test supervisor login → supervisor.html
- [ ] Test field_agent login → agent.html
- [ ] Test admin login → admin.html
- [ ] Test wrong password (shows error)
- [ ] Test 5 failed attempts (account locks)
- [ ] Test password reset flow
- [ ] Test logout from all dashboards
- [ ] Test session timeout (30 min)
- [ ] Test file upload (image)
- [ ] Test file upload rejection (>10MB)
- [ ] Test file upload rejection (.exe)
- [ ] Test in Chrome
- [ ] Test in Firefox
- [ ] Test in Safari
- [ ] Test on mobile

### 5. Security Verification
- [ ] No credentials in client-side code
- [ ] HTTPS enabled
- [ ] Security headers present (.htaccess)
- [ ] RLS policies enabled on all tables
- [ ] Storage policies configured
- [ ] Rate limiting working
- [ ] Session management working
- [ ] Input validation working
- [ ] XSS prevention working
- [ ] Run security scan (https://securityheaders.com)

### 6. Backup Setup
- [ ] Configure Supabase automatic backups
- [ ] Test manual backup
- [ ] Test restore procedure
- [ ] Document backup locations
- [ ] Set up local backup script
- [ ] Schedule automated backups
- [ ] Test backup verification

### 7. Documentation
- [ ] Update README.md
- [ ] Update DEPLOYMENT.md
- [ ] Review SECURITY.md
- [ ] Document any custom configurations
- [ ] Update team training materials
- [ ] Create incident response plan

## Deployment Day

### 1. Final Checks
- [ ] All pre-deployment items complete
- [ ] Backup of current production
- [ ] Team notified of deployment
- [ ] Maintenance window scheduled
- [ ] Rollback plan ready

### 2. Deploy Files
- [ ] Upload all files to server
- [ ] Verify file permissions (755 for folders, 644 for files)
- [ ] Verify `.htaccess` uploaded
- [ ] Verify `.env` NOT uploaded (use server environment variables)
- [ ] Clear server cache
- [ ] Restart services if needed

### 3. Post-Deployment Verification
- [ ] Visit https://stokika.com
- [ ] Test signin page loads
- [ ] Test login for each role
- [ ] Check browser console (no errors)
- [ ] Test password reset
- [ ] Test file upload
- [ ] Verify HTTPS working
- [ ] Check security headers
- [ ] Monitor error logs

### 4. Monitoring Setup
- [ ] Configure error tracking
- [ ] Set up uptime monitoring
- [ ] Enable Supabase alerts
- [ ] Monitor failed login attempts
- [ ] Check database performance
- [ ] Monitor storage usage

## Post-Deployment (First Week)

### Daily Checks
- [ ] Review error logs
- [ ] Check failed login attempts
- [ ] Monitor system performance
- [ ] Verify backups running
- [ ] Check user feedback

### Week 1 Tasks
- [ ] Full security audit
- [ ] Performance optimization
- [ ] User training sessions
- [ ] Documentation updates
- [ ] Gather feedback
- [ ] Address any issues

## Post-Deployment (First Month)

### Weekly Tasks
- [ ] Review security logs
- [ ] Check backup integrity
- [ ] Monitor user activity
- [ ] Performance review
- [ ] Update documentation

### Month 1 Tasks
- [ ] Comprehensive security review
- [ ] Disaster recovery test
- [ ] User satisfaction survey
- [ ] Performance optimization
- [ ] Feature planning

## Rollback Plan

### If Critical Issues Occur

1. **Immediate Actions**
   - [ ] Take site offline (maintenance mode)
   - [ ] Notify team
   - [ ] Assess issue severity

2. **Rollback Steps**
   - [ ] Restore previous version from backup
   - [ ] Restore database if needed
   - [ ] Verify rollback successful
   - [ ] Test critical functions
   - [ ] Bring site back online

3. **Post-Rollback**
   - [ ] Document issue
   - [ ] Identify root cause
   - [ ] Plan fix
   - [ ] Schedule re-deployment

## Emergency Contacts

### Technical Team
- **Admin:** admin@stokika.com
- **Technical Lead:** [Contact]
- **Database Admin:** [Contact]

### External Support
- **Supabase:** support@supabase.io
- **Hosting:** pinnacle.co.ke support
- **Security:** [Security consultant]

## Success Criteria

### Must Have (Critical)
- ✅ All users can login
- ✅ Sessions work correctly
- ✅ Password reset works
- ✅ No security vulnerabilities
- ✅ Backups configured
- ✅ No exposed credentials

### Should Have (Important)
- ✅ File uploads work
- ✅ Rate limiting active
- ✅ Monitoring configured
- ✅ Documentation complete
- ✅ Team trained

### Nice to Have (Optional)
- ✅ Performance optimized
- ✅ Advanced monitoring
- ✅ Automated testing
- ✅ CI/CD pipeline

## Sign-Off

### Pre-Deployment Sign-Off
- [ ] Technical Lead: _________________ Date: _______
- [ ] Security Review: ________________ Date: _______
- [ ] QA Testing: ____________________ Date: _______

### Deployment Sign-Off
- [ ] Deployment Complete: ___________ Date: _______
- [ ] Post-Deploy Tests Pass: ________ Date: _______
- [ ] Monitoring Active: _____________ Date: _______

### Final Approval
- [ ] Project Manager: _______________ Date: _______
- [ ] Stakeholder: ___________________ Date: _______

---

**Deployment Date:** ______________
**Deployed By:** ______________
**Version:** 2.0 (Security Enhanced)
**Status:** ☐ Pending ☐ In Progress ☐ Complete

---

## Notes

Use this space to document any issues, decisions, or important information during deployment:

```
[Add deployment notes here]
```

---

**Last Updated:** 2024
**Next Review:** [Date + 1 month]
