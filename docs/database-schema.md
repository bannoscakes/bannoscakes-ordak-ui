# Database Schema - Orders Tables

Last updated: 2025-11-05

## orders_bannos / orders_flourlane

These tables store production orders for Bannos and Flourlane respectively.

### Identity & Links

- `row_id` (uuid, primary key) - Database internal ID
- `id` (text) - Logic ID for deduplication: `bannos-24481-A`
- `human_id` (text) - Display ID: `#B24481-A`
- `shopify_order_id` (bigint) - Shopify numeric ID
- `shopify_order_gid` (text) - Shopify global ID: `gid://shopify/Order/...`
- `shopify_order_number` (integer) - Order number from Shopify

### Order Details

- `customer_name` (text) - Customer full name
- `product_title` (text) - Product name
- `product_image` (text) - Product image URL
- `size` (text) - Cake size (Small, Medium, Large, etc.)
- `flavour_1` (text) - Primary flavour
- `flavour_2` (text, nullable) - Secondary flavour for 2-flavour cakes
- `item_qty` (integer) - Quantity (always 1 per row for split orders)
- `notes` (text) - Order notes and special instructions

### Fulfillment

- `due_date` (date) - Delivery or pickup date
- `delivery_method` (text) - "delivery" or "pickup"

### Workflow

- `stage` (enum) - Current production stage
- `priority` (enum) - Priority level: high/medium/low
- `assignee_id` (uuid) - Assigned staff member
- `storage` (text) - Storage location identifier

### Stage Timestamps

- `filling_start_ts` (timestamp with time zone)
- `filling_complete_ts` (timestamp with time zone)
- `covering_complete_ts` (timestamp with time zone)
- `decorating_complete_ts` (timestamp with time zone)
- `packing_start_ts` (timestamp with time zone)
- `packing_complete_ts` (timestamp with time zone)

### Metadata

- `order_json` (jsonb) - Full Shopify webhook payload (for traceability)
- `metafield_status` (text) - TBD
- `created_at` (timestamp with time zone)
- `updated_at` (timestamp with time zone)

---

## Recent Changes

### 2025-11-05: Schema Fix for Stage 2 Processor

**Added Columns:**

- `human_id` - Display format for kitchen staff (#B24481)
- `product_image` - Product image URL for display
- `flavour_1` - Primary flavour (explicit field)
- `flavour_2` - Secondary flavour (nullable, for 2-flavour cakes)

**Removed Columns:**

- `flavour` - Replaced with flavour_1/flavour_2 for clarity
- `currency` - Not needed in production workflow
- `total_amount` - Not needed in production workflow

**Reason:** 

Preparing schema for Stage 2 backend processor that will use Liquid templates to extract data from webhook payloads. Two-flavour field split ensures proper display for kitchen staff.

---

## Table Separation

- `orders_bannos` - Receives orders from Bannos webhook only
- `orders_flourlane` - Receives orders from Flourlane webhook only

Tables are separate by design. Webhooks route to correct table automatically.

