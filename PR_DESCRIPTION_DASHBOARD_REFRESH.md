## What / Why

Fix inconsistent cache bypass behavior for user-triggered refresh callbacks in Dashboard.

Production pages were receiving `onRefresh={loadDashboardStats}` without arguments, defaulting to cached data, while the Header received `onRefresh={() => loadDashboardStats(true)}` to bypass cache. This meant user-triggered refreshes from production pages would serve stale cached data instead of fresh data.

## How to verify

```bash
# Build succeeds
npm run build

# Tests pass
npm test

# Manual verification:
# 1. Navigate to Bannos Production page
# 2. Click any refresh button
# 3. Data should be fresh (bypass cache), not stale
```

## Changes

- `src/components/Dashboard.tsx` lines 213 & 223: Changed `onRefresh={loadDashboardStats}` to `onRefresh={() => loadDashboardStats(true)}` for both production pages

## Checklist

- [x] One small task only (cache consistency fix)
- [x] No direct writes from client; RPCs only
- [x] No secrets/keys leaked
- [x] `npm run build` passes locally
- [x] `npm test` passes

## Notes

All user-triggered refresh actions now consistently bypass cache to ensure fresh data. Auto-refresh and tab visibility changes continue to use cached data for performance (as intended).

