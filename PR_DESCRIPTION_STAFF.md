## What / Why
Apply data caching to staff workspace AND add missing auto-refresh features. Staff workspace was fetching 100 orders from each store on every mount (duplicating dashboard data), and was missing auto-refresh, tab visibility refresh, and proper manual refresh behavior.

## How to verify
1. Open DevTools Network tab
2. Load dashboard → observe queue API calls
3. Navigate to Staff workspace within 30 seconds → should NOT see new queue API calls (cache hit)
4. Wait 30 seconds on Staff workspace → should see fresh data fetch (auto-refresh)
5. Switch to another tab, wait, then switch back → should see fresh data fetch (tab visibility)
6. Click Refresh button → should ALWAYS see fresh data fetch (bypass cache)
7. Navigating between dashboard and staff should feel instant within cache window

## Changes
**Caching:**
- Staff workspace now uses `getQueueCached()` for initial/auto loads
- Benefits from 30-second cache TTL
- Shares cached data with dashboard component

**Auto-refresh (NEW):**
- 30-second interval fetches fresh data (uses cache)
- Only runs when tab is visible (Page Visibility API)

**Tab Visibility (NEW):**
- Refreshes data when user returns to tab
- Ensures up-to-date view after tab switching

**Manual Refresh (FIXED):**
- Refresh button now bypasses cache (`getQueue` instead of `getQueueCached`)
- Always provides fresh data on user demand

## Performance Impact
- Eliminates duplicate 200-order fetch when switching from dashboard to staff view
- Auto-refresh keeps data current without user intervention
- Navigation feels instant when cache is fresh
- Manual refresh provides guaranteed fresh data

## Checklist
- [x] One small task only (no mixed changes)
- [x] No direct writes from client; RPCs only
- [x] No secrets/keys leaked
- [x] `npm run type-check` passes locally (pre-existing errors only)
- [x] `npm run build` passes locally

