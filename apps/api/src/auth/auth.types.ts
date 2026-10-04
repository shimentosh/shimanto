import type { AuthUser } from '@shimanto/types';
import type { Request } from 'express';

export type { AuthUser };

/** Admin session. `typ` keeps admin and buyer tokens from ever being accepted in each other's place. */
export interface AccessTokenPayload {
  sub: string;
  role: AuthUser['role'];
  typ: 'admin';
}

/**
 * Customer portal session. Grants access to that customer's own orders only. `sv` must match the
 * customer's sessionVersion: a password change or reset ends every older session at once.
 */
export interface CustomerTokenPayload {
  sub: string;
  typ: 'customer';
  sv: number;
}

export type AuthedRequest = Request & { user?: AuthUser; customerId?: string };

export const ACCESS_COOKIE = 'sx_at';
export const REFRESH_COOKIE = 'sx_rt';
export const CUSTOMER_COOKIE = 'sx_cs';
/** Marks a browser a customer has signed in from before, so only new devices get a sign-in alert. */
export const DEVICE_COOKIE = 'sx_dv';
/** OAuth `state` for connecting a GitHub account (10 minutes, API only). */
export const GITHUB_STATE_COOKIE = 'sx_gh';
