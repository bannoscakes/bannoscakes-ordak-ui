-- Create test BOM data
-- First, let's create some sample BOMs

-- Insert sample BOMs
INSERT INTO public.boms (product_title, store, description, is_active) VALUES
('Chocolate Birthday Cake', 'bannos', '6-inch round chocolate cake with vanilla buttercream', true),
('Vanilla Wedding Cake', 'bannos', '8-inch round vanilla cake with white buttercream', true),
('Red Velvet Cupcakes', 'flourlane', '12-pack red velvet cupcakes with cream cheese frosting', true),
('Spiderman Cake', 'bannos', '6-inch round cake with Spiderman decoration', true),
('Custom Birthday Cake', 'both', 'Customizable birthday cake for any occasion', true);

-- Get the BOM IDs for adding components
-- We'll need to get the component IDs from the existing components table
-- Let's add some BOM items for the first BOM (Chocolate Birthday Cake)
-- First, let's see what components we have
SELECT id, sku, name FROM public.components LIMIT 10;

-- Add BOM items for Chocolate Birthday Cake
-- (We'll need to replace the component IDs with actual ones from the database)
INSERT INTO public.bom_items (bom_id, component_id, quantity_required, unit, is_optional, notes)
SELECT 
  b.id as bom_id,
  c.id as component_id,
  CASE 
    WHEN c.name ILIKE '%flour%' THEN 2.0
    WHEN c.name ILIKE '%sugar%' THEN 1.5
    WHEN c.name ILIKE '%eggs%' THEN 3.0
    WHEN c.name ILIKE '%butter%' THEN 1.0
    WHEN c.name ILIKE '%cocoa%' THEN 0.5
    WHEN c.name ILIKE '%cake base%' THEN 1.0
    WHEN c.name ILIKE '%cake box%' THEN 1.0
    ELSE 1.0
  END as quantity_required,
  'each' as unit,
  false as is_optional,
  'Required for chocolate cake' as notes
FROM public.boms b
CROSS JOIN public.components c
WHERE b.product_title = 'Chocolate Birthday Cake'
  AND c.name IN ('Flour', 'Sugar', 'Eggs', 'Butter', 'Cocoa Powder', '6-inch Round Cake Base', '6-inch White Cake Box')
LIMIT 7;

-- Add BOM items for Vanilla Wedding Cake
INSERT INTO public.bom_items (bom_id, component_id, quantity_required, unit, is_optional, notes)
SELECT 
  b.id as bom_id,
  c.id as component_id,
  CASE 
    WHEN c.name ILIKE '%flour%' THEN 3.0
    WHEN c.name ILIKE '%sugar%' THEN 2.0
    WHEN c.name ILIKE '%eggs%' THEN 4.0
    WHEN c.name ILIKE '%butter%' THEN 1.5
    WHEN c.name ILIKE '%vanilla%' THEN 0.5
    WHEN c.name ILIKE '%cake base%' THEN 1.0
    WHEN c.name ILIKE '%cake box%' THEN 1.0
    ELSE 1.0
  END as quantity_required,
  'each' as unit,
  false as is_optional,
  'Required for vanilla wedding cake' as notes
FROM public.boms b
CROSS JOIN public.components c
WHERE b.product_title = 'Vanilla Wedding Cake'
  AND c.name IN ('Flour', 'Sugar', 'Eggs', 'Butter', 'Vanilla Extract', '8-inch Round Cake Base', '8-inch White Cake Box')
LIMIT 7;

-- Add BOM items for Red Velvet Cupcakes
INSERT INTO public.bom_items (bom_id, component_id, quantity_required, unit, is_optional, notes)
SELECT 
  b.id as bom_id,
  c.id as component_id,
  CASE 
    WHEN c.name ILIKE '%flour%' THEN 1.5
    WHEN c.name ILIKE '%sugar%' THEN 1.0
    WHEN c.name ILIKE '%eggs%' THEN 2.0
    WHEN c.name ILIKE '%butter%' THEN 0.75
    WHEN c.name ILIKE '%red food coloring%' THEN 0.25
    WHEN c.name ILIKE '%cupcake liners%' THEN 12.0
    ELSE 1.0
  END as quantity_required,
  'each' as unit,
  false as is_optional,
  'Required for red velvet cupcakes' as notes
FROM public.boms b
CROSS JOIN public.components c
WHERE b.product_title = 'Red Velvet Cupcakes'
  AND c.name IN ('Flour', 'Sugar', 'Eggs', 'Butter', 'Red Food Coloring', 'Cupcake Liners')
LIMIT 6;

-- Add BOM items for Spiderman Cake
INSERT INTO public.bom_items (bom_id, component_id, quantity_required, unit, is_optional, notes)
SELECT 
  b.id as bom_id,
  c.id as component_id,
  CASE 
    WHEN c.name ILIKE '%flour%' THEN 2.0
    WHEN c.name ILIKE '%sugar%' THEN 1.5
    WHEN c.name ILIKE '%eggs%' THEN 3.0
    WHEN c.name ILIKE '%butter%' THEN 1.0
    WHEN c.name ILIKE '%spiderman%' THEN 1.0
    WHEN c.name ILIKE '%cake base%' THEN 1.0
    WHEN c.name ILIKE '%cake box%' THEN 1.0
    ELSE 1.0
  END as quantity_required,
  'each' as unit,
  false as is_optional,
  'Required for Spiderman cake' as notes
FROM public.boms b
CROSS JOIN public.components c
WHERE b.product_title = 'Spiderman Cake'
  AND c.name IN ('Flour', 'Sugar', 'Eggs', 'Butter', 'Spiderman Cake Topper', '6-inch Round Cake Base', '6-inch White Cake Box')
LIMIT 7;

-- Add BOM items for Custom Birthday Cake
INSERT INTO public.bom_items (bom_id, component_id, quantity_required, unit, is_optional, notes)
SELECT 
  b.id as bom_id,
  c.id as component_id,
  CASE 
    WHEN c.name ILIKE '%flour%' THEN 2.5
    WHEN c.name ILIKE '%sugar%' THEN 2.0
    WHEN c.name ILIKE '%eggs%' THEN 4.0
    WHEN c.name ILIKE '%butter%' THEN 1.25
    WHEN c.name ILIKE '%cake base%' THEN 1.0
    WHEN c.name ILIKE '%cake box%' THEN 1.0
    WHEN c.name ILIKE '%candles%' THEN 1.0
    ELSE 1.0
  END as quantity_required,
  'each' as unit,
  false as is_optional,
  'Required for custom birthday cake' as notes
FROM public.boms b
CROSS JOIN public.components c
WHERE b.product_title = 'Custom Birthday Cake'
  AND c.name IN ('Flour', 'Sugar', 'Eggs', 'Butter', '6-inch Round Cake Base', '6-inch White Cake Box', 'Number Candles Set')
LIMIT 7;

-- Verify the data was created
SELECT 
  b.product_title,
  b.store,
  b.description,
  COUNT(bi.id) as component_count
FROM public.boms b
LEFT JOIN public.bom_items bi ON b.id = bi.bom_id
GROUP BY b.id, b.product_title, b.store, b.description
ORDER BY b.product_title;
