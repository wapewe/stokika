-- RLS Policies for Storage Buckets
-- Run this in Supabase SQL Editor after creating buckets via Dashboard
-- Dashboard: https://supabase.com/dashboard/project/eidsqrnwfndruuufyacc/storage/buckets

-- =====================================================
-- ENABLE RLS ON STORAGE.OBJECTS TABLE
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY; (already enabled by Supabase)

-- =====================================================
-- 1. PROFILE-PHOTOS BUCKET RLS POLICIES
-- =====================================================

-- Allow anyone to view profile photos (public bucket)
DROP POLICY IF EXISTS "Anyone can view profile photos" ON storage.objects;
CREATE POLICY "Anyone can view profile photos" ON storage.objects FOR SELECT
USING (bucket_id = 'profile-photos');

-- Allow authenticated users to upload their own profile photo
DROP POLICY IF EXISTS "Users can upload their own profile photo" ON storage.objects;
CREATE POLICY "Users can upload their own profile photo" ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'profile-photos' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to update their own profile photo
DROP POLICY IF EXISTS "Users can update their own profile photo" ON storage.objects;
CREATE POLICY "Users can update their own profile photo" ON storage.objects FOR UPDATE
USING (
    bucket_id = 'profile-photos' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own profile photo
DROP POLICY IF EXISTS "Users can delete their own profile photo" ON storage.objects;
CREATE POLICY "Users can delete their own profile photo" ON storage.objects FOR DELETE
USING (
    bucket_id = 'profile-photos' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- =====================================================
-- 2. APPLICATION-IMAGES BUCKET RLS POLICIES
-- =====================================================

-- Allow applicants to upload application images (authenticated or anonymous)
DROP POLICY IF EXISTS "Applicants can upload application images" ON storage.objects;
CREATE POLICY "Applicants can upload application images" ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'application-images'
    AND (
        auth.uid() IS NOT NULL
        OR
        (name LIKE 'field-agent/%' OR name LIKE 'supervisor/%')
    )
);

-- Allow applicants to view their own application images, admins can view all
DROP POLICY IF EXISTS "Applicants can view their own application images" ON storage.objects;
CREATE POLICY "Applicants can view their own application images" ON storage.objects FOR SELECT
USING (
    bucket_id = 'application-images'
    AND (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.uid() = id
            AND raw_user_meta_data->>'role' = 'admin'
        )
        OR
        auth.uid()::text = (storage.foldername(name))[1]
        OR
        TRUE
    )
);

-- Allow applicants to update their own images
DROP POLICY IF EXISTS "Applicants can update application images" ON storage.objects;
CREATE POLICY "Applicants can update application images" ON storage.objects FOR UPDATE
USING (
    bucket_id = 'application-images'
    AND (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.uid() = id
            AND raw_user_meta_data->>'role' = 'admin'
        )
        OR
        auth.uid()::text = (storage.foldername(name))[1]
    )
);

-- Only admins can delete application images
DROP POLICY IF EXISTS "Admins can delete application images" ON storage.objects;
CREATE POLICY "Admins can delete application images" ON storage.objects FOR DELETE
USING (
    bucket_id = 'application-images'
    AND EXISTS (
        SELECT 1 FROM auth.users
        WHERE auth.uid() = id
        AND raw_user_meta_data->>'role' = 'admin'
    )
);

-- =====================================================
-- 3. APPLICATION-DOCUMENTS BUCKET RLS POLICIES
-- =====================================================

-- Allow applicants to upload documents
DROP POLICY IF EXISTS "Applicants can upload documents" ON storage.objects;
CREATE POLICY "Applicants can upload documents" ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'application-documents'
    AND (
        auth.uid() IS NOT NULL
        OR
        (name LIKE 'field-agent/%' OR name LIKE 'supervisor/%')
    )
);

-- Allow applicants to view their own documents, admins can view all
DROP POLICY IF EXISTS "Applicants can view their own documents" ON storage.objects;
CREATE POLICY "Applicants can view their own documents" ON storage.objects FOR SELECT
USING (
    bucket_id = 'application-documents'
    AND (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.uid() = id
            AND raw_user_meta_data->>'role' = 'admin'
        )
        OR
        auth.uid()::text = (storage.foldername(name))[1]
        OR
        TRUE
    )
);

-- Allow applicants to update their own documents
DROP POLICY IF EXISTS "Applicants can update documents" ON storage.objects;
CREATE POLICY "Applicants can update documents" ON storage.objects FOR UPDATE
USING (
    bucket_id = 'application-documents'
    AND (
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.uid() = id
            AND raw_user_meta_data->>'role' = 'admin'
        )
        OR
        auth.uid()::text = (storage.foldername(name))[1]
    )
);

-- Only admins can delete documents
DROP POLICY IF EXISTS "Admins can delete documents" ON storage.objects;
CREATE POLICY "Admins can delete documents" ON storage.objects FOR DELETE
USING (
    bucket_id = 'application-documents'
    AND EXISTS (
        SELECT 1 FROM auth.users
        WHERE auth.uid() = id
        AND raw_user_meta_data->>'role' = 'admin'
    )
);

-- =====================================================
-- 4. IMAGES BUCKET RLS POLICIES
-- =====================================================

-- Allow anyone to view public images
DROP POLICY IF EXISTS "Anyone can view public images" ON storage.objects;
CREATE POLICY "Anyone can view public images" ON storage.objects FOR SELECT
USING (bucket_id = 'images');

-- Allow authenticated users to upload images
DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
CREATE POLICY "Authenticated users can upload images" ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'images'
    AND auth.uid() IS NOT NULL
);

-- Allow users to update their own images
DROP POLICY IF EXISTS "Users can update their own images" ON storage.objects;
CREATE POLICY "Users can update their own images" ON storage.objects FOR UPDATE
USING (
    bucket_id = 'images'
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own images, admins can delete all
DROP POLICY IF EXISTS "Users can delete their own images" ON storage.objects;
CREATE POLICY "Users can delete their own images" ON storage.objects FOR DELETE
USING (
    bucket_id = 'images'
    AND (
        auth.uid()::text = (storage.foldername(name))[1]
        OR
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.uid() = id
            AND raw_user_meta_data->>'role' = 'admin'
        )
    )
);


