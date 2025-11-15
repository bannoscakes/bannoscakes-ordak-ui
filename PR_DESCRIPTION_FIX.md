## What / Why
Fix auto-refresh to bypass cache for responsive dashboard updates. The 30-second interval and tab visibility refresh were using cached data, making the app feel sluggish with potentially stale data.

## How to verify
1. Open dashboard and observe initial load (fast, may use cache)
2. Wait 30 seconds - should see fresh data fetch in Network tab
3. Switch to another tab, wait, then switch back - should see fresh data fetch
4. Click manual refresh button - should always fetch fresh data
5. App should feel sharp and responsive with regular updates

## Changes
- Auto-refresh interval (30s): bypasses cache → fresh data every 30 seconds
- Tab visibility refresh: bypasses cache → fresh data when switching back
- Initial page load: uses cache → fast startup
- Manual refresh: bypasses cache → user expectation

## Checklist
- [x] One small task only (no mixed changes)
- [x] No direct writes from client; RPCs only
- [x] No secrets/keys leaked
- [x] `npm run type-check` passes locally (pre-existing errors only)
- [x] `npm run build` passes locally

