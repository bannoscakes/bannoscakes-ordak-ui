SELECT 'orders_bannos' t, COUNT(*) FROM orders_bannos
UNION ALL SELECT 'orders_flourlane', COUNT(*) FROM orders_flourlane
UNION ALL SELECT 'work_queue', COUNT(*) FROM work_queue
UNION ALL SELECT 'stage_events', COUNT(*) FROM stage_events
UNION ALL SELECT 'order_photos', COUNT(*) FROM order_photos
UNION ALL SELECT 'stock_transactions', COUNT(*) FROM stock_transactions
UNION ALL SELECT 'audit_log', COUNT(*) FROM audit_log
UNION ALL SELECT 'dead_letter', COUNT(*) FROM dead_letter;


