# Fix Storage Upload Error - "mime type image/png is not supported"

## Problem
The Supabase storage bucket `application-documents` is rejecting PNG files with the error:
```
StorageApiError: mime type image/png is not supported
```

## Solution Steps

### Option 1: Run SQL Migration (Recommended)

1. **Go to Supabase Dashboard**
   - Navigate to: https://supabase.com/dashboard
   - Select your project: `stokika`

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Run the Migration**
   - Copy the entire contents from: `supabase/migrations/20261011_fix_storage_mime_types.sql`
   - Paste into the SQL Editor
   - Click "Run" or press `Ctrl+Enter`

4. **Verify Success**
   - Check the query results
   - You should see the updated bucket with all MIME types listed
   - All storage policies should be listed

### Option 2: Update via Dashboard (Alternative)

1. **Go to Storage Settings**
   - Navigate to: Storage > Configuration
   - Find the `application-documents` bucket

2. **Edit Bucket Settings**
   - Click on the bucket name
   - Click "Edit bucket" or settings icon
   - Update "Allowed MIME types" to include:
     ```
     image/jpeg
     image/jpg
     image/png
     image/webp
     application/pdf
     application/msword
     application/vnd.openxmlformats-officedocument.wordprocessingml.document
     application/octet-stream
     ```

3. **Update Bucket to Public (if needed)**
   - Toggle "Public bucket" to ON
   - This allows easier file access for the forms

4. **Save Changes**

### Option 3: Make Bucket Public (Quick Fix)

If the above doesn't work, making the bucket public will bypass most restrictions:

```sql
-- Run this in SQL Editor
UPDATE storage.buckets 
SET public = true 
WHERE id = 'application-documents';
```

## Verification

After applying the fix, test by:

1. **Opening supervisor-onboarding.html**
2. **Filling out the form**
3. **Uploading a PNG file**
4. **Submitting the form**

The upload should now work without the MIME type error.

## Additional Fixes Applied

### CSP Headers Updated
- Added `'unsafe-inline'` to `style-src` directive
- This allows the notification toasts to display properly
- Updated in both:
  - `field-agent.html`
  - `supervisor-onboarding.html`

### Storage Policies Added
- Added policies for supervisors folder
- Added policies for anonymous (anon) users
- This allows public form submissions without authentication

## Files Modified

1. ✅ `field-agent.html` - CSP updated
2. ✅ `supervisor-onboarding.html` - CSP updated  
3. ✅ `supabase/migrations/20261011_fix_storage_mime_types.sql` - New migration created

## Next Steps

1. Run the SQL migration in Supabase Dashboard
2. Test both forms:
   - field-agent.html
   - supervisor-onboarding.html
3. Verify files upload successfully
4. Verify redirect to registration-success.html works

## Troubleshooting

### If uploads still fail:

1. **Check Browser Console** for specific error messages
2. **Check Supabase Logs** 
   - Go to: Logs > Edge Logs
   - Look for 400/403 errors
3. **Verify RLS Policies**
   - Go to: Authentication > Policies
   - Ensure anon role has INSERT permissions
4. **Check File Size**
   - Maximum: 10MB per file
   - Larger files will be rejected

### If notifications don't show:

1. Check browser console for CSP violations
2. Ensure CSP header includes `'unsafe-inline'` in style-src
3. Clear browser cache and reload

## Success Indicators

✅ Form submits without errors  
✅ Loading overlay appears with progress messages  
✅ Success notification shows  
✅ Redirects to registration-success.html with application code  
✅ Files are visible in Supabase Storage dashboard  

## Support

If issues persist:
- Check Supabase logs for detailed error messages
- Verify database tables have the required `*_url` columns
- Ensure Supabase API keys are correct in environment variables
