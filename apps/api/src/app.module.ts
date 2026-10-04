import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { type DynamicModule, Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { AdminModule } from './admin/admin.module.js';
import { AnalyticsModule } from './analytics/analytics.module.js';
import { AdminAuditController } from './audit/audit.controller.js';
import { AuthModule } from './auth/auth.module.js';
import { CommerceModule } from './commerce/commerce.module.js';
import { AllExceptionsFilter } from './common/all-exceptions.filter.js';
import { CommonModule } from './common/common.module.js';
import { ConfigModule } from './config/config.module.js';
import type { Env } from './config/env.js';
import { CustomersModule } from './customers/customers.module.js';
import { FilesModule } from './files/files.module.js';
import { HealthModule } from './health/health.module.js';
import { JobsModule } from './jobs/jobs.module.js';
import { LeadsModule } from './leads/leads.module.js';
import { MediaModule } from './media/media.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { SettingsModule } from './settings/settings.module.js';
import { SupportModule } from './support/support.module.js';
import { AdminUsersController, UsersService } from './users/users.js';

/**
 * The API's job: the digital-product store (products, checkout, orders, payments, R2 + GitHub
 * delivery), customer accounts and portal, support tickets, transactional email, leads, and
 * admin auth. Page content is not here; it lives in the web app's code.
 */
/** Pretty logs only in development, and only if the dev-only package is installed (it isn't in the Docker image). */
function prettyLogs(env: Env) {
  if (env.NODE_ENV !== 'development') return undefined;
  try {
    createRequire(import.meta.url).resolve('pino-pretty');
    return { target: 'pino-pretty', options: { singleLine: true } };
  } catch {
    return undefined;
  }
}

@Module({})
export class AppModule {
  static forRoot(env: Env): DynamicModule {
    return {
      module: AppModule,
      imports: [
        ConfigModule.forRoot(env),
        LoggerModule.forRoot({
          pinoHttp: {
            level:
              env.NODE_ENV === 'test' ? 'silent' : env.NODE_ENV === 'production' ? 'info' : 'debug',
            // Honour an upstream request id (load balancer / web app) or mint one; echoed in error bodies.
            genReqId: (req, res) => {
              const id = (req.headers['x-request-id'] as string | undefined) ?? randomUUID();
              res.setHeader('x-request-id', id);
              return id;
            },
            redact: [
              'req.headers.authorization',
              'req.headers.cookie',
              'res.headers["set-cookie"]',
            ],
            autoLogging: { ignore: (req) => req.url?.startsWith('/health') ?? false },
            transport: prettyLogs(env),
          },
        }),
        ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 120 }]),
        PrismaModule,
        JobsModule.forRoot(env),
        CommonModule,
        SettingsModule,
        AnalyticsModule,
        AuthModule,
        HealthModule,
        MediaModule,
        LeadsModule,
        CustomersModule,
        CommerceModule,
        FilesModule,
        SupportModule,
        AdminModule,
      ],
      controllers: [AdminUsersController, AdminAuditController],
      providers: [
        UsersService,
        { provide: APP_GUARD, useClass: ThrottlerGuard },
        { provide: APP_FILTER, useClass: AllExceptionsFilter },
      ],
    };
  }
}
