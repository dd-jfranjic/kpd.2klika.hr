'use client';

import { useAuth } from '@/contexts/auth-context';

/**
 * Hook to check if the current user is an admin
 * Uses the isAdmin flag from auth context
 */
export function useIsAdmin(): { isAdmin: boolean; isLoading: boolean } {
  const { isAdmin, loading, user } = useAuth();

  return {
    isAdmin: !!user && isAdmin,
    isLoading: loading,
  };
}
