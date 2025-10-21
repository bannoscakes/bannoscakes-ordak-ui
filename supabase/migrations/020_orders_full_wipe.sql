-- 020_orders_full_wipe.sql
-- Purpose: Backup + wipe ALL orders and dependent rows to start webhooks on a clean state.

DO $$
DECLARE
  suffix text := to_char(now() at time zone 'Australia/Sydney','YYYYMMDD_HH24MISS');
BEGIN
  -- Backups (timestamped)
  EXECUTE format('CREATE TABLE IF NOT EXISTS orders_bannos_bak_%s AS TABLE orders_bannos', suffix);
  EXECUTE format('CREATE TABLE IF NOT EXISTS orders_flourlane_bak_%s AS TABLE orders_flourlane', suffix);
  EXECUTE format('CREATE TABLE IF NOT EXISTS work_queue_bak_%s AS TABLE work_queue', suffix);
  EXECUTE format('CREATE TABLE IF NOT EXISTS stage_events_bak_%s AS TABLE stage_events', suffix);
  EXECUTE format('CREATE TABLE IF NOT EXISTS order_photos_bak_%s AS TABLE order_photos', suffix);
  EXECUTE format('CREATE TABLE IF NOT EXISTS stock_transactions_bak_%s AS TABLE stock_transactions', suffix);
  EXECUTE format('CREATE TABLE IF NOT EXISTS audit_log_bak_%s AS TABLE audit_log', suffix);
  EXECUTE format('CREATE TABLE IF NOT EXISTS dead_letter_bak_%s AS TABLE dead_letter', suffix);
END $$;

-- Wipe dependents first (robust even if FKs aren’t ON DELETE CASCADE)
TRUNCATE stage_events           RESTART IDENTITY CASCADE;
TRUNCATE work_queue             RESTART IDENTITY CASCADE;
TRUNCATE order_photos           RESTART IDENTITY CASCADE;
TRUNCATE stock_transactions     RESTART IDENTITY CASCADE;
TRUNCATE audit_log              RESTART IDENTITY CASCADE;
TRUNCATE dead_letter            RESTART IDENTITY CASCADE;

-- Finally wipe order tables (both stores)
TRUNCATE orders_bannos          RESTART IDENTITY CASCADE;
TRUNCATE orders_flourlane       RESTART IDENTITY CASCADE;


