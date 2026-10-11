# SQL Files Inventory - Config Folder

**Total Files: 65**

## 📊 Categories

### ✅ CORE SCHEMA FILES (Used in Migration)

1. **unified-database-schema_v2.sql** ✅
   - Core database schema with all base tables
   - Users, vendors, suppliers, field_agents, supervisors
   - Products, orders, payments, inventory
   - Contacts, newsletter, email logs, website settings
   - **Status**: Harmonized into migration

2. **comprehensive-onboarding-minimal.sql** ✅
   - Training modules and progress tracking
   - Onboarding documents and metrics
   - First assignments for new users
   - **Status**: Harmonized into migration

3. **advanced-features-minimal.sql** ✅
   - Product categories, deliveries
   - Shopping carts, loyalty programs
   - SMS templates, messaging system
   - Financial summaries, bulk operations
   - **Status**: Harmonized into migration

4. **supplier-product-management-minimal.sql** ✅
   - Supplier inventory management
   - Product variants and reviews
   - Shipping zones and promotions
   - **Status**: Harmonized into migration

5. **vendor-product-management-minimal.sql** ✅
   - Vendor inventory and orders
   - Customer orders management
   - Restock requests
   - **Status**: Harmonized into migration

6. **vendor-shop-branding-dropship-minimal.sql** ✅
   - Vendor shop profiles and themes
   - Dropshipping functionality
   - Shop analytics
   - **Status**: Harmonized into migration

### ❌ DUPLICATE/OLDER VERSIONS (Not Used)

7. **unified-database-schema.sql**
   - Older version of unified schema
   - Replaced by v2

8. **complete-database-schema.sql**
   - Earlier complete schema
   - Superseded by unified-database-schema_v2.sql

9. **database-setup.sql**
   - Initial database setup
   - Merged into unified-database-schema_v2.sql

10. **comprehensive-onboarding-schema.sql**
    - Full version with more features
    - Minimal version used instead

11. **advanced-features-schema.sql**
    - Full version with more features
    - Minimal version used instead

12. **supplier-product-management-schema.sql**
    - Full version with more features
    - Minimal version used instead

13. **vendor-product-management-schema.sql**
    - Full version with more features
    - Minimal version used instead

14. **vendor-shop-branding-dropship-schema.sql**
    - Full version with more features
    - Minimal version used instead

### 🔧 ADMIN SETUP & POLICIES (Not in Migration)

15. **admin-cleanup-policy.sql**
    - Cleanup admin RLS policies

16. **admin-cleanup-policy_v3.sql**
    - Version 3 of admin cleanup

17. **admin-policies-fixed.sql**
    - Fixed admin policies

18. **admin-rls-final.sql**
    - Final admin RLS policies

19. **admin-rls-fixed.sql**
    - Fixed admin RLS

20. **admin-rls-solution.sql**
    - Admin RLS solution

21. **admin-settings-schema.sql**
    - Admin settings table

22. **admin-setup-policy.sql**
    - Admin setup policies

23. **admin-setup-policy_v2.sql**
    - Version 2 of admin setup

24. **admin-user-creation-fix.sql**
    - Fix for admin user creation

25. **admin-user-policies.sql**
    - Admin user policies

26. **create-admin-user.sql**
    - Create admin user script

27. **proper-admin-rls-policies.sql**
    - Proper admin RLS policies

28. **role-based-admin-policy.sql**
    - Role-based admin policies

29. **simple-admin-fix.sql**
    - Simple admin fix

### 🔍 DIAGNOSTIC/DEBUG SCRIPTS (Not in Migration)

30. **check-accounts-status.sql**
    - Check account statuses

31. **check-database-structure.sql**
    - Verify database structure

32. **check-users-table.sql**
    - Check users table

33. **check-valid-statuses.sql**
    - Validate status values

34. **debug-missing-records.sql**
    - Debug missing records

35. **debug-user-creation.sql**
    - Debug user creation issues

36. **get-admin-uuid.sql**
    - Get admin user UUID

37. **verify-schema-setup.sql**
    - Verify schema setup

### 📝 DATA MODIFICATION SCRIPTS (Not in Migration)

38. **create-missing-records.sql**
    - Create missing records

39. **delete-all-users.sql**
    - Delete all users (dangerous)

40. **fix-existing-accounts.sql**
    - Fix existing accounts

41. **fix-rls-policies.sql**
    - Fix RLS policies

42. **fix-user-creation-final.sql**
    - Final user creation fix

43. **update-accounts-to-approved.sql**
    - Update accounts to approved

44. **update-admin-uuid.sql**
    - Update admin UUID

45. **update-users-status-to-approved.sql**
    - Update user statuses

### 🔐 SECURITY & RLS (Not in Migration)

46. **disable-rls-all-tables.sql**
    - Disable RLS on all tables

47. **disable-rls-temp.sql**
    - Temporarily disable RLS

48. **supabase-security-functions.sql**
    - Security functions (rate limiting, OTP)

### 📋 SPECIALIZED FEATURES (Not in Migration)

49. **agent-affiliate-system.sql**
    - Agent referral/affiliate system

50. **audit-logs-table.sql**
    - Audit logging table

51. **dashboard-features-schema.sql**
    - Dashboard widgets and features

52. **gps-analytics-schema.sql**
    - GPS tracking and analytics

53. **notifications-addon.sql**
    - Notification system addon

54. **onboarding-steps-schema.sql**
    - Onboarding steps tracking

55. **onboarding-steps-schema_v2.sql**
    - Version 2 of onboarding steps

56. **performance-metrics-schema.sql**
    - Performance metrics tracking

57. **stokika-kit-payment-schema.sql**
    - Kit payment system

58. **storage-setup.sql**
    - Supabase storage setup

59. **supervisor-authority-setup.sql**
    - Supervisor authority system

### 📧 SPECIFIC FEATURES (Not in Migration)

60. **contact-form-policy.sql**
    - Contact form RLS policy

61. **newsletter-policy.sql**
    - Newsletter RLS policy

62. **newsletter-table-fix.sql**
    - Fix newsletter table

63. **newsletter-table-update.sql**
    - Update newsletter table

### 🏢 BUSINESS FIELDS (Not in Migration)

64. **add-location-business-fields.sql**
    - Add location/business fields to tables

### 🔄 UTILITY SCRIPTS (Not in Migration)

65. **run-this-sql.sql**
    - Quick run script (purpose unclear)

## Summary by Status

### ✅ Included in Migration (6 files)
- unified-database-schema_v2.sql
- comprehensive-onboarding-minimal.sql
- advanced-features-minimal.sql
- supplier-product-management-minimal.sql
- vendor-product-management-minimal.sql
- vendor-shop-branding-dropship-minimal.sql

### ❌ Not Included (59 files)
- 8 Duplicate/older versions
- 15 Admin setup & policies
- 8 Diagnostic/debug scripts
- 8 Data modification scripts
- 3 Security & RLS scripts
- 11 Specialized features
- 4 Specific features
- 1 Business fields
- 1 Utility script

## Recommendation

The migration file (`20240101000000_stokika_complete_schema.sql`) includes everything needed for production. The 59 excluded files are either:
- Older versions
- Temporary fixes
- Debug scripts
- Optional features that can be added later

You can safely archive or delete the excluded files after confirming the migration works.
