-- Bannos orders
SELECT id, order_number, store, shopify_order_id, delivery_date::date AS delivery_date, stage, created_at
FROM orders
WHERE store ILIKE 'Bannos%'
ORDER BY delivery_date DESC, created_at DESC;
