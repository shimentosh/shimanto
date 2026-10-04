import { z } from 'zod';

export const HealthCheckSchema = z.object({
  status: z.enum(['ok', 'degraded', 'down']),
  service: z.string(),
  version: z.string(),
  uptimeSeconds: z.number().nonnegative(),
  timestamp: z.iso.datetime(),
});
export type HealthCheck = z.infer<typeof HealthCheckSchema>;
