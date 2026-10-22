-- ============================================================================
-- SUPPLIER REGISTRATION FIX
-- Apply this SQL in Supabase SQL Editor
-- ============================================================================

-- Make profile_id nullable in suppliers table
-- This allows supplier registration without requiring authentication
ALTER TABLE public.suppliers 
ALTER COLUMN profile_id DROP NOT NULL;

-- Add comment explaining the nullable profile_id
COMMENT ON COLUMN public.suppliers.profile_id IS 
'User profile ID - nullable to allow unauthenticated supplier registration. Will be linked during verification process.';

-- Verify the change
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'suppliers'
  AND column_name = 'profile_id';

-- Expected result: is_nullable should be 'YES'
