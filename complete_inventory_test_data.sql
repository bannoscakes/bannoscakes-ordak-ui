-- Complete test data for Inventory UI integration
-- This will create test data for all inventory components

-- 1. First, let's create some test BOMs
SELECT 'Creating test BOMs...' as status;

-- BOM 1: Chocolate Birthday Cake (Bannos)
SELECT public.upsert_bom(
  'Chocolate Birthday Cake',
  'bannos',
  NULL,
  'Classic chocolate birthday cake with vanilla buttercream',
  'shopify-12345'
);

-- BOM 2: Spiderman Theme Cake (Bannos)  
SELECT public.upsert_bom(
  'Spiderman Theme Cake',
  'bannos',
  NULL,
  'Spiderman themed birthday cake with blue decorations',
  'shopify-12346'
);

-- BOM 3: Artisan Sourdough Bread (Flourlane)
SELECT public.upsert_bom(
  'Artisan Sourdough Bread',
  'flourlane',
  NULL,
  'Traditional sourdough bread made with natural starter',
  'shopify-12347'
);

-- 2. Get component IDs for creating keywords and requirements
SELECT 'Getting component IDs...' as status;
SELECT id, sku, name FROM components LIMIT 5;

-- 3. Create test Accessory Keywords
SELECT 'Creating test Accessory Keywords...' as status;
-- (Replace component IDs with actual ones from the query above)

-- 4. Create test Product Requirements
SELECT 'Creating test Product Requirements...' as status;
-- (Replace component IDs with actual ones from the query above)

-- 5. Test all RPC functions
SELECT 'Testing RPC functions...' as status;
SELECT * FROM public.get_boms(NULL, false, NULL) LIMIT 3;
SELECT * FROM public.get_accessory_keywords(NULL, false, NULL) LIMIT 3;
SELECT * FROM public.get_product_requirements(NULL, NULL, NULL) LIMIT 3;
SELECT * FROM public.get_stock_transactions(NULL, NULL, 10, 0) LIMIT 3;
