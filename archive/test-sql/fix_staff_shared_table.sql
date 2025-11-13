-- Fix staff_shared table structure
-- Remove row_id column and make user_id NOT NULL

-- =============================================
-- STEP 1: Check current table structure
-- =============================================

SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'staff_shared' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- =============================================
-- STEP 2: Remove row_id column if it exists
-- =============================================

ALTER TABLE public.staff_shared 
DROP COLUMN IF EXISTS row_id;

-- =============================================
-- STEP 3: Make user_id NOT NULL
-- =============================================

-- First, update any NULL user_ids (shouldn't be any, but just in case)
UPDATE public.staff_shared 
SET user_id = '00000000-0000-0000-0000-000000000000'::uuid 
WHERE user_id IS NULL;

-- Then make the column NOT NULL
ALTER TABLE public.staff_shared 
ALTER COLUMN user_id SET NOT NULL;

-- =============================================
-- STEP 4: Verify the fix
-- =============================================

SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'staff_shared' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'staff_shared table structure fixed!' as status;