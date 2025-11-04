-- 036_webhook_resilient_metafields.sql
-- Make webhooks resilient to metafield timing delays
-- Allows orders to be stored even when Shopify Flow hasn't created metafield yet

-- ===========================================
-- BANNOS TABLE UPDATES
-- ===========================================

-- Add metafield_status column to track if metafield data is available
ALTER TABLE orders_bannos 
ADD COLUMN IF NOT EXISTS metafield_status TEXT DEFAULT 'pending';

-- Make due_date nullable (allows NULL when metafield isn't ready)
ALTER TABLE orders_bannos 
ALTER COLUMN due_date DROP NOT NULL;

-- Add index for querying pending orders
CREATE INDEX IF NOT EXISTS idx_orders_bannos_metafield_status 
ON orders_bannos(metafield_status) 
WHERE metafield_status = 'pending';

-- Add comment for documentation
COMMENT ON COLUMN orders_bannos.metafield_status IS 'Tracks metafield availability: "available" = metafield parsed, "pending" = metafield not ready yet';

-- ===========================================
-- FLOURLANE TABLE UPDATES
-- ===========================================

-- Add metafield_status column to track if metafield data is available
ALTER TABLE orders_flourlane 
ADD COLUMN IF NOT EXISTS metafield_status TEXT DEFAULT 'pending';

-- Make due_date nullable (allows NULL when metafield isn't ready)
ALTER TABLE orders_flourlane 
ALTER COLUMN due_date DROP NOT NULL;

-- Add index for querying pending orders
CREATE INDEX IF NOT EXISTS idx_orders_flourlane_metafield_status 
ON orders_flourlane(metafield_status) 
WHERE metafield_status = 'pending';

-- Add comment for documentation
COMMENT ON COLUMN orders_flourlane.metafield_status IS 'Tracks metafield availability: "available" = metafield parsed, "pending" = metafield not ready yet';

