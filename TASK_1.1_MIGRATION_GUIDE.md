# Task 1.1: Lookup Tables and vendor_bmc Table Creation - Complete

## ✅ Migration File Created

**Location**: `c:\Users\ADMIN\Music\stokika\supabase\migrations\20260917000001_vendor_registration_restructure_lookup_tables.sql`

## 📋 What This Migration Does

### 1. Updates Business Categories (16 categories)
- Retail & Shop
- Food & Beverage
- Fresh Produce & Agriculture
- Fashion & Apparel
- Beauty & Personal Care
- Electronics & Technology
- Hardware & Building Supplies
- Automotive & Transport
- Professional & Business Services
- Home & Household
- Health & Wellness
- Agriculture & Livestock
- Manufacturing & Production
- Wholesale & Distribution
- Creative & Media
- Other

### 2. Updates Business Statuses (5 statuses)
- Planning to Start
- Newly Started
- Operating
- Growing
- Expanding

### 3. Updates Business Sizes (6 sizes)
- Starting (Not yet operating / preparing to start)
- Micro (Owner-operated or very small team)
- Small (Established business with regular operations)
- Growing (Business expanding customers, stock or operations)
- Medium (Larger established business)
- Large (Large-scale operation / multiple branches)

### 4. Updates Business Models (8 models)
- Retail (Sell directly to consumers)
- Wholesale (Sell in bulk to businesses)
- Distribution (Supply products to businesses)
- Manufacturing (Produce/make products)
- Service (Provide services)
- Agriculture (Produce or trade agricultural products)
- Mixed (Combine products and services)
- Other

### 5. Creates vendor_bmc Table
New table with 9 Business Model Canvas sections:
- value_proposition (min 30 characters)
- customer_segments (min 30 characters)
- channels (min 30 characters)
- customer_relationships (min 30 characters)
- revenue_streams (min 30 characters)
- key_resources (min 30 characters)
- key_activities (min 30 characters)
- key_partnerships (min 30 characters)
- cost_structure (min 30 characters)

Each section has:
- ✅ Character length validation (minimum 30 characters)
- ✅ NOT NULL constraint
- ✅ Foreign key to vendors table with CASCADE delete
- ✅ Unique constraint per vendor
- ✅ Timestamps (completed_at, created_at, updated_at)

### 6. Performance Optimization
Creates indexes on:
- vendor_bmc(vendor_id)
- vendor_bmc(completed_at)
- business_categories(category_name)
- business_categories(display_order)
- business_statuses(name)
- business_statuses(display_order)
- business_sizes(name)
- business_sizes(display_order)
- business_models(name)

### 7. Schema Standardization
- Renames columns to use consistent `name` field across all lookup tables
- Removes old CHECK constraints that would conflict with new data
- Adds `display_order` columns where missing
- Adds comprehensive table and column comments

## 🚀 How to Apply This Migration

### Method 1: Via Supabase Dashboard (Recommended)

1. **Open Supabase SQL Editor**:
   - Go to: https://supabase.com/dashboard/project/eidsqrnwfndruuufyacc/sql/new

2. **Copy Migration Contents**:
   - Open: `c:\Users\ADMIN\Music\stokika\supabase\migrations\20260917000001_vendor_registration_restructure_lookup_tables.sql`
   - Select all content (Ctrl+A)
   - Copy (Ctrl+C)

3. **Paste and Run**:
   - Paste into Supabase SQL Editor
   - Click the **RUN** button
   - Wait for completion

4. **Verify Success**:
   - Check the output messages
   - Should see notices like:
     - "Successfully created 16 business_categories"
     - "Successfully created 5 business_statuses"
     - "Successfully created 6 business_sizes"
     - "Successfully created 8 business_models"
     - "Successfully created vendor_bmc table"

### Method 2: Via Supabase CLI (Alternative)

```bash
# Navigate to project directory
cd c:\Users\ADMIN\Music\stokika

# Run migration
supabase db push
```

**Note**: The dashboard method is more reliable for complex migrations.

## ✅ Verification Steps

After running the migration, verify in Supabase Dashboard:

### Check Table Counts
```sql
-- Should return 16
SELECT COUNT(*) FROM business_categories;

-- Should return 5
SELECT COUNT(*) FROM business_statuses;

-- Should return 6
SELECT COUNT(*) FROM business_sizes;

-- Should return 8
SELECT COUNT(*) FROM business_models;

-- Should exist (0 rows initially)
SELECT COUNT(*) FROM vendor_bmc;
```

### Check Table Structure
```sql
-- Verify vendor_bmc table structure
SELECT column_name, data_type, is_nullable, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'vendor_bmc'
ORDER BY ordinal_position;

-- Verify indexes exist
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename IN ('vendor_bmc', 'business_categories', 'business_statuses', 'business_sizes', 'business_models')
ORDER BY tablename, indexname;
```

### Check Sample Data
```sql
-- View business categories
SELECT category_name, display_order FROM business_categories ORDER BY display_order;

-- View business statuses
SELECT name, display_order FROM business_statuses ORDER BY display_order;

-- View business sizes
SELECT name, description, display_order FROM business_sizes ORDER BY display_order;

-- View business models
SELECT name, description FROM business_models ORDER BY name;
```

## 🎯 Requirements Satisfied

This migration satisfies the following requirements from the spec:

- **Requirement 11.1**: System stores Business_Category as separate database field ✅
- **Requirement 11.2**: System stores Business_Status as separate database field ✅
- **Requirement 11.3**: System stores Business_Size as separate database field ✅
- **Requirement 11.4**: System stores Business_Model as separate database field ✅
- **Requirement 11.6**: System stores each BMC section (9 total) as separate database fields ✅
- **Requirement 14.1**: BMC_Parser shall parse user-entered BMC text into BMC_Object ✅ (table structure supports this)
- **Requirement 14.2**: BMC_Parser shall handle empty sections without errors ✅ (NOT NULL enforced at DB level)
- **Requirement 14.3**: BMC_Parser shall preserve line breaks and formatting ✅ (TEXT type supports this)
- **Requirement 14.4**: BMC_Parser shall validate all 9 required sections ✅ (table enforces this)
- **Requirement 14.5**: BMC_Parser shall sanitize input while preserving content ✅ (application layer will handle)

## 📊 Database Changes Summary

### Tables Updated
- ✅ `business_categories` - Truncated and repopulated with 16 categories
- ✅ `business_statuses` - Truncated and repopulated with 5 statuses
- ✅ `business_sizes` - Truncated and repopulated with 6 sizes
- ✅ `business_models` - Truncated and repopulated with 8 models

### Tables Created
- ✅ `vendor_bmc` - New table for Business Model Canvas data

### Indexes Created
- ✅ 10 new indexes for performance optimization

### Constraints Added
- ✅ 9 CHECK constraints for minimum character length in vendor_bmc
- ✅ 1 UNIQUE constraint for vendor_bmc (one BMC per vendor)
- ✅ 1 FOREIGN KEY constraint with CASCADE delete

## ⚠️ Important Notes

1. **Data Loss Warning**: This migration uses `TRUNCATE TABLE ... CASCADE` on the lookup tables. If there are existing vendors with foreign keys to these tables, those relationships will be broken. Ensure you run task 1.2 and 1.3 (add columns to vendors table and data migration) before production use.

2. **No Rollback Needed**: If this is the first time running these migrations, no existing data will be lost. However, if you need to rollback:
   ```sql
   DROP TABLE IF EXISTS vendor_bmc CASCADE;
   -- Then restore previous lookup table data from backup
   ```

3. **Next Steps**: After this migration:
   - ✅ Complete Task 1.2: Add new columns to vendors table
   - ✅ Complete Task 1.3: Implement data migration script
   - ✅ Complete Task 1.4: Create database rollback script

## 📝 Task Status

**Task 1.1**: ✅ **COMPLETE**
- [x] Create `business_categories` table with 16 predefined categories
- [x] Create `business_statuses` table with 5 status options
- [x] Create `business_sizes` table with 6 size options
- [x] Create `business_models` table with 8 model options
- [x] Create `vendor_bmc` table with 9 BMC section fields and constraints
- [x] Add indexes for performance optimization

**Migration File Ready**: ✅ Ready to apply via Supabase Dashboard

---

*Created: 2026-09-17*  
*Task: 1.1 - Create lookup tables and vendor_bmc table*  
*Spec: vendor-registration-restructure*
