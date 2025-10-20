-- Orphan check (should all be 0)
-- First, let's check what columns exist in each table
SELECT 'stage_events_orphans' as table_name, count(*) as orphan_count 
FROM stage_events se 
LEFT JOIN orders o ON o.id = se.order_id 
WHERE o.id IS NULL

UNION ALL

SELECT 'order_photos_orphans' as table_name, count(*) as orphan_count
FROM order_photos p 
LEFT JOIN orders o ON o.id = p.order_id 
WHERE o.id IS NULL

UNION ALL

SELECT 'audit_log_orphans' as table_name, count(*) as orphan_count
FROM audit_log a 
LEFT JOIN orders o ON o.id = a.order_id 
WHERE o.id IS NULL

ORDER BY table_name;
