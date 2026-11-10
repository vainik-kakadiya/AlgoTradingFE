import { useCallback } from 'react';
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api, type AuthUser } from '../services/api';

export const AUTH_KEY = ['auth', 'me'] as const;

/** The logged-in user (null = not logged in). Checked once, then updated by login/logout/401s. */
export function useAuth() {
  return useQuery<AuthUser | null>({ queryKey: AUTH_KEY, queryFn: api.me, staleTime: Infinity, retry: false });
}

/** Forget the session and every cached API response (so nothing is visible after logging out). */
export function clearSession(queryClient: QueryClient): void {
  queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== AUTH_KEY[0] });
  queryClient.setQueryData(AUTH_KEY, null);
}

export function useLogout() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useCallback(async () => {
    try {
      await api.logout();
    } finally {
      clearSession(queryClient);
      navigate('/login', { replace: true });
    }
  }, [queryClient, navigate]);
}
