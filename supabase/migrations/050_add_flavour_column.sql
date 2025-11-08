-- 050_add_flavour_column.sql
-- Add nullable 'flavour' column to orders tables for Filling stage selection
-- Idempotent: uses IF NOT EXISTS to avoid errors across environments

-- Add flavour to orders_bannos
ALTER TABLE public.orders_bannos
  ADD COLUMN IF NOT EXISTS flavour text;

-- Add flavour to orders_flourlane
ALTER TABLE public.orders_flourlane
  ADD COLUMN IF NOT EXISTS flavour text;

-- Comments for clarity
COMMENT ON COLUMN public.orders_bannos.flavour
  IS 'Selected flavour for Filling stage (store-specific list)';

COMMENT ON COLUMN public.orders_flourlane.flavour
  IS 'Selected flavour for Filling stage (store-specific list)';


