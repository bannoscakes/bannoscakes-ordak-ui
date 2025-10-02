-- Test BOM data for UI integration
-- First, let's create some test BOMs

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

-- Test the get_boms function
SELECT * FROM public.get_boms(NULL, false, NULL);
