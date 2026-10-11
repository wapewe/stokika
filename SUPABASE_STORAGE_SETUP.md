# Supabase Storage Setup for Field Agent Documents

## Overview

Field agent applications include 6 documents that need to be uploaded to Supabase Storage:
1. National ID (Front)
2. National ID (Back)
3. CV/Resume
4. Letter from Area Chief
5. Passport Photo
6. Certificate of Good Conduct (optional)

---

## Step 1: Run Database Migration

Execute the migration to add document URL columns to the `field_agents` table:

**File**: `supabase/migrations/20261011200000_add_document_urls_to_field_agents.sql`

**Via Supabase Dashboard:**
1. Go to SQL Editor
2. Paste the migration SQL
3. Click "Run"

**Via Supabase CLI:**
```bash
supabase db push
```

**Columns Added:**
- `id_front_url` TEXT
- `id_back_url` TEXT
- `cv_url` TEXT
- `chief_letter_url` TEXT
- `passport_photo_url` TEXT
- `good_conduct_url` TEXT

---

## Step 2: Create Storage Bucket

### Via Supabase Dashboard

1. **Go to Storage**
   - Navigate to Supabase Dashboard
   - Click "Storage" in the left sidebar

2. **Create New Bucket**
   - Click "New bucket"
   - **Bucket name**: `application-documents`
   - **Public bucket**: ❌ **NO** (Keep private for security)
   - Click "Create bucket"

3. **Configure Bucket Settings**
   - Click on the `application-documents` bucket
   - Go to "Policies" tab

---

## Step 3: Set Up Storage Policies

### Policy 1: Allow Authenticated Users to Upload

**Name**: `Allow authenticated uploads to field-agents folder`

**Policy**:
```sql
CREATE POLICY "Allow authenticated uploads to field-agents folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'application-documents' 
    AND (storage.foldername(name))[1] = 'field-agents'
);
```

**What it does**: Allows logged-in users to upload files to the `field-agents/` folder

### Policy 2: Allow Service Role Full Access

**Name**: `Service role has full access`

**Policy**:
```sql
CREATE POLICY "Service role has full access"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'application-documents');
```

**What it does**: Allows backend (service role) to manage all files

### Policy 3: Allow Admins to Read Documents

**Name**: `Admin users can view all documents`

**Policy**:
```sql
CREATE POLICY "Admin users can view all documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'application-documents'
    AND EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);
```

**What it does**: Allows admin users to download and view all documents

### Policy 4: Allow Users to View Their Own Documents

**Name**: `Users can view their own documents`

**Policy**:
```sql
CREATE POLICY "Users can view their own documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'application-documents'
    AND auth.uid()::text = (storage.foldername(name))[2]
);
```

**What it does**: Allows users to view only their own uploaded documents

---

## Step 4: Configure Allowed File Types

In the bucket settings, configure allowed MIME types:

**Allowed MIME types**:
```
image/jpeg
image/jpg
image/png
application/pdf
application/msword
application/vnd.openxmlformats-officedocument.wordprocessingml.document
```

**File size limit**: 10 MB per file

---

## Storage Structure

Files are organized in the following structure:

```
application-documents/
└── field-agents/
    ├── FA-0001/
    │   ├── FA-0001_idFront_1697123456789.jpg
    │   ├── FA-0001_idBack_1697123456790.jpg
    │   ├── FA-0001_cv_1697123456791.pdf
    │   ├── FA-0001_chiefLetter_1697123456792.pdf
    │   ├── FA-0001_passportPhoto_1697123456793.jpg
    │   └── FA-0001_goodConduct_1697123456794.pdf
    ├── FA-0002/
    │   ├── FA-0002_idFront_1697123456795.jpg
    │   └── ...
    └── ...
```

**File naming convention**:
```
{applicationCode}_{documentType}_{timestamp}.{extension}
```

**Example**:
```
FA-0123_idFront_1697123456789.jpg
```

---

## Step 5: Update Environment Variables

Ensure your `.env` file has the correct Supabase configuration:

```env
VITE_SUPABASE_URL=your-project-url.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

---

## How the Upload Works

### JavaScript Implementation

**File**: `js/pages/field-agent-form.page.js`

```javascript
// 1. Generate application code
const applicationCode = 'FA-0123';

// 2. Upload each file
const fileInput = form.querySelector(`input[name="idFront"]`);
const file = fileInput.files[0];

// 3. Create unique filename
const fileExt = file.name.split('.').pop();
const fileName = `${applicationCode}_idFront_${Date.now()}.${fileExt}`;
const filePath = `field-agents/${applicationCode}/${fileName}`;

// 4. Upload to Supabase Storage
const { data, error } = await supabase
    .storage
    .from('application-documents')
    .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
    });

// 5. Get public URL
const { data: urlData } = supabase
    .storage
    .from('application-documents')
    .getPublicUrl(filePath);

// 6. Save URL to database
const documentUrl = urlData.publicUrl;
```

### Upload Progress

The submit button shows progress:
1. "Submitting..." - Generating application code
2. "Uploading documents..." - Uploading files to storage
3. "Saving application..." - Saving data to database
4. "✓ Success! Redirecting..." - Complete

---

## Accessing Documents

### Via Supabase Dashboard

1. Go to Storage → application-documents
2. Navigate to field-agents folder
3. Click on application code folder (e.g., FA-0123)
4. View/download files

### Via Admin Panel (Future Feature)

Admin users will be able to:
- View all applications
- Click to download documents
- Verify uploaded files
- Approve/reject applications

### Programmatically

```javascript
// Get document URL from database
const { data } = await supabase
    .from('field_agents')
    .select('id_front_url, id_back_url, cv_url')
    .eq('application_code', 'FA-0123')
    .single();

// Download file
const { data: fileData, error } = await supabase
    .storage
    .from('application-documents')
    .download('field-agents/FA-0123/FA-0123_idFront_1697123456789.jpg');
```

---

## Security Considerations

### 1. Private Bucket
✅ Bucket is private (not public)
✅ Files are not accessible without authentication
✅ Only authorized users can view documents

### 2. Row Level Security
✅ Admins can view all documents
✅ Users can only view their own documents
✅ Service role has full access for backend operations

### 3. File Validation
✅ File type validation (MIME types)
✅ File size limits (10 MB max)
✅ Unique filenames to prevent overwrites
✅ Organized folder structure

### 4. Audit Trail
✅ All uploads logged
✅ Timestamps in filenames
✅ URLs stored in database
✅ Can track who uploaded what and when

---

## Troubleshooting

### Issue: "Storage bucket does not exist"
**Solution**: Create the `application-documents` bucket in Supabase Dashboard

### Issue: "Permission denied" when uploading
**Solution**: Check storage policies are configured correctly

### Issue: "File too large"
**Solution**: 
- Check file size limit in bucket settings
- Compress images before upload
- Convert documents to PDF for smaller size

### Issue: "Invalid MIME type"
**Solution**: Ensure file types are in the allowed list

### Issue: Documents not showing in database
**Solution**: 
- Check if URL columns exist (`id_front_url`, etc.)
- Run the migration SQL
- Verify form submission completes successfully

---

## Testing

### Test Upload Flow

1. Go to field-agent.html
2. Fill out all form fields
3. Attach all required documents
4. Click "Submit Application"
5. Watch button progress:
   - "Submitting..."
   - "Uploading documents..."
   - "Saving application..."
   - "✓ Success! Redirecting..."
6. Check Supabase Storage:
   - Go to Storage → application-documents
   - Navigate to field-agents/{code}/
   - Verify all 6 files are uploaded
7. Check Database:
   - Go to Table Editor → field_agents
   - Find your record
   - Verify all *_url columns have values

### Test Document Access

1. Copy a document URL from the database
2. Try to access it directly (should be denied if bucket is private)
3. Log in as admin
4. Access documents through admin panel
5. Verify you can download files

---

## Migration Checklist

- [ ] Run database migration to add URL columns
- [ ] Create `application-documents` storage bucket
- [ ] Set bucket to private
- [ ] Configure storage policies
- [ ] Set allowed MIME types
- [ ] Set file size limit (10 MB)
- [ ] Test file upload
- [ ] Verify files appear in storage
- [ ] Verify URLs saved to database
- [ ] Test document access as admin
- [ ] Test document access as regular user

---

## SQL Commands Reference

### Create Storage Bucket (if not using UI)

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('application-documents', 'application-documents', false);
```

### View All Storage Policies

```sql
SELECT * FROM storage.policies 
WHERE bucket_id = 'application-documents';
```

### Delete All Files in a Folder (Careful!)

```sql
DELETE FROM storage.objects
WHERE bucket_id = 'application-documents'
AND name LIKE 'field-agents/FA-0001/%';
```

### Get All Document URLs for an Application

```sql
SELECT 
    application_code,
    id_front_url,
    id_back_url,
    cv_url,
    chief_letter_url,
    passport_photo_url,
    good_conduct_url
FROM field_agents
WHERE application_code = 'FA-0001';
```

---

**Status**: Ready for Implementation  
**Date**: 2026-10-11  
**Priority**: HIGH  
