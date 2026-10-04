'use client';

import type { CustomerMe } from '@shimanto/types';
import { ApiError } from '@shimanto/sdk';
import { usePathname, useRouter } from 'next/navigation';
import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { LoadingState } from '@shimanto/ui';
import { api } from './api';
import { API_URL } from './config';

interface SessionValue {
  me: CustomerMe | null;
  /** True until the first /me call finishes. */
  checking: boolean;
  setMe: (me: CustomerMe | null) => void;
  refresh: () => Promise<CustomerMe | null>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

const NO_ADMIN_AUTO = 'sx-portal-no-admin-auto';

/**
 * No customer session: a team member signed in to the admin gets the portal as the customer
 * account with the same email. Refreshes an expired admin token once. Throws when not possible.
 */
async function adminSession(): Promise<CustomerMe> {
  try {
    if (sessionStorage.getItem(NO_ADMIN_AUTO)) throw new Error('signed out');
  } catch (error) {
    if (error instanceof Error && error.message === 'signed out') throw error;
  }
  try {
    return await api.post<CustomerMe>('/v1/customer/auth/from-admin');
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error;
    const refreshed = await fetch(`${API_URL}/v1/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!refreshed.ok) throw error;
    return api.post<CustomerMe>('/v1/customer/auth/from-admin');
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<CustomerMe | null>(null);
  const [checking, setChecking] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const next = await api.get<CustomerMe>('/v1/account/me');
      setMe(next);
      return next;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) setMe(null);
      return null;
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    api
      .get<CustomerMe>('/v1/account/me')
      .catch(adminSession)
      .then(
        (next) => {
          if (cancelled) return;
          setMe(next);
          setChecking(false);
        },
        () => {
          if (cancelled) return;
          setMe(null);
          setChecking(false);
        },
      );
    return () => {
      cancelled = true;
    };
  }, []);

  const router = useRouter();
  const signOut = useCallback(async () => {
    await api.post('/v1/customer/auth/logout').catch(() => undefined);
    // Don't sign straight back in from the admin session in this tab.
    try {
      sessionStorage.setItem(NO_ADMIN_AUTO, '1');
    } catch {
      // storage unavailable: fine
    }
    setMe(null);
    router.replace('/login');
  }, [router]);

  return (
    <SessionContext.Provider value={{ me, checking, setMe, refresh, signOut }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside <SessionProvider>');
  return value;
}

/** Renders children only for a signed-in customer; otherwise goes to /login?next=… */
export function RequireCustomer({ children }: { children: ReactNode }) {
  const { me, checking } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!checking && !me) {
      const next = `${pathname}${window.location.search}`;
      router.replace(`/login?next=${encodeURIComponent(next)}`);
    }
  }, [checking, me, pathname, router]);

  if (checking || !me) {
    return (
      <div className="mx-auto max-w-md px-6 py-24">
        <LoadingState rows={3} label="Checking your session…" />
      </div>
    );
  }
  return <>{children}</>;
}

/** For sign-in pages: a signed-in customer skips straight to where they were going. */
export function useRedirectIfSignedIn(next: string) {
  const { me, checking } = useSession();
  const router = useRouter();
  useEffect(() => {
    if (!checking && me) router.replace(next);
  }, [checking, me, next, router]);
}
