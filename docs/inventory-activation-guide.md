# Inventory System Activation Guide

The inventory deduction system ships **disabled by default**. This document explains the architecture, the steps required to activate it safely, and how to wire the deductions into Shopify webhooks once you are ready.

---

## System Architecture

- **Inventory Items (`inventory_items`)**  
  Canonical catalogue of stock-keeping units scoped per store. Tracks quantity on hand, reorder thresholds, and arbitrary metadata.

- **Bill of Materials (`boms`, `bom_items`)**  
  Each product maps to one BOM per store. BOM items link directly to `inventory_items`, specify required quantity, and optionally the stage that consumes the stock.

- **Inventory Transactions (`inventory_transactions`)**  
  Immutable ledger that records deductions (`direction = 'deduct'`) and reversals (`direction = 'restock'`). Enforces idempotency through a unique constraint per order/item/direction.

- **Feature Flag (`settings.inventory_tracking_enabled`)**  
  Global kill switch. Both RPCs exit early (and log a skip event) when the flag is `false`. The Settings UI toggle controls this flag.

- **Audit Trail (`audit_log`)**  
  Every deduction, restock, and skip condition writes to `audit_log` with contextual metadata for observability.

---

## Activation Steps

1. **Populate BOMs**
   - Ensure every sellable product has a BOM for the relevant store.
   - Each `bom_items` row must reference the intended `inventory_items.id`.

2. **Set Initial Inventory Balances**
   - Import or upsert all stock counts into `inventory_items`.
   - Optional: back-fill historical transactions via `inventory_transactions` if you want a seeded ledger.

3. **Verify Feature Flag State**
   - From the Settings UI (`Settings → Inventory Tracking`), confirm the toggle reflects the expected initial state (`Inactive`).
   - Leave the flag **OFF** until deductions have been dry-run in staging.

4. **Dry-Run Deduction Flow**
   - Manually call `deduct_inventory_for_order` for a known order in staging with the flag still off (expect a “feature_flag_disabled” response and an audit log entry).
   - Temporarily enable the flag in **staging**, repeat the call, and confirm:
     - Inventory quantities decrease.
     - `inventory_transactions` stores the ledger rows.
     - `audit_log` records the deduction.

5. **Wire Shopify Webhooks (manual step, see snippet below)**
   - Add the integration snippet to both Bannos and Flourlane webhook edge functions after the core order ingest logic.

6. **Production Cutover**
   - Enable the flag in production via Settings once BOMs and stock levels are validated.
   - Monitor `inventory_transactions` and `audit_log` closely during the first day.

---

## Webhook Integration Code

> **Important:** Do **not** commit this snippet. Paste it manually into each Shopify webhook once you are ready to activate the system.

```ts
// After inserting/updating the order record inside the webhook handler:
const { data: deductionResult, error: deductionError } = await supabase.rpc(
  'deduct_inventory_for_order',
  {
    p_order_id: orderId,           // e.g. orders_{store}.id
    p_product_title: orderTitle,   // optional; null will use DB value
    p_store: storeKey,             // 'bannos' | 'flourlane'
    p_quantity: itemQuantity ?? 1,
  },
);

if (deductionError) {
  console.error('Inventory deduction failed', {
    orderId,
    storeKey,
    error: deductionError,
  });
} else if (deductionResult?.status === 'skipped') {
  console.warn('Inventory deduction skipped', deductionResult);
}

// When reversing/cancelling an order:
const { data: restockResult, error: restockError } = await supabase.rpc(
  'restock_order',
  {
    p_order_id: orderId,
    p_store: storeKey,
  },
);

if (restockError) {
  console.error('Inventory restock failed', { orderId, storeKey, restockError });
}
```

---

## Testing Guide

| Scenario | Steps | Expected Outcome |
| --- | --- | --- |
| **Flag OFF (default)** | Call `deduct_inventory_for_order` | Function returns `{ status: "skipped", reason: "feature_flag_disabled" }`; inventory unchanged; audit log entry created. |
| **Flag ON – Happy Path** | Enable flag → create test order with completed BOM → call `deduct_inventory_for_order` | Inventory quantities decrease; ledger row inserted; audit log records `"inventory_deducted"`. |
| **Flag ON – Missing BOM** | Enable flag → call RPC for order without BOM | Function returns skip with `reason: "bom_not_found"`; audit log entry added; inventory untouched. |
| **Flag ON – Insufficient Stock** | Enable flag → set `quantity_on_hand` lower than required → call RPC | Function returns skip with `reason: "insufficient_stock"` and lists shortages; audit log entry created. |
| **Restock** | After a successful deduction, call `restock_order` | Quantities return to original values; ledger row with `direction = 'restock'`; audit log records `"inventory_restocked"`. |
| **Idempotency Check** | Call deduction twice with same order | Second call returns skip with `reason: "already_deducted"`; no additional transactions written. |

---

### Operational Tips

- Monitor `inventory_transactions` for unexpected rows or negative balances after each deployment.
- Use the Settings toggle as an emergency stop—switching the flag off immediately forces subsequent RPC calls into no-op mode.
- The new `supabase/functions/flip-shopify-oos` edge function can be invoked manually once you are ready to publish OOS states back to Shopify (see function comments for details).


