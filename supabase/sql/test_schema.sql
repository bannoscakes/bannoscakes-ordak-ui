-- test_schema.sql
-- Test script for PR #1 database schema

-- Test 1: Insert sample data into orders_bannos
insert into orders_bannos (
  shopify_order_number,
  shopify_order_id,
  shopify_order_gid,
  customer_name,
  product_title,
  flavour,
  notes,
  currency,
  total_amount,
  due_date,
  delivery_method,
  size,
  item_qty,
  storage
) values (
  12345,
  12345,
  'gid://shopify/Order/12345',
  'John Doe',
  'Chocolate Cake',
  'Vanilla, Chocolate',
  'Please deliver after 2pm • Leave at front door',
  'AUD',
  45.00,
  '2025-01-30',
  'delivery',
  'M',
  1,
  'Fridge A'
);

-- Test 2: Insert sample data into orders_flourlane
insert into orders_flourlane (
  shopify_order_number,
  shopify_order_id,
  shopify_order_gid,
  customer_name,
  product_title,
  flavour,
  notes,
  currency,
  total_amount,
  due_date,
  delivery_method,
  size,
  item_qty,
  storage
) values (
  67890,
  67890,
  'gid://shopify/Order/67890',
  'Jane Smith',
  'Strawberry Cake',
  'Strawberry, Cream',
  'Pickup at 3pm',
  'AUD',
  38.50,
  '2025-01-30',
  'pickup',
  'L',
  1,
  'Counter B'
);

-- Test 3: Verify human_id generation
select id, shopify_order_number, customer_name, store from (
  select id, shopify_order_number, customer_name, 'bannos' as store from orders_bannos
  union all
  select id, shopify_order_number, customer_name, 'flourlane' as store from orders_flourlane
) t;

-- Test 4: Test queue view
select * from vw_queue_minimal limit 5;

-- Test 5: Test unassigned counts
select * from vw_unassigned_counts;

-- Test 6: Test complete view
select * from vw_complete_minimal;
