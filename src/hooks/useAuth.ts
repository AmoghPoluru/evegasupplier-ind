'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { trpc } from '@/trpc/client';

export function useAuth() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, isLoading, setUser, setLoading, logout: storeLogout } = useAuthStore();
  
  // Use session query like evega does - returns { user: {...} } or { user: null }
  const { data: session, isLoading: queryLoading, refetch } = trpc.auth.session.useQuery(
    undefined,
    {
      retry: false,
      refetchOnWindowFocus: true,
      refetchOnMount: true,
    }
  );

  // Extract user from session and map to auth store User type
  const currentUser = session?.user && session.user.email
    ? {
        id: String(session.user.id),
        email: session.user.email,
        name: session.user.name ?? null,
        role: (session.user as any).role,
      }
    : null;

  useEffect(() => {
    if (currentUser) {
      setUser(currentUser);
    } else if (!queryLoading && !currentUser && isAuthenticated) {
      // If we thought we were authenticated but query says we're not, clear state
      setUser(null);
    }
    setLoading(queryLoading);
  }, [currentUser, queryLoading, setUser, setLoading, isAuthenticated]);

  // Refetch when page becomes visible (e.g., after OAuth redirect)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refetch();
      }
    };
    
    // Also refetch on page load (useful after OAuth redirect)
    if (typeof window !== 'undefined') {
      refetch();
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [refetch]);

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: async (data) => {
      // Map Payload user to auth store User type
      if (data.user && data.user.email) {
        setUser({
          id: String(data.user.id),
          email: data.user.email,
          name: data.user.name ?? null,
          role: (data.user as any).role,
        });
      }
      // Invalidate session query to refetch with new cookie
      await queryClient.invalidateQueries({ queryKey: [['auth', 'session']] });
      const role = (data.user as { role?: string } | undefined)?.role;
      let next = '/';
      if (role === 'bdo') next = '/bdo/dashboard';
      else if (role === 'vendor') next = '/vendor/dashboard';
      router.push(next);
    },
  });

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: async () => {
      storeLogout();
      // Invalidate session query to clear user data
      await queryClient.invalidateQueries({ queryKey: [['auth', 'session']] });
      router.push('/');
    },
  });

  const login = async (email: string, password: string) => {
    return loginMutation.mutateAsync({ email, password });
  };

  const logout = async () => {
    return logoutMutation.mutateAsync();
  };

  return {
    user,
    isAuthenticated,
    isLoading: isLoading || queryLoading,
    login,
    logout,
    refetch: refetch, // Export refetch for manual refresh
  };
}
