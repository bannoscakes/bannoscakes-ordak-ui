# Webhook Ingest – Kitchen‑Docket Parity

This document defines how Shopify orders/create webhooks are ingested and
normalised for the Ordak system. The goal is to mirror the information
displayed on your paper kitchen dockets so the digital system always
presents the same trusted data. It describes how to extract key fields
from Shopify payloads, handle idempotency, choose the correct database
tables, and apply the same flavour‑extraction rules used on your printed
dockets.

## Source & Idempotency

Topic: orders/create (handled per store).

Idempotency key: order.admin_graphql_api_id (order_gid). If a
payload arrives with a order_gid that has already been ingested,
processing is skipped and a 200 response is returned.

This ensures that retries from Shopify or duplicate events do not create
multiple records in your database or multiple stock movements.

## Store Mapping

Orders are stored in different tables depending on the shop domain. If
order.shop_domain (or order.domain) contains bannos, insert into
orders_bannos. If it contains flourlane, insert into
orders_flourlane.

## Field Mapping (DB)

The following table summarises how incoming payload fields are mapped to
database columns. The primary line item refers to the first non‑gift
card item with quantity > 0 and is used for summary fields.

| Target column | Source / Rule |
|---|---|
| id | bannos-<order_number> or flourlane-<order_number>. If order_number is missing, fall back to <prefix>-<order.id>. |
| shopify_order_id | order.id |
| shopify_order_gid | order.admin_graphql_api_id |
| shopify_order_number | order.order_number |
| customer_name | Use order.shipping_address.name; if blank, use order.customer.name. |
| product_title | Title of the primary line item. |
| flavour | Extract using the flavour rules below. |
| notes | Concatenate order.note and the delivery instructions attribute (see below). Join parts with •. |
| currency | order.presentment_currency if present; otherwise order.currency. |
| total_amount | order.current_total_price if present; otherwise order.total_price. |
| order_json | The full raw JSON payload stored as jsonb for auditing and reprocessing. |
| stage | Initialise as 'Filling'. Subsequent stage updates are driven by barcode scans. |
| priority | Derived from due_date: High if the due date is today or overdue; Medium if tomorrow; Low for later dates. |
| Timestamps | All process timestamps are initialised to NULL. The Filling timestamp is set when the barcode is printed. |

## Due Date & Delivery Method

Dates and methods are derived from order attributes so that the system
behaves exactly like the kitchen docket. The attribute keys are case
insensitive and may come from either order.attributes or
order.note_attributes.

Due date: read Local Delivery Date and Time. Take the portion
before the word "between" (if present) and trim whitespace. For
example, if the attribute is "2025-09-16 between 13:00 and 15:00",
then the due date is 2025-09-16. If the attribute is missing, fall
back to parsing tags such as DEL:YYYY-MM-DD or PICKUP:YYYY-MM-DD.

Delivery method: read Delivery Method. If the value contains
"pickup" or "pick up" (case insensitive), set delivery_method = 'pickup'.
Otherwise set delivery_method = 'delivery'. If the attribute is
missing, infer from tags or leave blank.

Dates are interpreted in the Australia/Sydney timezone.

## Notes Aggregation

Kitchen staff need to see all notes on one line. To construct the
notes column:

Start with order.note if present.

Append the value of Delivery Instructions (case insensitive) from
order.attributes or order.note_attributes if present.

Join the two parts with • if both are non‑empty.

## Primary Line Item

When storing summary fields like product_title and flavour, only the
first non‑gift, positive‑quantity line item is considered. This
primary line item is used to derive the main product title, size
and base flavour. The full item list remains in order_json for
reference.

## Flavour Extraction Rules

Flavour extraction mirrors the logic used on your paper dockets. For
the primary line item only:

Line item properties: search the properties array for keys
containing "gelato flavour" or "gelato flavours" (case
insensitive). Use the associated value, splitting on newlines,
commas or / to handle multiple flavours. Trim and join with
", ".

Variant/Options fallback: if no matching property is found,
split variant_title on newlines, commas or / and take the
first token. This supports cakes where the flavour is encoded in
the variant (e.g. "Chocolate / 10").

Any property whose name starts with _ or contains _origin, _raw,
gwp or _LocalDeliveryID is ignored (blacklisted), matching the
original docket behaviour. If no flavour can be found, leave the
flavour column empty and log a warning for manual review.

## Persist Logic (Edge Function)

In the ingestion endpoint:

Verify HMAC: compute the HMAC using SHOPIFY_WEBHOOK_SECRET and
compare to X-Shopify-Hmac-Sha256. Reject with 401 if
mismatched so Shopify will retry.

Idempotency: check if a record with the same
shopify_order_gid already exists. If so, return 200 without
inserting a new row or deducting stock.

Normalise: convert the raw payload into your internal schema
using a pure function (see below). This function handles
date/method extraction, flavour rules and attribute fallbacks.

Insert: write the normalised row into the appropriate table
(orders_bannos or orders_flourlane), and store the raw
order_json. Initialise all timestamps to NULL and set
stage = 'Filling'.

Stock deduction: call deduct_on_order_create(order_gid, payload)
to write a stock transaction for each cake line item and enqueue
the new order in the work queue.

Emit event: optionally, emit an order_ingested event to notify
downstream systems or Slack.

If any step fails, return 500 to let Shopify retry. All writes
should be wrapped in a transaction.

## Post‑Ingest: Task Splitting

The ingestion pipeline does not split multi‑cake orders into
separate records. Instead, splitting happens after ingestion when
generating tasks for the kitchen. See task-splitting.md

for details on how to create suffixed tasks (A, B, C) and assign
accessories to the first ticket. By separating splitting from
ingestion, you avoid duplicate records and keep the webhook logic
simple and idempotent.

## Test Fixtures

Prepare redacted JSON payloads covering edge cases and validate that
normalisation produces the expected results:

Gelato cake with flavours in properties: ensure multiple
flavours split correctly and variant fallback is not used.

Standard cake with flavours in variant title: confirm the
variant fallback extracts the flavour.

Orders with internal properties: verify blacklisted properties
are ignored and do not contaminate flavours.

Missing delivery date attribute: ensure tags fallback is used.

Pickup orders: confirm is_pickup is set and due date still
extracted.

By covering these scenarios, you ensure the webhook behaves exactly
like your paper kitchen dockets.