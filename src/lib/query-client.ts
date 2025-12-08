import { QueryClient } from '@tanstack/react-query';

/**
 * TanStack Query client configuration
 * 
 * Key settings:
 * - staleTime: 30s - data considered fresh, no background refetch
 * - gcTime: 5min - keep unused data in cache for quick access
 * - refetchOnWindowFocus: true - refresh when user returns to tab
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,        // 30 seconds - data considered fresh
      gcTime: 5 * 60_000,       // 5 minutes - garbage collection time
      refetchOnWindowFocus: true,
      retry: 1,
      // refetchOnMount defaults to true, which respects staleTime
      // Fresh data (<30s) shows instantly, stale data refetches in background
    },
  },
});
