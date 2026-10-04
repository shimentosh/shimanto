import { Injectable } from '@nestjs/common';
import type { HealthCheck } from '@shimanto/types';

@Injectable()
export class HealthService {
  private readonly version = process.env.npm_package_version ?? '0.0.0';

  /** Liveness only for now; DB/Redis/Meilisearch readiness checks join in Phase 3. */
  check(): HealthCheck {
    return {
      status: 'ok',
      service: 'api',
      version: this.version,
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }
}
