-- Script to Extract All RPC Function Definitions
-- Purpose: Get complete SQL definitions of all functions for migration files
-- Date: 2025-11-06
-- 
-- INSTRUCTIONS:
-- 1. Run this in Supabase SQL Editor
-- 2. Copy the results
-- 3. Save to a file for processing

-- Get all function definitions with their complete SQL
SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition,
    pg_catalog.obj_description(p.oid, 'pg_proc') as description,
    CASE 
        WHEN p.proname LIKE '%queue%' THEN 'queue_management'
        WHEN p.proname LIKE '%staff%' OR p.proname LIKE '%shift%' OR p.proname LIKE '%break%' THEN 'staff_management'
        WHEN p.proname LIKE '%assign%' OR p.proname LIKE '%order%' THEN 'order_management'
        WHEN p.proname LIKE '%scan%' OR p.proname LIKE '%barcode%' OR p.proname LIKE '%filling%' OR p.proname LIKE '%covering%' OR p.proname LIKE '%decorating%' OR p.proname LIKE '%packing%' THEN 'scanner_stage'
        WHEN p.proname LIKE '%component%' OR p.proname LIKE '%stock%' OR p.proname LIKE '%bom%' OR p.proname LIKE '%inventory%' OR p.proname LIKE '%keyword%' OR p.proname LIKE '%requirement%' THEN 'inventory'
        WHEN p.proname LIKE '%setting%' OR p.proname LIKE '%flavour%' OR p.proname LIKE '%storage%' OR p.proname LIKE '%monitor%' OR p.proname LIKE '%printing%' THEN 'settings'
        WHEN p.proname LIKE '%complete%' THEN 'complete_grid'
        WHEN p.proname LIKE '%message%' OR p.proname LIKE '%conversation%' OR p.proname LIKE '%participant%' THEN 'messaging'
        WHEN p.proname LIKE '%shopify%' OR p.proname LIKE '%catalog%' OR p.proname LIKE '%storefront%' THEN 'shopify'
        WHEN p.proname LIKE '%bulk%' OR p.proname LIKE '%cancel%' THEN 'admin'
        ELSE 'other'
    END as category
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prokind = 'f'  -- Only functions, not procedures
  AND p.proname NOT LIKE 'pg_%'  -- Exclude PostgreSQL internal functions
ORDER BY category, p.proname;

-- Count by category
SELECT 
    CASE 
        WHEN p.proname LIKE '%queue%' THEN 'queue_management'
        WHEN p.proname LIKE '%staff%' OR p.proname LIKE '%shift%' OR p.proname LIKE '%break%' THEN 'staff_management'
        WHEN p.proname LIKE '%assign%' OR p.proname LIKE '%order%' THEN 'order_management'
        WHEN p.proname LIKE '%scan%' OR p.proname LIKE '%barcode%' OR p.proname LIKE '%filling%' OR p.proname LIKE '%covering%' OR p.proname LIKE '%decorating%' OR p.proname LIKE '%packing%' THEN 'scanner_stage'
        WHEN p.proname LIKE '%component%' OR p.proname LIKE '%stock%' OR p.proname LIKE '%bom%' OR p.proname LIKE '%inventory%' OR p.proname LIKE '%keyword%' OR p.proname LIKE '%requirement%' THEN 'inventory'
        WHEN p.proname LIKE '%setting%' OR p.proname LIKE '%flavour%' OR p.proname LIKE '%storage%' OR p.proname LIKE '%monitor%' OR p.proname LIKE '%printing%' THEN 'settings'
        WHEN p.proname LIKE '%complete%' THEN 'complete_grid'
        WHEN p.proname LIKE '%message%' OR p.proname LIKE '%conversation%' OR p.proname LIKE '%participant%' THEN 'messaging'
        WHEN p.proname LIKE '%shopify%' OR p.proname LIKE '%catalog%' OR p.proname LIKE '%storefront%' THEN 'shopify'
        WHEN p.proname LIKE '%bulk%' OR p.proname LIKE '%cancel%' THEN 'admin'
        ELSE 'other'
    END as category,
    COUNT(*) as function_count
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prokind = 'f'
  AND p.proname NOT LIKE 'pg_%'
GROUP BY category
ORDER BY category;

