-- Migration: Remove unused 'Urgent' value from priority_level enum
-- Issue: #455
--
-- The 'Urgent' enum value was added but never used. This migration removes it
-- to keep the schema clean. The system uses only High, Medium, Low priorities.

-- 1. Safety check: Verify no data uses 'Urgent' (will fail if any exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM orders_bannos WHERE priority = 'Urgent') THEN
    RAISE EXCEPTION 'Cannot remove Urgent: orders_bannos has rows using it';
  END IF;
  IF EXISTS (SELECT 1 FROM orders_flourlane WHERE priority = 'Urgent') THEN
    RAISE EXCEPTION 'Cannot remove Urgent: orders_flourlane has rows using it';
  END IF;
END $$;

-- 2. Rename old enum (preserves it until migration succeeds)
ALTER TYPE priority_level RENAME TO priority_level_old;

-- 3. Create new enum without 'Urgent'
CREATE TYPE priority_level AS ENUM ('High', 'Medium', 'Low');

-- 4. Update columns to use new enum (explicit cast prevents data loss)
ALTER TABLE orders_bannos
  ALTER COLUMN priority TYPE priority_level
  USING priority::text::priority_level;

ALTER TABLE orders_flourlane
  ALTER COLUMN priority TYPE priority_level
  USING priority::text::priority_level;

-- 5. Update default values to use new enum type
ALTER TABLE orders_bannos
  ALTER COLUMN priority SET DEFAULT 'Medium'::priority_level;

ALTER TABLE orders_flourlane
  ALTER COLUMN priority SET DEFAULT 'Medium'::priority_level;

-- 6. Drop old enum (only after columns successfully migrated)
DROP TYPE priority_level_old;
