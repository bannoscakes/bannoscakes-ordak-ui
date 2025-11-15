## What / Why

Standardize orderNumber fallback chain in QueueTable to match StaffWorkspace and SupervisorWorkspace.

All three components should use the same precedence for displaying order identifiers: `human_id` → `shopify_order_number` → `id`.

## How to verify

```bash
# Build succeeds
npm run build

# Tests pass
npm test

# Visually: All queue views now show consistent order numbers
```

## Changes

- `src/components/QueueTable.tsx` line 122: Updated orderNumber fallback from `human_id || id` to `human_id || shopify_order_number || id`

## Checklist

- [x] One small task only (orderNumber fallback consistency)
- [x] No direct writes from client; RPCs only
- [x] No secrets/keys leaked
- [x] `npm run build` passes locally
- [x] `npm test` passes

## Notes

This ensures all queue views (Staff, Supervisor, and Queue Table) display the same order identifier with consistent fallback precedence, improving UX consistency across the application.

