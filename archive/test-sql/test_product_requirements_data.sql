-- Test Product Requirements Data
-- This script creates sample product requirements for testing the UI

-- Insert sample product requirements
INSERT INTO product_requirements (shopify_product_id, shopify_variant_id, product_title, component_id, quantity_per_unit, is_optional, auto_deduct, created_at, updated_at)
VALUES 
  -- Spiderman Theme Cake requirements
  ('bannos-spiderman-theme-cake', 'variant_6inch', 'Spiderman Theme Cake', (SELECT id FROM components WHERE sku = 'SPIDER-001' LIMIT 1), 1, false, true, NOW(), NOW()),
  ('bannos-spiderman-theme-cake', 'variant_6inch', 'Spiderman Theme Cake', (SELECT id FROM components WHERE sku = 'BASE-001' LIMIT 1), 1, false, true, NOW(), NOW()),
  ('bannos-spiderman-theme-cake', 'variant_6inch', 'Spiderman Theme Cake', (SELECT id FROM components WHERE sku = 'BOX-001' LIMIT 1), 1, false, true, NOW(), NOW()),
  
  -- Batman Birthday Cake requirements
  ('bannos-batman-birthday-cake', 'variant_8inch', 'Batman Birthday Cake', (SELECT id FROM components WHERE sku = 'BAT-001' LIMIT 1), 1, false, true, NOW(), NOW()),
  ('bannos-batman-birthday-cake', 'variant_8inch', 'Batman Birthday Cake', (SELECT id FROM components WHERE sku = 'BASE-001' LIMIT 1), 1, false, true, NOW(), NOW()),
  ('bannos-batman-birthday-cake', 'variant_8inch', 'Batman Birthday Cake', (SELECT id FROM components WHERE sku = 'CANDLE-001' LIMIT 1), 1, false, true, NOW(), NOW()),
  
  -- Princess Castle Cake requirements
  ('flourlane-princess-castle-cake', 'variant_3tier', 'Princess Castle Cake', (SELECT id FROM components WHERE sku = 'PRINCESS-001' LIMIT 1), 1, false, true, NOW(), NOW()),
  ('flourlane-princess-castle-cake', 'variant_3tier', 'Princess Castle Cake', (SELECT id FROM components WHERE sku = 'BASE-001' LIMIT 1), 1, false, true, NOW(), NOW()),
  ('flourlane-princess-castle-cake', 'variant_3tier', 'Princess Castle Cake', (SELECT id FROM components WHERE sku = 'TOPPER-001' LIMIT 1), 1, false, true, NOW(), NOW()),
  
  -- Elegant Wedding Cake requirements
  ('flourlane-elegant-wedding-cake', 'variant_3tier', 'Elegant Wedding Cake', (SELECT id FROM components WHERE sku = 'WEDDING-001' LIMIT 1), 1, false, true, NOW(), NOW()),
  ('flourlane-elegant-wedding-cake', 'variant_3tier', 'Elegant Wedding Cake', (SELECT id FROM components WHERE sku = 'BASE-001' LIMIT 1), 1, false, true, NOW(), NOW()),
  ('flourlane-elegant-wedding-cake', 'variant_3tier', 'Elegant Wedding Cake', (SELECT id FROM components WHERE sku = 'DECOR-001' LIMIT 1), 1, false, true, NOW(), NOW()),
  
  -- Premium Birthday Celebration requirements
  ('bannos-premium-birthday-celebration', 'variant_2tier', 'Premium Birthday Celebration', (SELECT id FROM components WHERE sku = 'BIRTHDAY-001' LIMIT 1), 1, false, true, NOW(), NOW()),
  ('bannos-premium-birthday-celebration', 'variant_2tier', 'Premium Birthday Celebration', (SELECT id FROM components WHERE sku = 'BASE-001' LIMIT 1), 1, false, true, NOW(), NOW()),
  ('bannos-premium-birthday-celebration', 'variant_2tier', 'Premium Birthday Celebration', (SELECT id FROM components WHERE sku = 'PARTY-001' LIMIT 1), 1, false, true, NOW(), NOW()),
  
  -- Cake base requirements (common to all cakes)
  ('bannos-cake-base', 'variant_6inch', 'Cake Base 6-inch', (SELECT id FROM components WHERE sku = 'BASE-001' LIMIT 1), 1, false, true, NOW(), NOW()),
  ('bannos-cake-base', 'variant_8inch', 'Cake Base 8-inch', (SELECT id FROM components WHERE sku = 'BASE-001' LIMIT 1), 1, false, true, NOW(), NOW()),
  ('flourlane-cake-base', 'variant_3tier', 'Cake Base 3-tier', (SELECT id FROM components WHERE sku = 'BASE-001' LIMIT 1), 1, false, true, NOW(), NOW()),
  
  -- Cake box requirements
  ('bannos-cake-box', 'variant_6inch', 'Cake Box 6-inch', (SELECT id FROM components WHERE sku = 'BOX-001' LIMIT 1), 1, false, true, NOW(), NOW()),
  ('bannos-cake-box', 'variant_8inch', 'Cake Box 8-inch', (SELECT id FROM components WHERE sku = 'BOX-001' LIMIT 1), 1, false, true, NOW(), NOW()),
  ('flourlane-cake-box', 'variant_3tier', 'Cake Box 3-tier', (SELECT id FROM components WHERE sku = 'BOX-001' LIMIT 1), 1, false, true, NOW(), NOW()),
  
  -- Candle requirements (optional)
  ('bannos-birthday-candles', 'variant_standard', 'Birthday Candles', (SELECT id FROM components WHERE sku = 'CANDLE-001' LIMIT 1), 1, true, false, NOW(), NOW()),
  ('flourlane-birthday-candles', 'variant_standard', 'Birthday Candles', (SELECT id FROM components WHERE sku = 'CANDLE-001' LIMIT 1), 1, true, false, NOW(), NOW());

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