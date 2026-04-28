import { QueryClient } from '@tanstack/react-query';

/**
 * Caching is intentionally disabled — every component mount triggers a
 * fresh API call. The QueryClient is still here because every page uses
 * the React Query API surface (useQuery/useMutation), but `staleTime: 0`
 * marks data as stale the instant it's stored, and `refetchOnMount:
 * 'always'` forces a refetch even if a stale copy exists.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0,
      gcTime: 0,
      refetchOnMount: 'always',
      refetchOnReconnect: 'always',
      refetchOnWindowFocus: false,
      retry: (failureCount, err) => {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status && status >= 400 && status < 500) return false;
        return failureCount < 2;
      },
    },
  },
});
