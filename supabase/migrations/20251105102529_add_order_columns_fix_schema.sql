-- Migration: Add missing columns and remove unused ones
-- Date: 2025-11-05
-- Purpose: Prepare orders tables for Stage 2 processor

-- Add missing columns for order processing
ALTER TABLE orders_bannos
  ADD COLUMN IF NOT EXISTS human_id text,
  ADD COLUMN IF NOT EXISTS product_image text,
  ADD COLUMN IF NOT EXISTS flavour_1 text,
  ADD COLUMN IF NOT EXISTS flavour_2 text;

ALTER TABLE orders_flourlane
  ADD COLUMN IF NOT EXISTS human_id text,
  ADD COLUMN IF NOT EXISTS product_image text,
  ADD COLUMN IF NOT EXISTS flavour_1 text,
  ADD COLUMN IF NOT EXISTS flavour_2 text;

-- Remove columns we don't need in production
ALTER TABLE orders_bannos
  DROP COLUMN IF EXISTS flavour,
  DROP COLUMN IF EXISTS currency,
  DROP COLUMN IF EXISTS total_amount;

ALTER TABLE orders_flourlane
  DROP COLUMN IF EXISTS flavour,
  DROP COLUMN IF EXISTS currency,
  DROP COLUMN IF EXISTS total_amount;

