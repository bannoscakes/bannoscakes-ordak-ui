-- Clean Stock Transactions Test Data
-- Run this in Supabase SQL Editor

-- First, let's clear any existing test transactions to avoid conflicts
DELETE FROM public.stock_transactions 
WHERE reason LIKE '%Weekly delivery%' 
   OR reason LIKE '%Damaged items%' 
   OR reason LIKE '%Order production completed%'
   OR reason LIKE '%Regular weekly%'
   OR reason LIKE '%Inventory correction%'
   OR reason LIKE '%Deducted for order%'
   OR reason LIKE '%Order cancelled%';

-- First, let's see what components we have
SELECT id, sku, name, current_stock FROM public.components ORDER BY name LIMIT 10;

-- Insert sample stock transactions
-- These represent various inventory movements

-- Purchase transactions (restock)
INSERT INTO public.stock_transactions (
  component_id, 
  transaction_type, 
  quantity_change, 
  quantity_before, 
  quantity_after, 
  reason, 
  performed_by
)
SELECT 
  c.id as component_id,
  'purchase' as transaction_type,
  50.0 as quantity_change,
  c.current_stock as quantity_before,
  c.current_stock + 50.0 as quantity_after,
  'Weekly delivery from supplier' as reason,
  NULL as performed_by
FROM public.components c
WHERE c.name ILIKE '%flour%'
LIMIT 1;

-- Update the component stock
UPDATE public.components 
SET current_stock = current_stock + 50.0, updated_at = now()
WHERE name ILIKE '%flour%';

-- Adjustment transactions
INSERT INTO public.stock_transactions (
  component_id, 
  transaction_type, 
  quantity_change, 
  quantity_before, 
  quantity_after, 
  reason, 
  performed_by
)
SELECT 
  c.id as component_id,
  'adjustment' as transaction_type,
  -5.0 as quantity_change,
  c.current_stock as quantity_before,
  c.current_stock - 5.0 as quantity_after,
  'Damaged items discarded during inspection' as reason,
  NULL as performed_by
FROM public.components c
WHERE c.name ILIKE '%sugar%'
LIMIT 1;

-- Update the component stock
UPDATE public.components 
SET current_stock = current_stock - 5.0, updated_at = now()
WHERE name ILIKE '%sugar%';

-- Deduction transactions (order completion)
INSERT INTO public.stock_transactions (
  component_id, 
  transaction_type, 
  quantity_change, 
  quantity_before, 
  quantity_after, 
  reference_order_id,
  reason, 
  performed_by
)
SELECT 
  c.id as component_id,
  'deduction' as transaction_type,
  -2.0 as quantity_change,
  c.current_stock as quantity_before,
  c.current_stock - 2.0 as quantity_after,
  'BANNOS-12345' as reference_order_id,
  'Order production completed' as reason,
  NULL as performed_by
FROM public.components c
WHERE c.name ILIKE '%eggs%'
LIMIT 1;

-- Update the component stock
UPDATE public.components 
SET current_stock = current_stock - 2.0, updated_at = now()
WHERE name ILIKE '%eggs%';

-- Restock transactions
INSERT INTO public.stock_transactions (
  component_id, 
  transaction_type, 
  quantity_change, 
  quantity_before, 
  quantity_after, 
  reason, 
  performed_by
)
SELECT 
  c.id as component_id,
  'restock' as transaction_type,
  25.0 as quantity_change,
  c.current_stock as quantity_before,
  c.current_stock + 25.0 as quantity_after,
  'Regular weekly stock replenishment' as reason,
  NULL as performed_by
FROM public.components c
WHERE c.name ILIKE '%butter%'
LIMIT 1;

-- Update the component stock
UPDATE public.components 
SET current_stock = current_stock + 25.0, updated_at = now()
WHERE name ILIKE '%butter%';

-- Order deduction transactions
INSERT INTO public.stock_transactions (
  component_id, 
  transaction_type, 
  quantity_change, 
  quantity_before, 
  quantity_after, 
  reference_order_id,
  reason, 
  performed_by
)
SELECT 
  c.id as component_id,
  'order_deduction' as transaction_type,
  -1.0 as quantity_change,
  c.current_stock as quantity_before,
  c.current_stock - 1.0 as quantity_after,
  'FLOURLANE-67890' as reference_order_id,
  'Deducted for order completion' as reason,
  NULL as performed_by
FROM public.components c
WHERE c.name ILIKE '%cake base%'
LIMIT 1;

-- Update the component stock
UPDATE public.components 
SET current_stock = current_stock - 1.0, updated_at = now()
WHERE name ILIKE '%cake base%';

-- Order restock transactions (order cancelled)
INSERT INTO public.stock_transactions (
  component_id, 
  transaction_type, 
  quantity_change, 
  quantity_before, 
  quantity_after, 
  reference_order_id,
  reason, 
  performed_by
)
SELECT 
  c.id as component_id,
  'order_restock' as transaction_type,
  1.0 as quantity_change,
  c.current_stock as quantity_before,
  c.current_stock + 1.0 as quantity_after,
  'BANNOS-54321' as reference_order_id,
  'Order cancelled/returned - restocking components' as reason,
  NULL as performed_by
FROM public.components c
WHERE c.name ILIKE '%cake box%'
LIMIT 1;

-- Update the component stock
UPDATE public.components 
SET current_stock = current_stock + 1.0, updated_at = now()
WHERE name ILIKE '%cake box%';

-- Add some more transactions for variety
INSERT INTO public.stock_transactions (
  component_id, 
  transaction_type, 
  quantity_change, 
  quantity_before, 
  quantity_after, 
  reason, 
  performed_by
)
SELECT 
  c.id as component_id,
  'adjustment' as transaction_type,
  3.0 as quantity_change,
  c.current_stock as quantity_before,
  c.current_stock + 3.0 as quantity_after,
  'Inventory correction after physical count' as reason,
  NULL as performed_by
FROM public.components c
WHERE c.name ILIKE '%spiderman%'
LIMIT 1;

-- Update the component stock
UPDATE public.components 
SET current_stock = current_stock + 3.0, updated_at = now()
WHERE name ILIKE '%spiderman%';

-- Verify the data was created
SELECT 
  st.id,
  st.transaction_type,
  st.quantity_change,
  st.quantity_before,
  st.quantity_after,
  st.reference_order_id,
  st.reason,
  c.name as component_name,
  c.sku as component_sku,
  st.created_at
FROM public.stock_transactions st
JOIN public.components c ON st.component_id = c.id
ORDER BY st.created_at DESC
LIMIT 20;
