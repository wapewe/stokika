-- Make profile_id nullable in suppliers table
-- This allows supplier registration without requiring authentication
-- profile_id will be linked later during the verification process

ALTER TABLE public.suppliers 
ALTER COLUMN profile_id DROP NOT NULL;

-- Add comment explaining the nullable profile_id
COMMENT ON COLUMN public.suppliers.profile_id IS 
'User profile ID - nullable to allow unauthenticated supplier registration. Will be linked during verification process.';
