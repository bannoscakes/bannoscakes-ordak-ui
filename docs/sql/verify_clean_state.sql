-- Table existence + row counts (NULL = table not present).
-- All references schema-qualified to avoid search_path surprises.

SELECT 'orders_bannos' AS table_name,
       CASE WHEN to_regclass('public.orders_bannos')  IS NOT NULL
            THEN (SELECT COUNT(*) FROM public.orders_bannos) END AS row_count
UNION ALL
SELECT 'orders_flourlane',
       CASE WHEN to_regclass('public.orders_flourlane') IS NOT NULL
            THEN (SELECT COUNT(*) FROM public.orders_flourlane) END
UNION ALL
SELECT 'orders',
       CASE WHEN to_regclass('public.orders') IS NOT NULL
            THEN (SELECT COUNT(*) FROM public.orders) END
UNION ALL
SELECT 'inventory_txn',
       CASE WHEN to_regclass('public.inventory_txn') IS NOT NULL
            THEN (SELECT COUNT(*) FROM public.inventory_txn) END
UNION ALL
SELECT 'order_photos',
       CASE WHEN to_regclass('public.order_photos') IS NOT NULL
            THEN (SELECT COUNT(*) FROM public.order_photos) END
UNION ALL
SELECT 'dead_letter',
       CASE WHEN to_regclass('public.dead_letter') IS NOT NULL
            THEN (SELECT COUNT(*) FROM public.dead_letter) END;

