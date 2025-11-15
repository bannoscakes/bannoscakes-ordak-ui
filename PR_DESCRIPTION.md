## What / Why
Added missing `shopifyOrderNumber` field to test/demo components (`RecentOrders.tsx` and `TestOrderDetail.tsx`) to fix TypeScript type mismatches and ensure type consistency across the entire codebase.

## How to verify
```bash
npm run type-check  # Verify RecentOrders and TestOrderDetail errors are gone
npm run build       # Verify build succeeds
```

## Checklist
- [x] One small task only (no mixed changes)
- [x] No direct writes from client; RPCs only
- [x] No secrets/keys leaked
- [x] `npm run type-check` passes locally

