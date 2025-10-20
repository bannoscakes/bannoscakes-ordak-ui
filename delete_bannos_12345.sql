-- Delete specific test order: bannos-12345
-- This is a targeted deletion to test UI-Database connection

DELETE FROM public.orders_bannos 
WHERE id = 'bannos-12345';

-- Verify deletion
SELECT COUNT(*) as remaining_orders FROM public.orders_bannos;
SELECT id, customer_name, product_title FROM public.orders_bannos ORDER BY id;
