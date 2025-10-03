-- Test Accessory Keywords Data for AccessoryKeywords Component
-- Run this in Supabase SQL Editor

-- First, let's see what components we have
SELECT id, sku, name FROM public.components ORDER BY name LIMIT 10;

-- Insert sample accessory keywords
-- These will help with automatic component matching based on keywords in order notes

INSERT INTO public.accessory_keywords (keyword, component_id, priority, match_type, is_active) 
SELECT 
  'spiderman' as keyword,
  c.id as component_id,
  10 as priority,
  'contains' as match_type,
  true as is_active
FROM public.components c
WHERE c.name ILIKE '%spiderman%'
LIMIT 1;

INSERT INTO public.accessory_keywords (keyword, component_id, priority, match_type, is_active) 
SELECT 
  'batman' as keyword,
  c.id as component_id,
  10 as priority,
  'contains' as match_type,
  true as is_active
FROM public.components c
WHERE c.name ILIKE '%batman%'
LIMIT 1;

INSERT INTO public.accessory_keywords (keyword, component_id, priority, match_type, is_active) 
SELECT 
  'princess' as keyword,
  c.id as component_id,
  10 as priority,
  'contains' as match_type,
  true as is_active
FROM public.components c
WHERE c.name ILIKE '%princess%'
LIMIT 1;

INSERT INTO public.accessory_keywords (keyword, component_id, priority, match_type, is_active) 
SELECT 
  'wedding' as keyword,
  c.id as component_id,
  10 as priority,
  'contains' as match_type,
  true as is_active
FROM public.components c
WHERE c.name ILIKE '%wedding%'
LIMIT 1;

INSERT INTO public.accessory_keywords (keyword, component_id, priority, match_type, is_active) 
SELECT 
  'birthday' as keyword,
  c.id as component_id,
  10 as priority,
  'contains' as match_type,
  true as is_active
FROM public.components c
WHERE c.name ILIKE '%birthday%'
LIMIT 1;

INSERT INTO public.accessory_keywords (keyword, component_id, priority, match_type, is_active) 
SELECT 
  'candles' as keyword,
  c.id as component_id,
  10 as priority,
  'contains' as match_type,
  true as is_active
FROM public.components c
WHERE c.name ILIKE '%candles%'
LIMIT 1;

INSERT INTO public.accessory_keywords (keyword, component_id, priority, match_type, is_active) 
SELECT 
  'topper' as keyword,
  c.id as component_id,
  5 as priority,
  'contains' as match_type,
  true as is_active
FROM public.components c
WHERE c.name ILIKE '%topper%'
LIMIT 1;

INSERT INTO public.accessory_keywords (keyword, component_id, priority, match_type, is_active) 
SELECT 
  'flowers' as keyword,
  c.id as component_id,
  5 as priority,
  'contains' as match_type,
  true as is_active
FROM public.components c
WHERE c.name ILIKE '%flowers%'
LIMIT 1;

INSERT INTO public.accessory_keywords (keyword, component_id, priority, match_type, is_active) 
SELECT 
  'banner' as keyword,
  c.id as component_id,
  5 as priority,
  'contains' as match_type,
  true as is_active
FROM public.components c
WHERE c.name ILIKE '%banner%'
LIMIT 1;

-- Add some generic keywords for common components
INSERT INTO public.accessory_keywords (keyword, component_id, priority, match_type, is_active) 
SELECT 
  'cake base' as keyword,
  c.id as component_id,
  8 as priority,
  'contains' as match_type,
  true as is_active
FROM public.components c
WHERE c.name ILIKE '%cake base%'
LIMIT 1;

INSERT INTO public.accessory_keywords (keyword, component_id, priority, match_type, is_active) 
SELECT 
  'cake box' as keyword,
  c.id as component_id,
  8 as priority,
  'contains' as match_type,
  true as is_active
FROM public.components c
WHERE c.name ILIKE '%cake box%'
LIMIT 1;

-- Verify the data was created
SELECT 
  ak.keyword,
  ak.priority,
  ak.match_type,
  ak.is_active,
  c.name as component_name,
  c.sku as component_sku
FROM public.accessory_keywords ak
JOIN public.components c ON ak.component_id = c.id
ORDER BY ak.priority DESC, ak.keyword;
