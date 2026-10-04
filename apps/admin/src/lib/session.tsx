'use client';

import type { AuthUser } from '@shimanto/types';
import { LoadingState } from '@shimanto/ui';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { api } from './api';

interface AdminSession {
  user: AuthUser | null;
  checking: boolean;
  setUser: (user: AuthUser | null) => void;
  signOut: () => Promise<void>;
}

const Context = createContext<AdminSession | null>(null);

export function AdminSessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    api.get<AuthUser>('/v1/auth/me').then(
      (me) => {
        if (cancelled) return;
        setUser(me);
        setChecking(false);
      },
      () => {
        if (cancelled) return;
        setUser(null);
        setChecking(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const signOut = useCallback(async () => {
    await api.post('/v1/auth/logout').catch(() => undefined);
    setUser(null);
    router.replace('/login');
  }, [router]);

  return (
    <Context.Provider value={{ user, checking, setUser, signOut }}>{children}</Context.Provider>
  );
}

export function useAdmin(): AdminSession {
  const value = useContext(Context);
  if (!value) throw new Error('useAdmin must be used inside <AdminSessionProvider>');
  return value;
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, checking } = useAdmin();
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (!checking && !user) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [checking, user, pathname, router]);
  if (checking || !user) {
    return (
      <div className="mx-auto max-w-md px-6 py-24">
        <LoadingState rows={3} label="Checking your session…" />
      </div>
    );
  }
  return <>{children}</>;
}
