-- NOTE: This migration documents changes already applied to production on 2025-11-05
-- It may fail in fresh environments that don't have the base tables
-- This is expected and okay - it's a documentation migration

-- Migration: Add missing columns and remove unused ones
-- Date: 2025-11-05
-- Purpose: Prepare orders tables for Stage 2 processor

-- Step 1: Add new columns
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

-- Step 2: Migrate existing flavour data to flavour_1
UPDATE orders_bannos 
SET flavour_1 = flavour 
WHERE flavour IS NOT NULL;

UPDATE orders_flourlane 
SET flavour_1 = flavour 
WHERE flavour IS NOT NULL;

-- Step 3: Remove old columns
ALTER TABLE orders_bannos
  DROP COLUMN IF EXISTS flavour,
  DROP COLUMN IF EXISTS currency,
  DROP COLUMN IF EXISTS total_amount;

ALTER TABLE orders_flourlane
  DROP COLUMN IF EXISTS flavour,
  DROP COLUMN IF EXISTS currency,
  DROP COLUMN IF EXISTS total_amount;

