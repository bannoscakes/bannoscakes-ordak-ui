/**
 * Simple request caching and throttling utility
 * 
 * Features:
 * - Time-based cache with configurable TTL
 * - Request throttling to prevent duplicate concurrent requests
 * - Cache invalidation support
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Store per-entry TTL
  promise?: Promise<T>;
}

interface CacheOptions {
  /**
   * Time-to-live in milliseconds. Default: 30000 (30 seconds)
   */
  ttl?: number;
  
  /**
   * Cache key generator function. Default: uses function name + JSON.stringify(args)
   */
  keyGenerator?: (...args: any[]) => string;
  
  /**
   * Explicit key prefix/name for the function (used if function is anonymous or you want custom naming)
   */
  keyPrefix?: string;
}

class RequestCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private defaultTTL = 30000; // 30 seconds

  /**
   * Wrap an async function with caching and throttling
   */
  cached<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    options: CacheOptions = {}
  ): T {
    const { ttl = this.defaultTTL, keyGenerator, keyPrefix } = options;
    
    // Determine function name/prefix for cache keys
    const fnName = keyPrefix || fn.name || 'anonymous';
    
    // Create default key generator that includes function name
    const defaultKeyGenerator = (...args: any[]) => {
      return `${fnName}:${JSON.stringify(args)}`;
    };
    
    const generateKey = keyGenerator || defaultKeyGenerator;

    return (async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
      const key = generateKey(...args);
      const now = Date.now();
      const cached = this.cache.get(key);

      // Check if cache entry exists and is still fresh
      const isFresh = cached && now - cached.timestamp < ttl;

      // Return in-flight promise if request is in progress AND cache is still fresh
      if (isFresh && cached?.promise) {
        return cached.promise;
      }

      // Return cached data if still fresh
      if (isFresh && cached) {
        return cached.data;
      }

      // Cache expired or doesn't exist - clear any stale promise/data before starting new request
      if (cached) {
        this.cache.delete(key);
      }

      // Create new request
      const promise = fn(...args);

      // Store promise to prevent duplicate requests
      this.cache.set(key, {
        data: undefined as any,
        timestamp: now,
        ttl: ttl,
        promise,
      });

      try {
        const data = await promise;
        
        // Update cache with successful result
        this.cache.set(key, {
          data,
          timestamp: now,
          ttl: ttl,
        });

        return data;
      } catch (error) {
        // Remove failed request from cache
        this.cache.delete(key);
        throw error;
      }
    }) as T;
  }

  /**
   * Invalidate cache entries by key pattern
   */
  invalidate(pattern?: string | RegExp): void {
    if (!pattern) {
      // Clear all cache
      this.cache.clear();
      return;
    }

    let regex: RegExp;
    
    if (typeof pattern === 'string') {
      // Validate pattern length to prevent ReDoS
      if (pattern.length > 100) {
        console.warn('Cache invalidation pattern too long, ignoring');
        return;
      }
      
      try {
        // Escape special regex characters to treat string literally
        const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        regex = new RegExp(escapedPattern);
      } catch (error) {
        console.warn('Invalid cache invalidation pattern, ignoring:', error);
        return;
      }
    } else {
      // RegExp object passed directly
      regex = pattern;
    }

    try {
      for (const key of this.cache.keys()) {
        if (regex.test(key)) {
          this.cache.delete(key);
        }
      }
    } catch (error) {
      console.warn('Cache invalidation failed:', error);
    }
  }

  /**
   * Get current cache size
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Clear expired entries
   */
  cleanup(): void {
    const now = Date.now();
    
    for (const [key, entry] of this.cache.entries()) {
      // Use per-entry TTL, falling back to default if not set
      const entryTTL = entry.ttl ?? this.defaultTTL;
      if (now - entry.timestamp > entryTTL) {
        this.cache.delete(key);
      }
    }
  }
}

// Export singleton instance
export const requestCache = new RequestCache();

// Run cleanup every minute
if (typeof window !== 'undefined') {
  setInterval(() => requestCache.cleanup(), 60000);
}

