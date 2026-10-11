-- ============================================================
-- SUPABASE STORAGE SETUP FOR APPLICATION DOCUMENTS
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================================

-- Step 1: Create Storage Bucket
-- Note: If bucket already exists, this will fail gracefully
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'application-documents',
    'application-documents',
    false, -- Private bucket
    10485760, -- 10 MB file size limit
    ARRAY[
        'image/jpeg',
        'image/jpg',
        'image/png',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
)
ON CONFLICT (id) DO NOTHING;

-- Step 2: Create Storage Policies

-- Policy 1: Allow authenticated users to upload to field-agents folder
CREATE POLICY IF NOT EXISTS "Allow authenticated uploads to field-agents folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'application-documents' 
    AND (storage.foldername(name))[1] = 'field-agents'
);

-- Policy 2: Service role has full access (for backend operations)
CREATE POLICY IF NOT EXISTS "Service role has full access"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'application-documents');

-- Policy 3: Admin users can view all documents
CREATE POLICY IF NOT EXISTS "Admin users can view all documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'application-documents'
    AND EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND (profiles.role = 'admin' OR profiles.user_type = 'admin')
    )
);

-- Policy 4: Users can view their own documents (if needed in future)
CREATE POLICY IF NOT EXISTS "Users can view their own documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'application-documents'
    AND auth.uid()::text = (storage.foldername(name))[2]
);

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Verify bucket was created
SELECT * FROM storage.buckets WHERE id = 'application-documents';

-- Verify policies were created
SELECT 
    policyname,
    cmd,
    roles
FROM storage.policies 
WHERE bucket_id = 'application-documents'
ORDER BY policyname;

-- Test query: Check if field_agents table has new columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'field_agents'
AND column_name LIKE '%_url'
ORDER BY ordinal_position;

-- ============================================================
-- SUCCESS MESSAGE
-- ============================================================
-- If all queries ran without errors, storage is ready!
-- You can now upload documents through the field agent form
-- ============================================================
