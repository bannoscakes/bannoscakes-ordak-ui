-- Test Accessory Keywords Data
-- This script creates sample accessory keywords for testing the UI

-- Insert sample accessory keywords
INSERT INTO accessory_keywords (keyword, component_id, priority, match_type, is_active, created_at, updated_at)
VALUES 
  -- Spiderman related keywords
  ('spiderman', (SELECT id FROM components WHERE sku = 'SPIDER-001' LIMIT 1), 10, 'contains', true, NOW(), NOW()),
  ('spidey', (SELECT id FROM components WHERE sku = 'SPIDER-001' LIMIT 1), 8, 'contains', true, NOW(), NOW()),
  ('marvel', (SELECT id FROM components WHERE sku = 'SPIDER-001' LIMIT 1), 5, 'contains', true, NOW(), NOW()),
  
  -- Batman related keywords
  ('batman', (SELECT id FROM components WHERE sku = 'BAT-001' LIMIT 1), 10, 'contains', true, NOW(), NOW()),
  ('bat', (SELECT id FROM components WHERE sku = 'BAT-001' LIMIT 1), 7, 'contains', true, NOW(), NOW()),
  ('dc', (SELECT id FROM components WHERE sku = 'BAT-001' LIMIT 1), 5, 'contains', true, NOW(), NOW()),
  
  -- Princess related keywords
  ('princess', (SELECT id FROM components WHERE sku = 'PRINCESS-001' LIMIT 1), 10, 'contains', true, NOW(), NOW()),
  ('castle', (SELECT id FROM components WHERE sku = 'PRINCESS-001' LIMIT 1), 8, 'contains', true, NOW(), NOW()),
  ('crown', (SELECT id FROM components WHERE sku = 'PRINCESS-001' LIMIT 1), 6, 'contains', true, NOW(), NOW()),
  
  -- Wedding related keywords
  ('wedding', (SELECT id FROM components WHERE sku = 'WEDDING-001' LIMIT 1), 10, 'contains', true, NOW(), NOW()),
  ('elegant', (SELECT id FROM components WHERE sku = 'WEDDING-001' LIMIT 1), 7, 'contains', true, NOW(), NOW()),
  ('white', (SELECT id FROM components WHERE sku = 'WEDDING-001' LIMIT 1), 5, 'contains', true, NOW(), NOW()),
  
  -- Birthday related keywords
  ('birthday', (SELECT id FROM components WHERE sku = 'BIRTHDAY-001' LIMIT 1), 10, 'contains', true, NOW(), NOW()),
  ('celebration', (SELECT id FROM components WHERE sku = 'BIRTHDAY-001' LIMIT 1), 8, 'contains', true, NOW(), NOW()),
  ('party', (SELECT id FROM components WHERE sku = 'BIRTHDAY-001' LIMIT 1), 6, 'contains', true, NOW(), NOW());

-- Verify the data was inserted
SELECT 
  ak.id,
  ak.keyword,
  ak.priority,
  ak.match_type,
  ak.is_active,
  c.name as component_name,
  c.sku as component_sku
FROM accessory_keywords ak
JOIN components c ON ak.component_id = c.id
ORDER BY ak.priority DESC, ak.keyword;