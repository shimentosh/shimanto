import { createHttpClient } from '@shimanto/sdk';
import { API_URL } from './config';

/**
 * Browser client for the admin API. The access token is a short-lived httpOnly cookie; on a
 * 401 the client refreshes it once (rotating refresh cookie) and retries.
 */
export const api = createHttpClient({
  baseUrl: API_URL,
  refresh: async () => {
    const res = await fetch(`${API_URL}/v1/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    return res.ok;
  },
  onUnauthorized: () => {
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
      const next = `${window.location.pathname}${window.location.search}`;
      window.location.replace(`/login?next=${encodeURIComponent(next)}`);
    }
  },
});
