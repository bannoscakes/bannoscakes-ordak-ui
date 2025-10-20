-- Orphan check (should all be 0)
WITH o AS (SELECT id FROM orders)
SELECT 'stage_events_orphans' t, count(*) FROM stage_events se LEFT JOIN o ON o.id=se.order_id WHERE o.id IS NULL
UNION ALL SELECT 'work_queue_orphans', count(*) FROM work_queue w LEFT JOIN o ON o.id=w.order_id WHERE o.id IS NULL
UNION ALL SELECT 'order_photos_orphans', count(*) FROM order_photos p LEFT JOIN o ON o.id=p.order_id WHERE o.id IS NULL
UNION ALL SELECT 'audit_log_orphans', count(*) FROM audit_log a LEFT JOIN o ON o.id=a.order_id WHERE o.id IS NULL
ORDER BY t;
