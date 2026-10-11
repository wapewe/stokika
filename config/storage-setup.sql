-- Supabase Storage Setup for Stokika
-- Run this in Supabase SQL Editor after creating buckets

-- ============================================
-- STORAGE BUCKETS
-- ============================================
-- Create these buckets in Supabase Dashboard → Storage
-- 1. uploads (private) - General file uploads
-- 2. avatars (public) - User profile pictures
-- 3. documents (private) - Business documents
-- 4. products (public) - Product images

-- ============================================
-- RLS POLICIES FOR UPLOADS BUCKET
-- ============================================

-- Policy: Users can upload their own files
CREATE POLICY "Users can upload own files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'uploads' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can view their own files
CREATE POLICY "Users can view own files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'uploads' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can update their own files
CREATE POLICY "Users can update own files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'uploads' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can delete their own files
CREATE POLICY "Users can delete own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'uploads' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================
-- RLS POLICIES FOR AVATARS BUCKET (PUBLIC)
-- ============================================

-- Policy: Anyone can view avatars
CREATE POLICY "Public avatars are viewable"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Policy: Users can upload their own avatar
CREATE POLICY "Users can upload own avatar"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can update their own avatar
CREATE POLICY "Users can update own avatar"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can delete their own avatar
CREATE POLICY "Users can delete own avatar"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================
-- RLS POLICIES FOR DOCUMENTS BUCKET
-- ============================================

-- Policy: Users can upload documents
CREATE POLICY "Users can upload documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Users can view own documents
CREATE POLICY "Users can view own documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'documents' AND
    auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy: Admins can view all documents
CREATE POLICY "Admins can view all documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'documents' AND
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
);

-- ============================================
-- RLS POLICIES FOR PRODUCTS BUCKET (PUBLIC)
-- ============================================

-- Policy: Anyone can view product images
CREATE POLICY "Public product images viewable"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'products');

-- Policy: Suppliers can upload product images
CREATE POLICY "Suppliers can upload products"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'products' AND
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.user_type = 'supplier'
    )
);

-- Policy: Suppliers can update their product images
CREATE POLICY "Suppliers can update products"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'products' AND
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.user_type = 'supplier'
    )
);

-- Policy: Suppliers can delete their product images
CREATE POLICY "Suppliers can delete products"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'products' AND
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.user_type = 'supplier'
    )
);

-- ============================================
-- FILE METADATA TABLE (OPTIONAL)
-- ============================================

CREATE TABLE IF NOT EXISTS file_uploads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_type TEXT NOT NULL,
    bucket_id TEXT NOT NULL,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE file_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own uploads"
ON file_uploads FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users insert own uploads"
ON file_uploads FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users delete own uploads"
ON file_uploads FOR DELETE TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins view all uploads"
ON file_uploads FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
);

-- ============================================
-- STORAGE FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION format_file_size(bytes BIGINT)
RETURNS TEXT AS $$
BEGIN
    IF bytes < 1024 THEN
        RETURN bytes || ' B';
    ELSIF bytes < 1048576 THEN
        RETURN ROUND(bytes / 1024.0, 2) || ' KB';
    ELSIF bytes < 1073741824 THEN
        RETURN ROUND(bytes / 1048576.0, 2) || ' MB';
    ELSE
        RETURN ROUND(bytes / 1073741824.0, 2) || ' GB';
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cleanup_old_files()
RETURNS void AS $$
BEGIN
    DELETE FROM file_uploads
    WHERE uploaded_at < NOW() - INTERVAL '1 year';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_file_uploads_user_id ON file_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_file_uploads_bucket_id ON file_uploads(bucket_id);
CREATE INDEX IF NOT EXISTS idx_file_uploads_uploaded_at ON file_uploads(uploaded_at);
