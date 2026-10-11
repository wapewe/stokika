# Database Schema Files Comparison

## Files Overview

| File | Size | Tables | Status |
|------|------|--------|--------|
| `complete-database-schema.sql` | 18,920 bytes | 15 tables | More comprehensive |
| `database-setup.sql` | 9,853 bytes | 12 tables | Simpler, newer |

## Missing Tables in database-setup.sql

### 1. **field_agents** ❌
- Complete field agent application data
- 70+ fields including personal info, experience, references
- Status tracking (pending, approved, rejected)
- Interview management
- **Impact**: Cannot store field agent applications

### 2. **agent_documents** ❌
- Stores uploaded documents for field agents
- File paths, sizes, mime types
- Document status tracking
- **Impact**: Cannot manage agent document uploads

### 3. **supervisors** ❌
- Supervisor management table
- Different from supervisor_applications
- Tracks approved supervisors
- **Impact**: Only has applications, not actual supervisors

### 4. **website_settings** ❌
- Site status (online, maintenance, offline)
- Feature toggles
- Maintenance messages
- **Impact**: Cannot manage site settings from admin

### 5. **email_logs** ❌
- Email tracking
- Sent by, recipient, subject, message
- Status tracking
- **Impact**: No email audit trail

### 6. **contacts** vs **contact_submissions** ⚠️
- complete-database-schema.sql has `contacts`
- database-setup.sql has `contact_submissions`
- Similar but different field names

## Missing Features in database-setup.sql

### 1. **Triggers** ❌
- No auto-update triggers for `updated_at` columns
- complete-database-schema.sql has triggers for all tables

### 2. **Public Insert Policies** ❌
- No policies for anonymous form submissions
- complete-database-schema.sql allows public inserts on:
  - field_agents
  - agent_documents
  - vendors
  - suppliers
  - supervisors
  - contacts
  - newsletter_subscribers

### 3. **Admin Policies** ❌
- Limited RLS policies
- complete-database-schema.sql has comprehensive admin policies

### 4. **Indexes** ⚠️
- database-setup.sql: 8 indexes
- complete-database-schema.sql: 25+ indexes
- Missing indexes on status, email, phone fields

## Tables Present in Both

✅ users
✅ vendors
✅ suppliers
✅ products
✅ orders
✅ payments
✅ newsletter_subscriptions (newsletter_subscribers in complete)

## Unique to database-setup.sql

✅ **order_items** - Order line items (GOOD!)
✅ **inventory** - Inventory management (GOOD!)
✅ **vendor_registrations** - Vendor applications (GOOD!)
✅ **supervisor_applications** - Supervisor applications (GOOD!)

## Recommendation

### Option 1: Merge Both Files (RECOMMENDED)
Create a new comprehensive schema with:
- All tables from complete-database-schema.sql
- Plus: order_items, inventory, vendor_registrations, supervisor_applications
- All triggers and policies
- All indexes

### Option 2: Use complete-database-schema.sql + Add Missing
- Use complete-database-schema.sql as base
- Add the 4 unique tables from database-setup.sql
- Simpler approach

### Option 3: Keep Both (NOT RECOMMENDED)
- Run complete-database-schema.sql first
- Then run database-setup.sql
- Risk of conflicts

## Critical Missing Functionality

If using only database-setup.sql, you CANNOT:
1. ❌ Store field agent applications
2. ❌ Manage agent documents
3. ❌ Track approved supervisors (only applications)
4. ❌ Control website settings
5. ❌ Log emails
6. ❌ Allow public form submissions (no RLS policies)
7. ❌ Auto-update timestamps (no triggers)

## Summary

**complete-database-schema.sql is MORE COMPLETE** but missing:
- order_items
- inventory
- vendor_registrations
- supervisor_applications

**database-setup.sql is SIMPLER** but missing:
- field_agents
- agent_documents
- supervisors
- website_settings
- email_logs
- Triggers
- Public insert policies
- Many indexes

## Action Required

**Create merged schema file** with all tables, triggers, policies, and indexes from both files.
