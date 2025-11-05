-- 039_webhook_inbox_tables.sql
-- Minimal tables for raw Shopify order storage
-- NO EXTRACTION. PERIOD.

-- Bannos inbox table
CREATE TABLE webhook_inbox_bannos (
  id text PRIMARY KEY,              -- bannos-18242 (prevents duplicates)
  payload jsonb NOT NULL,           -- EVERYTHING, nothing extracted
  processed boolean NOT NULL DEFAULT false
);

-- Flourlane inbox table
CREATE TABLE webhook_inbox_flourlane (
  id text PRIMARY KEY,              -- flourlane-5001
  payload jsonb NOT NULL,           -- EVERYTHING, nothing extracted
  processed boolean NOT NULL DEFAULT false
);

-- Indexes for backend processing (only unprocessed orders)
CREATE INDEX idx_bannos_unprocessed ON webhook_inbox_bannos(processed) WHERE processed = false;
CREATE INDEX idx_flourlane_unprocessed ON webhook_inbox_flourlane(processed) WHERE processed = false;

-- Comments
COMMENT ON TABLE webhook_inbox_bannos IS 'Raw Shopify orders for Bannos store. Backend processes these using Liquid templates.';
COMMENT ON TABLE webhook_inbox_flourlane IS 'Raw Shopify orders for Flourlane store. Backend processes these using Liquid templates.';
COMMENT ON COLUMN webhook_inbox_bannos.payload IS 'Full Shopify order JSON. NO extraction in webhook.';
COMMENT ON COLUMN webhook_inbox_flourlane.payload IS 'Full Shopify order JSON. NO extraction in webhook.';

