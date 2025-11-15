## What / Why
Implement data caching and request throttling to reduce unnecessary API calls and improve application performance. Adds a lightweight, security-hardened caching layer with 30-second TTL and request deduplication for dashboard stats.

## How to verify
1. Open DevTools Network tab
2. Navigate to Dashboard - observe API requests for queue data
3. Click refresh button within 30 seconds - should NOT see new requests (cache hit)
4. Wait 30+ seconds and refresh - should see new requests (cache expired)
5. Navigate between pages - observe reduced API calls when returning to dashboard
6. Review `docs/data-caching-implementation.md` for complete implementation details

## Performance Impact
- Dashboard stats use cached data (30s TTL)
- Request deduplication prevents duplicate concurrent calls
- Works seamlessly with Page Visibility API (Task 7)
- Reduces server load while maintaining data freshness

## Security & Robustness
- ReDoS protection: pattern length validation, string escaping, error handling
- Race condition fixes: proper in-flight promise handling, stale promise cleanup
- Function-aware cache keys: proper invalidation support
- Per-entry TTL: accurate cleanup and expiration handling

## Checklist
- [x] One small task only (no mixed changes)
- [x] No direct writes from client; RPCs only
- [x] No secrets/keys leaked
- [x] `npm run type-check` passes locally (pre-existing errors only)
- [x] `npm run build` passes locally

