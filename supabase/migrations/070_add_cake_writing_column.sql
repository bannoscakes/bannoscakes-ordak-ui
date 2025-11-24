-- Add cake_writing column to store cake writing text separately from flavour
-- This prevents cake writing properties from being mixed into the flavour field

ALTER TABLE orders_bannos ADD COLUMN IF NOT EXISTS cake_writing TEXT;
ALTER TABLE orders_flourlane ADD COLUMN IF NOT EXISTS cake_writing TEXT;

COMMENT ON COLUMN orders_bannos.cake_writing IS 'Cake writing text extracted from properties (e.g., "Happy Birthday")';
COMMENT ON COLUMN orders_flourlane.cake_writing IS 'Cake writing text extracted from properties (e.g., "Happy Birthday")';
