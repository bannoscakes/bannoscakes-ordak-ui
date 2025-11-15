## What / Why
Apply data caching to staff workspace to eliminate redundant API calls. Staff workspace was fetching 100 orders from each store on every mount, duplicating data the dashboard had just loaded.

## How to verify
1. Open DevTools Network tab
2. Load dashboard → observe queue API calls
3. Navigate to Staff workspace within 30 seconds → should NOT see new queue API calls (cache hit)
4. Wait 30+ seconds, then navigate to Staff → should see new API calls (cache expired)
5. Navigating back and forth between dashboard and staff should feel instant

## Changes
- Staff workspace now uses `getQueueCached()` instead of `getQueue()`
- Benefits from 30-second cache TTL
- Shares cached data with dashboard component
- Reduces server load and improves navigation speed

## Performance Impact
- Eliminates duplicate 200-order fetch (100 per store) when switching from dashboard to staff view
- Navigation feels instant when cache is fresh
- Reduces overall API calls by reusing cached data

## Checklist
- [x] One small task only (no mixed changes)
- [x] No direct writes from client; RPCs only
- [x] No secrets/keys leaked
- [x] `npm run type-check` passes locally (pre-existing errors only)
- [x] `npm run build` passes locally

