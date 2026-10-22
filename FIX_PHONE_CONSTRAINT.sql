-- ============================================================================
-- FIX SUPPLIER PHONE NUMBER CONSTRAINT
-- Current constraint requires: ^254[0-9]{9}$ (e.g., 254712345678)
-- But users enter: 0712345678 or +254712345678
-- Solution: Make constraint more flexible OR normalize phone in Edge Function
-- ============================================================================

-- OPTION 1: Make constraint flexible (recommended for user experience)
-- Drop existing constraint
ALTER TABLE public.suppliers 
DROP CONSTRAINT IF EXISTS suppliers_contact_phone_check;

-- Add flexible phone constraint that accepts multiple formats:
-- ✅ 254712345678    (current requirement)
-- ✅ +254712345678   (with +)
-- ✅ 0712345678      (Kenyan local format)
ALTER TABLE public.suppliers
ADD CONSTRAINT suppliers_contact_phone_check 
CHECK (
  contact_phone IS NULL 
  OR contact_phone ~ '^(\+?254|0)[17]\d{8}$'
);

-- Verify the constraint was applied
SELECT 
  conname AS constraint_name, 
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint 
WHERE conrelid = 'public.suppliers'::regclass 
  AND conname = 'suppliers_contact_phone_check';

-- Add explanatory comment
COMMENT ON CONSTRAINT suppliers_contact_phone_check ON public.suppliers IS 
'Validates Kenyan phone numbers. Accepts: 0712345678, 254712345678, or +254712345678';

-- Test the new constraint (should all pass)
-- SELECT '254712345678' ~ '^(\+?254|0)[17]\d{8}$' AS test1;  -- true
-- SELECT '+254712345678' ~ '^(\+?254|0)[17]\d{8}$' AS test2; -- true  
-- SELECT '0712345678' ~ '^(\+?254|0)[17]\d{8}$' AS test3;    -- true
-- SELECT '0789988988' ~ '^(\+?254|0)[17]\d{8}$' AS test4;    -- true
