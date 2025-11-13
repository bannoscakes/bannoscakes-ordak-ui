-- Simple Test Data for Inventory Components
-- This script creates basic test data using existing components

-- First, check what components exist
SELECT id, sku, name FROM components LIMIT 10;

-- Insert sample accessory keywords using existing components
INSERT INTO accessory_keywords (keyword, component_id, priority, match_type, is_active, created_at, updated_at)
SELECT 
  keyword,
  c.id as component_id,
  priority,
  match_type::accessory_keyword_match_type,
  is_active,
  NOW(),
  NOW()
FROM (
  VALUES 
    ('spiderman', 10, 'contains'),
    ('batman', 9, 'contains'),
    ('princess', 8, 'contains'),
    ('wedding', 7, 'contains'),
    ('birthday', 6, 'contains')
) AS v(keyword, priority, match_type)
CROSS JOIN (
  SELECT id FROM components LIMIT 1
) AS c;

-- Insert sample product requirements using existing components
INSERT INTO product_requirements (shopify_product_id, shopify_variant_id, product_title, component_id, quantity_per_unit, is_optional, auto_deduct, created_at, updated_at)
SELECT 
  'test-product-' || ROW_NUMBER() OVER(),
  'variant-test',
  'Test Product ' || ROW_NUMBER() OVER(),
  c.id,
  1,
  false,
  true,
  NOW(),
  NOW()
FROM components c
LIMIT 3;

-- Verify the data was inserted
SELECT 'Accessory Keywords:' as type, COUNT(*) as count FROM accessory_keywords
UNION ALL
SELECT 'Product Requirements:', COUNT(*) FROM product_requirements;
