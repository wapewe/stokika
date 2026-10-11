-- ============================================================
-- FIX STORAGE BUCKET MIME TYPES AND ADD SUPERVISOR POLICIES
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================================

-- Step 1: Update Storage Bucket to allow all required MIME types
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-word',
    'application/octet-stream'
]
WHERE id = 'application-documents';

-- Step 2: Add policy for supervisor folder uploads (drop first if exists)
DROP POLICY IF EXISTS "Allow authenticated uploads to supervisors folder" ON storage.objects;
CREATE POLICY "Allow authenticated uploads to supervisors folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'application-documents' 
    AND (storage.foldername(name))[1] = 'supervisors'
);

-- Step 3: Allow anon users to upload (for public forms)
DROP POLICY IF EXISTS "Allow anon uploads to field-agents folder" ON storage.objects;
CREATE POLICY "Allow anon uploads to field-agents folder"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (
    bucket_id = 'application-documents' 
    AND (storage.foldername(name))[1] = 'field-agents'
);

DROP POLICY IF EXISTS "Allow anon uploads to supervisors folder" ON storage.objects;
CREATE POLICY "Allow anon uploads to supervisors folder"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (
    bucket_id = 'application-documents' 
    AND (storage.foldername(name))[1] = 'supervisors'
);

-- Step 4: Allow public read access if bucket is public
DROP POLICY IF EXISTS "Allow public read access" ON storage.objects;
CREATE POLICY "Allow public read access"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'application-documents');

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Verify bucket settings were updated
SELECT 
    id, 
    name, 
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets 
WHERE id = 'application-documents';

-- Note: Storage policies can be viewed in Supabase Dashboard → Storage → Policies

-- ============================================================
-- ALTERNATIVE: If update doesn't work, make bucket public
-- ============================================================
-- Uncomment this if you want to make the bucket public for easier access:
-- UPDATE storage.buckets SET public = true WHERE id = 'application-documents';
