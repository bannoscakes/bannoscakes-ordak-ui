-- Test Product Requirements Data
-- This script creates sample product requirements for testing the UI

-- Insert sample product requirements
INSERT INTO product_requirements (id, shopify_product_id, shopify_variant_id, product_title, component_id, quantity_per_unit, is_optional, auto_deduct, created_at, updated_at)
VALUES 
  -- Spiderman Theme Cake requirements
  ('pr_001', 'bannos-spiderman-theme-cake', 'variant_6inch', 'Spiderman Theme Cake', 'comp_001', 1, false, true, NOW(), NOW()),
  ('pr_002', 'bannos-spiderman-theme-cake', 'variant_6inch', 'Spiderman Theme Cake', 'comp_006', 1, false, true, NOW(), NOW()),
  ('pr_003', 'bannos-spiderman-theme-cake', 'variant_6inch', 'Spiderman Theme Cake', 'comp_007', 1, false, true, NOW(), NOW()),
  
  -- Batman Birthday Cake requirements
  ('pr_004', 'bannos-batman-birthday-cake', 'variant_8inch', 'Batman Birthday Cake', 'comp_002', 1, false, true, NOW(), NOW()),
  ('pr_005', 'bannos-batman-birthday-cake', 'variant_8inch', 'Batman Birthday Cake', 'comp_006', 1, false, true, NOW(), NOW()),
  ('pr_006', 'bannos-batman-birthday-cake', 'variant_8inch', 'Batman Birthday Cake', 'comp_008', 1, false, true, NOW(), NOW()),
  
  -- Princess Castle Cake requirements
  ('pr_007', 'flourlane-princess-castle-cake', 'variant_3tier', 'Princess Castle Cake', 'comp_003', 1, false, true, NOW(), NOW()),
  ('pr_008', 'flourlane-princess-castle-cake', 'variant_3tier', 'Princess Castle Cake', 'comp_006', 1, false, true, NOW(), NOW()),
  ('pr_009', 'flourlane-princess-castle-cake', 'variant_3tier', 'Princess Castle Cake', 'comp_009', 1, false, true, NOW(), NOW()),
  
  -- Elegant Wedding Cake requirements
  ('pr_010', 'flourlane-elegant-wedding-cake', 'variant_3tier', 'Elegant Wedding Cake', 'comp_004', 1, false, true, NOW(), NOW()),
  ('pr_011', 'flourlane-elegant-wedding-cake', 'variant_3tier', 'Elegant Wedding Cake', 'comp_006', 1, false, true, NOW(), NOW()),
  ('pr_012', 'flourlane-elegant-wedding-cake', 'variant_3tier', 'Elegant Wedding Cake', 'comp_010', 1, false, true, NOW(), NOW()),
  
  -- Premium Birthday Celebration requirements
  ('pr_013', 'bannos-premium-birthday-celebration', 'variant_2tier', 'Premium Birthday Celebration', 'comp_005', 1, false, true, NOW(), NOW()),
  ('pr_014', 'bannos-premium-birthday-celebration', 'variant_2tier', 'Premium Birthday Celebration', 'comp_006', 1, false, true, NOW(), NOW()),
  ('pr_015', 'bannos-premium-birthday-celebration', 'variant_2tier', 'Premium Birthday Celebration', 'comp_011', 1, false, true, NOW(), NOW()),
  
  -- Cake base requirements (common to all cakes)
  ('pr_016', 'bannos-cake-base', 'variant_6inch', 'Cake Base 6-inch', 'comp_006', 1, false, true, NOW(), NOW()),
  ('pr_017', 'bannos-cake-base', 'variant_8inch', 'Cake Base 8-inch', 'comp_006', 1, false, true, NOW(), NOW()),
  ('pr_018', 'flourlane-cake-base', 'variant_3tier', 'Cake Base 3-tier', 'comp_006', 1, false, true, NOW(), NOW()),
  
  -- Cake box requirements
  ('pr_019', 'bannos-cake-box', 'variant_6inch', 'Cake Box 6-inch', 'comp_007', 1, false, true, NOW(), NOW()),
  ('pr_020', 'bannos-cake-box', 'variant_8inch', 'Cake Box 8-inch', 'comp_007', 1, false, true, NOW(), NOW()),
  ('pr_021', 'flourlane-cake-box', 'variant_3tier', 'Cake Box 3-tier', 'comp_007', 1, false, true, NOW(), NOW()),
  
  -- Candle requirements (optional)
  ('pr_022', 'bannos-birthday-candles', 'variant_standard', 'Birthday Candles', 'comp_008', 1, true, false, NOW(), NOW()),
  ('pr_023', 'flourlane-birthday-candles', 'variant_standard', 'Birthday Candles', 'comp_008', 1, true, false, NOW(), NOW());

-- Verify the data was inserted
SELECT 
  pr.id,
  pr.product_title,
  pr.shopify_product_id,
  pr.shopify_variant_id,
  pr.quantity_per_unit,
  pr.is_optional,
  pr.auto_deduct,
  c.name as component_name,
  c.sku as component_sku
FROM product_requirements pr
JOIN components c ON pr.component_id = c.id
ORDER BY pr.product_title, pr.shopify_variant_id, c.name;