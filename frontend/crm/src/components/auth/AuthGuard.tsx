'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredToken, isTokenExpired } from '../../lib/auth';
import { useAuthStore } from '../../store';
import { Loader2 } from 'lucide-react';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const setToken = useAuthStore((s) => s.setToken);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [isChecking, setIsChecking] = useState(true);

  const checkAuth = React.useCallback(async () => {
    const token = getStoredToken();

    if (!token || isTokenExpired(token)) {
      setIsChecking(true);
      useAuthStore.getState().logout();
      window.location.replace('/login');
      return false;
    }

    // Only call setToken (which triggers fetchMe) if not already authenticated
    // to avoid a redundant second fetchMe call on page reload
    const state = useAuthStore.getState();
    if (!state.isAuthenticated || Object.keys(state.capabilities).length === 0) {
      setToken(token);
      await useAuthStore.getState().fetchMe();
    }
    setIsChecking(false);
    return true;
  }, [router, setToken]);

  useEffect(() => {
    checkAuth();

    const handlePageShow = () => {
      checkAuth();
    };

    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, [checkAuth]);

  if (isChecking || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex items-center gap-3 text-teal-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-sm font-medium">Verifying authentication...</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
