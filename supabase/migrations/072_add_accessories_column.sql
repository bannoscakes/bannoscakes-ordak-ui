-- Migration: Add accessories column to order tables
-- Purpose: Store accessory items (candles, balloons, toppers) with each order
-- For split orders, accessories are attached to the first order only

BEGIN;

-- Add accessories column to orders_bannos
ALTER TABLE public.orders_bannos 
ADD COLUMN IF NOT EXISTS accessories jsonb DEFAULT NULL;

-- Add accessories column to orders_flourlane
ALTER TABLE public.orders_flourlane 
ADD COLUMN IF NOT EXISTS accessories jsonb DEFAULT NULL;

-- Add comments
COMMENT ON COLUMN public.orders_bannos.accessories IS 'JSON array of accessory items from the Shopify order (candles, balloons, toppers). For split orders, attached to first order only.';
COMMENT ON COLUMN public.orders_flourlane.accessories IS 'JSON array of accessory items from the Shopify order (candles, balloons, toppers). For split orders, attached to first order only.';

COMMIT;
