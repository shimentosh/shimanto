import {
  Controller,
  Get,
  Inject,
  ServiceUnavailableException,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { ApiOkResponse, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import type { HealthCheck } from '@shimanto/types';
import { ENV } from '../config/config.module.js';
import type { Env } from '../config/env.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { HealthService } from './health.service.js';

/** Unversioned (`/health`) so load balancers and uptime checks never need to change. */
@ApiTags('health')
@SkipThrottle()
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  constructor(
    private readonly health: HealthService,
    private readonly prisma: PrismaService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  /** Liveness: the process is up. Never touches dependencies. */
  @Get()
  @ApiOkResponse({ description: 'API is alive.' })
  get(): HealthCheck {
    return this.health.check();
  }

  /** Readiness: can serve traffic (database reachable). 503 otherwise. */
  @Get('ready')
  @ApiOkResponse({ description: 'Dependencies reachable.' })
  @ApiServiceUnavailableResponse({ description: 'A dependency is down.' })
  async ready() {
    const started = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException({
        message: 'Database unreachable',
        checks: { database: 'down' },
      });
    }
    return {
      ...this.health.check(),
      checks: { database: 'up', jobs: this.env.JOBS_DRIVER },
      latencyMs: Date.now() - started,
    };
  }
}
