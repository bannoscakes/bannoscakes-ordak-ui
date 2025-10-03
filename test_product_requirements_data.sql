-- Test Product Requirements Data for ProductRequirements Component
-- Run this in Supabase SQL Editor

-- First, let's see what components we have
SELECT id, sku, name FROM public.components ORDER BY name LIMIT 10;

-- Insert sample product requirements
-- These link Shopify products to required components

INSERT INTO public.product_requirements (
  shopify_product_id, 
  shopify_variant_id, 
  product_title, 
  component_id, 
  quantity_per_unit, 
  is_optional, 
  auto_deduct
) 
SELECT 
  'shopify-12345' as shopify_product_id,
  'variant-001' as shopify_variant_id,
  'Spiderman Theme Cake' as product_title,
  c.id as component_id,
  1.0 as quantity_per_unit,
  false as is_optional,
  true as auto_deduct
FROM public.components c
WHERE c.name ILIKE '%spiderman%'
LIMIT 1;

INSERT INTO public.product_requirements (
  shopify_product_id, 
  shopify_variant_id, 
  product_title, 
  component_id, 
  quantity_per_unit, 
  is_optional, 
  auto_deduct
) 
SELECT 
  'shopify-12346' as shopify_product_id,
  'variant-002' as shopify_variant_id,
  'Batman Birthday Cake' as product_title,
  c.id as component_id,
  1.0 as quantity_per_unit,
  false as is_optional,
  true as auto_deduct
FROM public.components c
WHERE c.name ILIKE '%batman%'
LIMIT 1;

INSERT INTO public.product_requirements (
  shopify_product_id, 
  shopify_variant_id, 
  product_title, 
  component_id, 
  quantity_per_unit, 
  is_optional, 
  auto_deduct
) 
SELECT 
  'shopify-12347' as shopify_product_id,
  'variant-003' as shopify_variant_id,
  'Princess Castle Cake' as product_title,
  c.id as component_id,
  1.0 as quantity_per_unit,
  false as is_optional,
  true as auto_deduct
FROM public.components c
WHERE c.name ILIKE '%princess%'
LIMIT 1;

INSERT INTO public.product_requirements (
  shopify_product_id, 
  shopify_variant_id, 
  product_title, 
  component_id, 
  quantity_per_unit, 
  is_optional, 
  auto_deduct
) 
SELECT 
  'shopify-12348' as shopify_product_id,
  'variant-004' as shopify_variant_id,
  'Elegant Wedding Cake' as product_title,
  c.id as component_id,
  1.0 as quantity_per_unit,
  false as is_optional,
  true as auto_deduct
FROM public.components c
WHERE c.name ILIKE '%wedding%'
LIMIT 1;

INSERT INTO public.product_requirements (
  shopify_product_id, 
  shopify_variant_id, 
  product_title, 
  component_id, 
  quantity_per_unit, 
  is_optional, 
  auto_deduct
) 
SELECT 
  'shopify-12349' as shopify_product_id,
  'variant-005' as shopify_variant_id,
  'Premium Birthday Celebration' as product_title,
  c.id as component_id,
  1.0 as quantity_per_unit,
  false as is_optional,
  true as auto_deduct
FROM public.components c
WHERE c.name ILIKE '%birthday%'
LIMIT 1;

-- Add some requirements for cake bases and boxes
INSERT INTO public.product_requirements (
  shopify_product_id, 
  shopify_variant_id, 
  product_title, 
  component_id, 
  quantity_per_unit, 
  is_optional, 
  auto_deduct
) 
SELECT 
  'shopify-12345' as shopify_product_id,
  'variant-001' as shopify_variant_id,
  'Spiderman Theme Cake' as product_title,
  c.id as component_id,
  1.0 as quantity_per_unit,
  false as is_optional,
  true as auto_deduct
FROM public.components c
WHERE c.name ILIKE '%cake base%'
LIMIT 1;

INSERT INTO public.product_requirements (
  shopify_product_id, 
  shopify_variant_id, 
  product_title, 
  component_id, 
  quantity_per_unit, 
  is_optional, 
  auto_deduct
) 
SELECT 
  'shopify-12345' as shopify_product_id,
  'variant-001' as shopify_variant_id,
  'Spiderman Theme Cake' as product_title,
  c.id as component_id,
  1.0 as quantity_per_unit,
  false as is_optional,
  true as auto_deduct
FROM public.components c
WHERE c.name ILIKE '%cake box%'
LIMIT 1;

-- Add some requirements for candles
INSERT INTO public.product_requirements (
  shopify_product_id, 
  shopify_variant_id, 
  product_title, 
  component_id, 
  quantity_per_unit, 
  is_optional, 
  auto_deduct
) 
SELECT 
  'shopify-12346' as shopify_product_id,
  'variant-002' as shopify_variant_id,
  'Batman Birthday Cake' as product_title,
  c.id as component_id,
  1.0 as quantity_per_unit,
  false as is_optional,
  true as auto_deduct
FROM public.components c
WHERE c.name ILIKE '%candles%'
LIMIT 1;

-- Verify the data was created
SELECT 
  pr.product_title,
  pr.shopify_product_id,
  pr.shopify_variant_id,
  c.name as component_name,
  c.sku as component_sku,
  pr.quantity_per_unit,
  pr.is_optional,
  pr.auto_deduct
FROM public.product_requirements pr
JOIN public.components c ON pr.component_id = c.id
ORDER BY pr.product_title, c.name;
