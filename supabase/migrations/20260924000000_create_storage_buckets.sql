-- Create Storage Buckets for Stokika Application
-- This migration creates buckets for profile photos, application documents, and images

-- Enable storage if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. PROFILE PHOTOS BUCKET
-- =====================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'profile-photos',
    'profile-photos',
    true,  -- Public bucket (users can view their own and others' profile photos)
    5242880,  -- 5MB limit
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

-- RLS Policies for profile-photos bucket
CREATE POLICY "Users can view profile photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-photos');

CREATE POLICY "Users can upload their own profile photo"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'profile-photos' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own profile photo"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'profile-photos' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own profile photo"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'profile-photos' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- =====================================================
-- 2. APPLICATION IMAGES BUCKET (Field Agent & Supervisor)
-- =====================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'application-images',
    'application-images',
    false,  -- Private bucket (only admins and applicants can view)
    10485760,  -- 10MB limit
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

-- RLS Policies for application-images bucket
CREATE POLICY "Applicants can upload application images"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'application-images'
    AND (
        -- Allow uploads for authenticated users during application
        auth.uid() IS NOT NULL
        OR
        -- Allow anonymous uploads with specific folder structure (application_code/*)
        name LIKE 'field-agent/%' OR name LIKE 'supervisor/%'
    )
);

CREATE POLICY "Applicants can view their own application images"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'application-images'
    AND (
        -- Admins can view all
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.uid() = id
            AND raw_user_meta_data->>'role' = 'admin'
        )
        OR
        -- Users can view their own based on folder structure
        auth.uid()::text = (storage.foldername(name))[1]
    )
);

CREATE POLICY "Admins can delete application images"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'application-images'
    AND EXISTS (
        SELECT 1 FROM auth.users
        WHERE auth.uid() = id
        AND raw_user_meta_data->>'role' = 'admin'
    )
);

-- =====================================================
-- 3. APPLICATION DOCUMENTS BUCKET (PDFs, Word files)
-- =====================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'application-documents',
    'application-documents',
    false,  -- Private bucket
    20971520,  -- 20MB limit
    ARRAY[
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 20971520,
    allowed_mime_types = ARRAY[
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

-- RLS Policies for application-documents bucket
CREATE POLICY "Applicants can upload documents"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'application-documents'
    AND (
        auth.uid() IS NOT NULL
        OR
        name LIKE 'field-agent/%' OR name LIKE 'supervisor/%'
    )
);

CREATE POLICY "Applicants can view their own documents"
ON storage.objects FOR SELECT
USING (
    bucket_id = 'application-documents'
    AND (
        -- Admins can view all
        EXISTS (
            SELECT 1 FROM auth.users
            WHERE auth.uid() = id
            AND raw_user_meta_data->>'role' = 'admin'
        )
        OR
        -- Users can view their own
        auth.uid()::text = (storage.foldername(name))[1]
    )
);

CREATE POLICY "Admins can delete documents"
ON storage.objects FOR DELETE
USING (
    bucket_id = 'application-documents'
    AND EXISTS (
        SELECT 1 FROM auth.users
        WHERE auth.uid() = id
        AND raw_user_meta_data->>'role' = 'admin'
    )
);

-- =====================================================
-- 4. GENERAL IMAGES BUCKET (Other uploads)
-- =====================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'images',
    'images',
    true,  -- Public bucket for general images
    10485760,  -- 10MB limit
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];

-- RLS Policies for images bucket
CREATE POLICY "Anyone can view public images"
ON storage.objects FOR SELECT
USING (bucket_id = 'images');

CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
WITH CHECK (
    bucket_id = 'images'
    AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can update their own images"
ON storage.objects FOR UPDATE
USING (
    bucket_id = 'images'
    AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own images"
ON storage.objects FOR DELETE
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

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these to verify buckets were created:
-- SELECT id, name, public, file_size_limit FROM storage.buckets;
-- Storage buckets for Stokika application files
