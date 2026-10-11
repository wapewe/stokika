# SQL Execution Order for Supabase Setup
**Project:** Stokika  
**Supabase Project ID:** iuvlwpkehrnyxaoxznuk

---

## 📌 Important Notes

1. Run these in **Supabase SQL Editor**: https://supabase.com/dashboard/project/iuvlwpkehrnyxaoxznuk/sql
2. Run **ONE file at a time**
3. Check for errors after each file
4. If errors occur, read the error message and fix before continuing
5. Some files may show warnings (yellow) - these are usually safe to ignore

---

## 🔢 Execution Order

### Phase 1: Core Database Tables (REQUIRED)

```
1. unified-database-schema_v2.sql          <- Users, field_agents, supervisors, vendors, suppliers
2. stokika-kit-payment-schema.sql         <- Kit payment system
3. mpesa-schema-update.sql                <- M-Pesa integration columns
4. onboarding-steps-schema_v2.sql         <- Onboarding workflow
5. admin-settings-schema.sql              <- Admin dashboard settings
```

**Verify:** Check Table Editor - should see: users, field_agents, supervisors, stokika_kit_payments

---

### Phase 2: Advanced Features (OPTIONAL but recommended)

```
6. comprehensive-onboarding-schema.sql     <- Enhanced onboarding
7. advanced-features-schema.sql            <- GPS, analytics, notifications
8. gps-analytics-schema.sql                <- GPS tracking system
9. supplier-product-management-schema.sql  <- Supplier products
10. vendor-product-management-schema.sql   <- Vendor products
11. vendor-shop-branding-dropship-schema.sql <- Vendor shops
12. agent-affiliate-system.sql             <- Affiliate/referral system
```

---

### Phase 3: Security & Policies (CRITICAL - Run last)

```
13. admin-rls-fixed.sql                    <- Admin Row Level Security
14. newsletter-policy.sql                  <- Newsletter permissions
15. contact-form-policy.sql                <- Contact form permissions
```

**Verify:** Go to Authentication -> Policies - should see policies for each table

---

## ✅ After SQL Setup is Complete

1. Deploy frontend files to cPanel (see DEPLOYMENT_GUIDE.md)
2. Test at https://www.stokika.com
3. Create your admin account
4. Start using the system!
