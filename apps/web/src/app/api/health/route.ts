import type { HealthCheck } from '@shimanto/types';

export const dynamic = 'force-dynamic';

/** Liveness probe for the web app (brief §3 utility routes). */
export function GET() {
  const body: HealthCheck = {
    status: 'ok',
    service: 'web',
    version: process.env.npm_package_version ?? '0.0.0',
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  };
  return Response.json(body, { headers: { 'cache-control': 'no-store' } });
}
