import {
  type CheckoutInput,
  type CheckoutQuote,
  type CheckoutQuoteInput,
  CheckoutQuoteSchema,
  type CheckoutResult,
  CheckoutResultSchema,
  type HealthCheck,
  HealthCheckSchema,
  type LeadCreateInput,
  type PublicProduct,
  PublicProductSchema,
} from '@shimanto/types';
import createClient from 'openapi-fetch';
import type { paths } from './schema.js';

/** Extra options forwarded to `fetch`, so Next.js can pass `{ next: { tags, revalidate } }`. */
export type RequestOptions = RequestInit & {
  next?: { tags?: string[]; revalidate?: number | false };
};

export interface ApiClientConfig {
  /** Base URL of the API, e.g. `http://localhost:4000`. */
  baseUrl: string;
  /** Custom fetch (tests, edge runtimes). Defaults to the global fetch. */
  fetch?: typeof fetch;
  /** Send cookies cross-origin (the customer session at checkout). */
  credentials?: RequestInit['credentials'];
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly path: string,
    readonly body: unknown,
  ) {
    const message =
      body && typeof body === 'object' && 'message' in body
        ? String(body.message)
        : `API ${status}`;
    super(message);
    this.name = 'ApiError';
  }
}

/** Cache tags the API revalidates when products change (see ProductsService.revalidate). */
export const productTags = (slug?: string) => ['products', ...(slug ? [`products:${slug}`] : [])];

/**
 * Typed API client.
 * - `api.raw` is the full openapi-fetch client: every endpoint, typed from the OpenAPI spec.
 * - The helpers cover what the public site calls and validate responses at runtime with the shared schemas.
 */
export function createApiClient({
  baseUrl,
  fetch: fetchImpl = globalThis.fetch,
  credentials,
}: ApiClientConfig) {
  const root = baseUrl.replace(/\/+$/, '');
  const raw = createClient<paths>({ baseUrl: root, fetch: fetchImpl, credentials });

  async function request<T>(
    path: string,
    schema: { parse(v: unknown): T },
    init?: RequestOptions,
  ): Promise<T> {
    const res = await fetchImpl(`${root}${path}`, {
      credentials,
      ...init,
      headers: {
        accept: 'application/json',
        ...(init?.body ? { 'content-type': 'application/json' } : {}),
        ...init?.headers,
      },
    });
    const body: unknown = res.headers.get('content-type')?.includes('json')
      ? await res.json()
      : undefined;
    if (!res.ok) throw new ApiError(res.status, path, body);
    return schema.parse(body);
  }

  const post = <T>(
    path: string,
    schema: { parse(v: unknown): T },
    data: unknown,
    init?: RequestOptions,
  ) => request(path, schema, { ...init, method: 'POST', body: JSON.stringify(data) });

  return {
    raw,

    /** Liveness probe of the API. */
    health: (init?: RequestOptions): Promise<HealthCheck> =>
      request('/health', HealthCheckSchema, init),

    products: {
      /** Published products, tagged for on-demand revalidation. */
      list: (init?: RequestOptions): Promise<PublicProduct[]> =>
        request(
          '/v1/products',
          { parse: (v) => PublicProductSchema.array().parse(v) },
          {
            ...init,
            next: { tags: productTags(), ...init?.next },
          },
        ),
      get: (slug: string, init?: RequestOptions): Promise<PublicProduct> =>
        request(`/v1/products/${encodeURIComponent(slug)}`, PublicProductSchema, {
          ...init,
          next: { tags: productTags(slug), ...init?.next },
        }),
    },

    /** Prices a cart + coupon from the database (nothing is created). */
    quote: (input: CheckoutQuoteInput, init?: RequestOptions): Promise<CheckoutQuote> =>
      post('/v1/checkout/quote', CheckoutQuoteSchema, input, init),

    /** Place an order: paid → redirect to the payment page, $0 → confirmed and fulfilling. */
    checkout: (input: CheckoutInput, init?: RequestOptions): Promise<CheckoutResult> =>
      post('/v1/checkout', CheckoutResultSchema, input, init),

    leads: {
      create: (input: LeadCreateInput, init?: RequestOptions): Promise<{ ok: true }> =>
        post('/v1/leads', { parse: (v) => v as { ok: true } }, input, init),
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
