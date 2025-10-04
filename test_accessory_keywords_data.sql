-- Test Accessory Keywords Data
-- This script creates sample accessory keywords for testing the UI

-- Insert sample accessory keywords
INSERT INTO accessory_keywords (id, keyword, component_id, priority, match_type, is_active, created_at, updated_at)
VALUES 
  -- Spiderman related keywords
  ('ak_001', 'spiderman', 'comp_001', 10, 'contains', true, NOW(), NOW()),
  ('ak_002', 'spidey', 'comp_001', 8, 'contains', true, NOW(), NOW()),
  ('ak_003', 'marvel', 'comp_001', 5, 'contains', true, NOW(), NOW()),
  
  -- Batman related keywords
  ('ak_004', 'batman', 'comp_002', 10, 'contains', true, NOW(), NOW()),
  ('ak_005', 'bat', 'comp_002', 7, 'contains', true, NOW(), NOW()),
  ('ak_006', 'dc', 'comp_002', 5, 'contains', true, NOW(), NOW()),
  
  -- Princess related keywords
  ('ak_007', 'princess', 'comp_003', 10, 'contains', true, NOW(), NOW()),
  ('ak_008', 'castle', 'comp_003', 8, 'contains', true, NOW(), NOW()),
  ('ak_009', 'crown', 'comp_003', 6, 'contains', true, NOW(), NOW()),
  
  -- Wedding related keywords
  ('ak_010', 'wedding', 'comp_004', 10, 'contains', true, NOW(), NOW()),
  ('ak_011', 'elegant', 'comp_004', 7, 'contains', true, NOW(), NOW()),
  ('ak_012', 'white', 'comp_004', 5, 'contains', true, NOW(), NOW()),
  
  -- Birthday related keywords
  ('ak_013', 'birthday', 'comp_005', 10, 'contains', true, NOW(), NOW()),
  ('ak_014', 'celebration', 'comp_005', 8, 'contains', true, NOW(), NOW()),
  ('ak_015', 'party', 'comp_005', 6, 'contains', true, NOW(), NOW());

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