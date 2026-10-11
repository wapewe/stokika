# Database Migration Complete ✅

## Migration Status

**Migration**: `20261011200000_add_document_urls_to_field_agents.sql`  
**Status**: ✅ **SUCCESSFULLY APPLIED**  
**Date**: 2026-10-11  
**Applied to**: Remote Supabase Database (stokika project)

---

## What Was Added

### New Columns in `field_agents` Table

| Column Name | Data Type | Purpose |
|------------|-----------|---------|
| `id_front_url` | TEXT | URL for National ID Front image |
| `id_back_url` | TEXT | URL for National ID Back image |
| `cv_url` | TEXT | URL for CV/Resume document |
| `chief_letter_url` | TEXT | URL for Chief Letter PDF |
| `passport_photo_url` | TEXT | URL for Passport Photo |
| `good_conduct_url` | TEXT | URL for Good Conduct Certificate (optional) |

### Migration Output

```
Applying migration 20261011200000_add_document_urls_to_field_agents.sql...
Finished supabase db push.
✅ SUCCESS
```

---

## Next Steps

### Step 1: Set Up Storage Bucket (Required)

You need to run the storage setup SQL in Supabase Dashboard:

**Option A: Via Supabase Dashboard (Recommended)**

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of: `supabase/migrations/STORAGE_SETUP.sql`
4. Click **Run** button
5. Verify success messages

**Option B: Via Supabase Dashboard UI**

1. Go to **Storage** in Supabase Dashboard
2. Click **New bucket**
3. Name: `application-documents`
4. Public: **NO** (keep private)
5. File size limit: 10 MB
6. Allowed MIME types:
   - image/jpeg
   - image/jpg
   - image/png
   - application/pdf
   - application/msword
   - application/vnd.openxmlformats-officedocument.wordprocessingml.document
7. Click **Create**
8. Go to **Policies** tab and add the policies from STORAGE_SETUP.sql

---

## Verification

### Check Database Columns

Run this query in SQL Editor:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'field_agents'
AND column_name LIKE '%_url'
ORDER BY ordinal_position;
```

**Expected Result**: 6 columns (all TEXT, nullable)

### Check Storage Bucket (After Setup)

```sql
SELECT * FROM storage.buckets WHERE id = 'application-documents';
```

**Expected Result**: 1 row with bucket details

### Check Storage Policies (After Setup)

```sql
SELECT policyname, cmd, roles
FROM storage.policies 
WHERE bucket_id = 'application-documents'
ORDER BY policyname;
```

**Expected Result**: 4 policies

---

## Testing Document Upload

### Test Flow

1. **Go to**: `field-agent.html`
2. **Fill out** all form fields
3. **Attach documents**:
   - National ID Front (JPG/PNG/PDF)
   - National ID Back (JPG/PNG/PDF)
   - CV (PDF/DOC/DOCX)
   - Chief Letter (PDF)
   - Passport Photo (JPG/PNG)
   - Good Conduct Certificate (PDF) - optional
4. **Click** "Submit Application"
5. **Watch** button progress:
   - "Submitting..."
   - "Uploading documents..."
   - "Saving application..."
   - "✓ Success! Redirecting..."
6. **Verify** redirect to success page with application code

### Verify Upload Success

**In Supabase Dashboard:**

1. Go to **Storage** → `application-documents`
2. Navigate to `field-agents/{application-code}/`
3. Verify 5-6 files are present

**In Database:**

```sql
SELECT 
    application_code,
    id_front_url,
    id_back_url,
    cv_url,
    chief_letter_url,
    passport_photo_url,
    good_conduct_url,
    created_at
FROM field_agents
ORDER BY created_at DESC
LIMIT 1;
```

**Expected**: All URL fields should have values starting with your Supabase Storage URL

---

## File Storage Structure

```
application-documents/
└── field-agents/
    ├── FA-0001/
    │   ├── FA-0001_idFront_1697123456789.jpg
    │   ├── FA-0001_idBack_1697123456790.jpg
    │   ├── FA-0001_cv_1697123456791.pdf
    │   ├── FA-0001_chiefLetter_1697123456792.pdf
    │   ├── FA-0001_passportPhoto_1697123456793.jpg
    │   └── FA-0001_goodConduct_1697123456794.pdf (optional)
    ├── FA-0002/
    │   └── ...
    └── ...
```

---

## Security

### Bucket Configuration
- ✅ Private bucket (not publicly accessible)
- ✅ 10 MB file size limit
- ✅ Restricted MIME types
- ✅ Organized folder structure

### Access Control
- ✅ Authenticated users can upload
- ✅ Admin users can view all documents
- ✅ Service role has full access
- ✅ Regular users can view only their own documents

---

## Troubleshooting

### Issue: "Bucket does not exist" error

**Solution**: Run `STORAGE_SETUP.sql` in Supabase Dashboard

### Issue: "Permission denied" when uploading

**Solution**: 
1. Check storage policies are configured
2. Verify user is authenticated
3. Check bucket is private (not public)

### Issue: Upload succeeds but URLs are null

**Solution**:
1. Check migration was applied (verify columns exist)
2. Check JavaScript console for errors
3. Verify Supabase Storage is enabled in project

### Issue: Files upload but can't view them

**Solution**:
1. Files are in private bucket - they need authentication
2. Admin users: Check you have admin role in profiles table
3. Use Supabase Dashboard to view files directly

---

## Files Modified/Created

### Database
- ✅ `supabase/migrations/20261011200000_add_document_urls_to_field_agents.sql` - Applied
- ✅ `supabase/migrations/STORAGE_SETUP.sql` - Ready to run
- ✅ `field_agents` table - 6 new columns added

### Frontend
- ✅ `js/pages/field-agent-form.page.js` - Upload logic implemented

### Documentation
- ✅ `SUPABASE_STORAGE_SETUP.md` - Complete setup guide
- ✅ `DATABASE_MIGRATION_COMPLETE.md` - This file

---

## Quick Start Commands

### View Recent Applications with Documents

```sql
SELECT 
    application_code,
    first_name,
    last_name,
    email,
    phone,
    CASE 
        WHEN id_front_url IS NOT NULL THEN '✓' 
        ELSE '✗' 
    END as has_id_front,
    CASE 
        WHEN id_back_url IS NOT NULL THEN '✓' 
        ELSE '✗' 
    END as has_id_back,
    CASE 
        WHEN cv_url IS NOT NULL THEN '✓' 
        ELSE '✗' 
    END as has_cv,
    CASE 
        WHEN chief_letter_url IS NOT NULL THEN '✓' 
        ELSE '✗' 
    END as has_chief_letter,
    CASE 
        WHEN passport_photo_url IS NOT NULL THEN '✓' 
        ELSE '✗' 
    END as has_passport,
    CASE 
        WHEN good_conduct_url IS NOT NULL THEN '✓' 
        ELSE '✗' 
    END as has_good_conduct,
    created_at
FROM field_agents
ORDER BY created_at DESC
LIMIT 10;
```

### Count Applications with Complete Documents

```sql
SELECT 
    COUNT(*) as total_applications,
    COUNT(id_front_url) as has_id_front,
    COUNT(id_back_url) as has_id_back,
    COUNT(cv_url) as has_cv,
    COUNT(chief_letter_url) as has_chief_letter,
    COUNT(passport_photo_url) as has_passport,
    COUNT(good_conduct_url) as has_good_conduct
FROM field_agents;
```

---

## Summary

✅ **Database Migration**: Complete  
⏳ **Storage Bucket**: Needs setup (run STORAGE_SETUP.sql)  
✅ **Upload Code**: Implemented  
✅ **Frontend**: Ready  
📝 **Documentation**: Complete  

**Next Action**: Run `STORAGE_SETUP.sql` in Supabase Dashboard SQL Editor

---

**Status**: Database Ready, Storage Pending  
**Date**: 2026-10-11  
**Project**: stokika  
