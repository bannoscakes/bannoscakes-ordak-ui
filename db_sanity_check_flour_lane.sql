-- Flour Lane orders  
SELECT id, order_number, store, shopify_order_id, delivery_date::date AS delivery_date, stage, created_at
FROM orders
WHERE store ILIKE 'Flour Lane%'
ORDER BY delivery_date DESC, created_at DESC;
