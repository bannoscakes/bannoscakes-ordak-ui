# Data Caching and Throttling Implementation

## Date: 2025-11-15
## Task: Implement request caching and throttling to reduce API calls

## Summary
Implemented a simple yet effective caching and request throttling system to reduce unnecessary API calls and improve application performance.

## Implementation Details

### Core Components

#### 1. Request Cache Utility (`src/lib/request-cache.ts`)
A lightweight caching layer with the following features:

- **Time-based caching**: Configurable TTL (default: 30 seconds) with per-entry TTL support
- **Request deduplication**: Prevents concurrent duplicate requests
- **Function-aware keys**: Cache keys include function name for proper invalidation
- **Cache invalidation**: Pattern-based cache clearing after mutations with ReDoS protection
- **Automatic cleanup**: Removes expired entries every minute, respecting per-entry TTLs
- **Zero dependencies**: Uses native JavaScript Map for storage
- **Security hardened**: Input validation, length limits, and error handling to prevent ReDoS attacks

#### 2. Cached RPC Functions (`src/lib/rpc-client.ts`)
Created cached versions of frequently called functions:

- `getQueueCached()`: Cached version of `getQueue()` with 30s TTL
- `getQueueStatsCached()`: Cached version of `getQueueStats()` with 30s TTL
- `invalidateQueueCache()`: Utility to clear queue-related cache after mutations

#### 3. Dashboard Integration (`src/components/Dashboard.tsx`)
Updated the Dashboard component to use cached data:

- Replaced `getQueue()` calls with `getQueueCached()`
- Dashboard stats now benefit from 30-second caching
- Combined with Page Visibility API (Task 7) for optimal performance

## Benefits

### Performance Improvements
1. **Reduced API Calls**: Dashboard refresh now uses cached data when available
2. **Request Deduplication**: Multiple components requesting same data share one request
3. **Lower Server Load**: 30-second cache reduces database queries significantly
4. **Faster UI Updates**: Cached data returns immediately without network delay

### User Experience
1. **Faster Page Loads**: Subsequent visits use cached data
2. **Smoother Navigation**: Moving between views uses cached data when available
3. **Reduced Latency**: No waiting for API calls when cache is fresh
4. **Consistent Behavior**: Works seamlessly with existing features (refresh button, auto-refresh)

## Cache Strategy

### When to Use Cached Functions
Use cached versions for:
- Dashboard overview data
- Monitor pages showing queue status
- Analytics pages with aggregated data
- Any view where 30-second stale data is acceptable

### When to Use Direct Functions
Use non-cached versions for:
- Individual order details (real-time data required)
- Mutation operations (create, update, delete)
- User-initiated actions requiring latest data
- Critical time-sensitive operations

### Cache Invalidation
The cache is automatically invalidated:
- After 30 seconds (TTL expiration)
- When calling `invalidateQueueCache()` after mutations
- On page visibility change (triggers fresh load via Task 7)

## Integration with Existing Features

### Works Seamlessly With:
1. **Task 7 - Page Visibility API**: 
   - Cache refreshes when tab becomes visible
   - Interval polling uses cache during active usage
   
2. **Task 7 - Manual Refresh Button**:
   - Bypasses cache for user-initiated refreshes
   - Race condition protection ensures data consistency
   
3. **Task 4 - URL Parameter Parsing**:
   - Cache keys include all URL parameters
   - Different views/filters have separate cache entries

## Configuration

### Customizing Cache TTL
```typescript
// Custom TTL for specific use case
const customCached = requestCache.cached(myFunction, {
  ttl: 60000, // 60 seconds
});
```

### Custom Cache Key Generation
```typescript
const customCached = requestCache.cached(myFunction, {
  keyGenerator: (...args) => `custom-key-${args[0].id}`,
});
```

### Explicit Key Prefix (for anonymous functions or custom naming)
```typescript
const customCached = requestCache.cached(myFunction, {
  keyPrefix: 'myCustomPrefix',
});
```

## Security Features

### ReDoS Protection
The cache invalidation logic includes multiple layers of protection against Regular Expression Denial of Service (ReDoS) attacks:

1. **Length Validation**: String patterns are limited to 100 characters
2. **Literal Matching**: String patterns are escaped to be treated literally (not as regex)
3. **Error Handling**: try/catch blocks prevent invalid patterns from crashing the application
4. **Safe Defaults**: RegExp objects can be passed directly for advanced use cases

### Race Condition Protection
The cache correctly handles concurrent requests:

1. **Fresh Data Check First**: Returns in-flight promises only if cache is still fresh
2. **Stale Promise Cleanup**: Expired cache entries are deleted before starting new requests
3. **Promise Deduplication**: Multiple concurrent calls share a single promise
4. **Per-Entry TTL**: Each cache entry respects its own TTL, not a global default

## Future Enhancements

Potential improvements for the caching system:

1. **LRU Cache**: Implement size-based eviction for large datasets
2. **Persistent Cache**: Use IndexedDB for cross-session caching
3. **Selective Invalidation**: More granular cache invalidation strategies
4. **Cache Metrics**: Track hit/miss rates for optimization
5. **Background Refresh**: Update cache in background before expiry

## Testing Recommendations

To verify caching is working:

1. **Open DevTools Network tab**
2. **Navigate to Dashboard** - should see API requests
3. **Click refresh within 30 seconds** - should NOT see new requests (cache hit)
4. **Wait 30+ seconds and refresh** - should see new requests (cache miss)
5. **Switch views and return** - should use cache if within TTL

## Migration Guide

### For Future Development

When adding new data loading functions:

```typescript
// 1. Create your async function
export async function getMyData(params: MyParams) {
  // ... implementation
}

// 2. Create cached version
export const getMyDataCached = requestCache.cached(getMyData, {
  ttl: 30000, // Adjust TTL as needed
});

// 3. Add invalidation function if needed
export function invalidateMyDataCache(): void {
  requestCache.invalidate(/getMyData/);
}

// 4. Use in components
import { getMyDataCached } from '../lib/rpc-client';

// In component:
const data = await getMyDataCached(params);
```

## Related Tasks

- Task 7: Manual refresh button with Page Visibility API optimization
- Task 8: Deep linking verification (cache respects URL parameters)
- Original reportui.md Task 5: Data loading optimizations

##

 Conclusion

✅ **Simple yet effective caching layer that significantly reduces API calls without compromising data freshness.**

The implementation:
- Requires minimal code changes
- Works transparently with existing code
- Provides immediate performance benefits
- Is easy to extend and customize
- Follows the principle of "use cache when reasonable, fresh data when necessary"

