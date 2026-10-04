import { ApiError } from './client.js';

export interface HttpClientConfig {
  /** Base URL of the API, e.g. `http://localhost:4000`. */
  baseUrl: string;
  fetch?: typeof fetch;
  /**
   * Called once when a request returns 401; return true if the session was refreshed and the
   * request should be retried (admin: POST /v1/auth/refresh). Concurrent 401s share one refresh.
   */
  refresh?: () => Promise<boolean>;
  /** Called when a request is still 401 after any refresh (e.g. redirect to the sign-in page). */
  onUnauthorized?: () => void;
}

type Query = Record<string, string | number | boolean | undefined | null>;

export interface HttpClient {
  get<T>(path: string, query?: Query): Promise<T>;
  post<T>(path: string, body?: unknown): Promise<T>;
  put<T>(path: string, body?: unknown): Promise<T>;
  patch<T>(path: string, body?: unknown): Promise<T>;
  delete<T = void>(path: string, body?: unknown): Promise<T>;
  /** multipart/form-data (file uploads); the browser sets the boundary. */
  upload<T>(path: string, form: FormData): Promise<T>;
  /** Absolute URL of an API path (for links and redirects such as OAuth). */
  url(path: string, query?: Query): string;
}

/**
 * Cookie-session HTTP client for the admin and customer portals. Sessions are httpOnly cookies
 * set by the API, so requests always send credentials and nothing sensitive is kept in JS.
 */
export function createHttpClient({
  baseUrl,
  fetch: fetchImpl = globalThis.fetch.bind(globalThis),
  refresh,
  onUnauthorized,
}: HttpClientConfig): HttpClient {
  const root = baseUrl.replace(/\/+$/, '');
  let refreshing: Promise<boolean> | null = null;

  const url = (path: string, query?: Query) => {
    const search = new URLSearchParams();
    for (const [k, v] of Object.entries(query ?? {})) {
      if (v !== undefined && v !== null && v !== '') search.set(k, String(v));
    }
    const qs = search.toString();
    return `${root}${path}${qs ? `?${qs}` : ''}`;
  };

  async function send<T>(
    method: string,
    path: string,
    body?: unknown,
    query?: Query,
    retried = false,
  ): Promise<T> {
    const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
    const res = await fetchImpl(url(path, query), {
      method,
      credentials: 'include',
      headers: {
        accept: 'application/json',
        ...(body !== undefined && !isForm ? { 'content-type': 'application/json' } : {}),
      },
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
    });
    if (res.status === 401 && refresh && !retried) {
      refreshing ??= refresh().finally(() => {
        refreshing = null;
      });
      if (await refreshing) return send<T>(method, path, body, query, true);
    }
    const data: unknown = res.headers.get('content-type')?.includes('json')
      ? await res.json().catch(() => undefined)
      : res.status === 204
        ? undefined
        : await res.text().catch(() => undefined);
    if (!res.ok) {
      if (res.status === 401) onUnauthorized?.();
      throw new ApiError(res.status, path, data);
    }
    return data as T;
  }

  return {
    get: (path, query) => send('GET', path, undefined, query),
    post: (path, body) => send('POST', path, body ?? {}),
    put: (path, body) => send('PUT', path, body ?? {}),
    patch: (path, body) => send('PATCH', path, body ?? {}),
    delete: (path, body) => send('DELETE', path, body),
    upload: (path, form) => send('POST', path, form),
    url,
  };
}

/** Field → message map from a 400/422 API error, for inline form errors. */
export function fieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError)) return {};
  const issues = (error.body as { issues?: Array<{ path: string; message: string }> } | undefined)
    ?.issues;
  return Object.fromEntries((issues ?? []).map((i) => [i.path, i.message]));
}

/** A readable message for any error (network, API, unexpected). */
export function errorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  if (error instanceof ApiError) {
    if (error.status === 429) return 'Too many attempts. Please wait a minute and try again.';
    if (error.status >= 500) return fallback;
    return error.message || fallback;
  }
  if (error instanceof TypeError)
    return 'Can’t reach the server. Check your connection and try again.';
  return fallback;
}
