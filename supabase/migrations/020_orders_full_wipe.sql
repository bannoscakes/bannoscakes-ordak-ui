-- 020_orders_full_wipe.sql
-- Safe full wipe: backs up and truncates order tables only if they exist.

DO $$
DECLARE
  suffix text := to_char(clock_timestamp(), 'YYYYMMDD_HH24MISSUS');  -- microsecond suffix
  tbl text;
  dep_tables   text[] := ARRAY['inventory_txn','order_photos','dead_letter'];
  order_tables text[] := ARRAY['orders_bannos','orders_flourlane','orders'];
BEGIN
  -- Backups only if table exists
  FOREACH tbl IN ARRAY dep_tables || order_tables LOOP
    IF to_regclass('public.'||tbl) IS NOT NULL THEN
      EXECUTE 'CREATE TABLE '||quote_ident(tbl||'_bak_'||suffix)||' AS TABLE '||quote_ident(tbl);
    END IF;
  END LOOP;

  -- Truncate dependents first
  FOREACH tbl IN ARRAY dep_tables LOOP
    IF to_regclass('public.'||tbl) IS NOT NULL THEN
      EXECUTE 'TRUNCATE TABLE '||quote_ident(tbl)||' RESTART IDENTITY CASCADE';
    END IF;
  END LOOP;

  -- Then truncate order tables
  FOREACH tbl IN ARRAY order_tables LOOP
    IF to_regclass('public.'||tbl) IS NOT NULL THEN
      EXECUTE 'TRUNCATE TABLE '||quote_ident(tbl)||' RESTART IDENTITY CASCADE';
    END IF;
  END LOOP;
END $$;

