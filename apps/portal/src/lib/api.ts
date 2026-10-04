import { createHttpClient } from '@shimanto/sdk';
import { API_URL } from './config';

/** Browser client for the customer API. The session is an httpOnly cookie set by the API. */
export const api = createHttpClient({ baseUrl: API_URL });
