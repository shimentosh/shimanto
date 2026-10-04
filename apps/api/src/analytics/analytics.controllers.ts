import { Controller, Get, HttpCode, Inject, Param, Post, Put, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import {
  AdminTrackingSchema,
  AnalyticsEventRowSchema,
  AttributionModelSchema,
  CollectInputSchema,
  IntegrationCheckSchema,
  ProductReportRowSchema,
  PublicTrackingConfigSchema,
  SalesReportSchema,
  SourceReportRowSchema,
  TrackingSettingsSchema,
  pageSchema,
} from '@shimanto/types';
import type { Request } from 'express';
import { z } from 'zod';
import type { AuthUser } from '../auth/auth.types.js';
import { CustomerSessionService } from '../auth/customer-session.service.js';
import { AdminAuth, Auth, CurrentUser } from '../auth/guards.js';
import { unprocessable } from '../common/validate.js';
import { ApiZodResponse, ZodBody, ZodQuery } from '../common/zod.js';
import { ENV } from '../config/config.module.js';
import type { Env } from '../config/env.js';
import { AnalyticsService } from './analytics.service.js';
import { ReportsService } from './reports.service.js';
import { TrackingSettingsService } from './tracking-settings.service.js';

/** Public: tag configuration for the site, and the first-party event collector. */
@ApiTags('analytics')
@Controller()
export class PublicAnalyticsController {
  constructor(
    private readonly analytics: AnalyticsService,
    private readonly settings: TrackingSettingsService,
    private readonly sessions: CustomerSessionService,
  ) {}

  /** Which tags the site should load (public IDs only). */
  @Get('tracking/config')
  @SkipThrottle()
  @ApiZodResponse(PublicTrackingConfigSchema)
  config() {
    return this.settings.publicConfig();
  }

  /** Browser page/product/cart/checkout events for internal reports. Always 202. */
  @Post('analytics/collect')
  @HttpCode(202)
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  async collect(
    @ZodBody(CollectInputSchema) body: z.output<typeof CollectInputSchema>,
    @Req() req: Request,
  ) {
    await this.analytics.collect(body, await this.sessions.optional(req));
    return { ok: true as const };
  }
}

const RangeQuery = z.object({
  from: z.iso.datetime().optional(),
  to: z.iso.datetime().optional(),
  model: AttributionModelSchema.default('last'),
});

/** Today back N-1 days by default; custom `from`/`to` (max 400 days). */
export function parseRange(q: { from?: string; to?: string }, defaultDays = 30) {
  const to = q.to ? new Date(q.to) : new Date();
  const from = q.from ? new Date(q.from) : new Date(to.getTime() - (defaultDays - 1) * 86_400_000);
  if (!q.from) from.setUTCHours(0, 0, 0, 0);
  if (from > to) unprocessable('The start date must be before the end date', 'from');
  if (to.getTime() - from.getTime() > 400 * 86_400_000)
    unprocessable('Choose a range of at most 400 days', 'from');
  return { from, to };
}

const EventsQuery = z.object({
  name: z.string().max(40).optional(),
  status: z.enum(['PENDING', 'SENT', 'FAILED', 'SKIPPED']).optional(),
  origin: z.enum(['server', 'browser']).optional(),
  orderId: z.string().max(40).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  cursor: z.string().optional(),
});

@ApiTags('admin · analytics')
@AdminAuth()
@Controller('admin/analytics')
export class AdminAnalyticsController {
  constructor(
    private readonly reports: ReportsService,
    private readonly analytics: AnalyticsService,
  ) {}

  @Get('sales')
  @ApiZodResponse(SalesReportSchema)
  sales(@ZodQuery(RangeQuery) q: z.output<typeof RangeQuery>) {
    return this.reports.sales(parseRange(q));
  }

  @Get('products')
  @ApiZodResponse(z.array(ProductReportRowSchema))
  products(@ZodQuery(RangeQuery) q: z.output<typeof RangeQuery>) {
    return this.reports.products(parseRange(q));
  }

  @Get('sources')
  @ApiZodResponse(z.array(SourceReportRowSchema))
  sources(@ZodQuery(RangeQuery) q: z.output<typeof RangeQuery>) {
    return this.reports.sources(parseRange(q), q.model);
  }

  @Get('events')
  @ApiZodResponse(pageSchema(AnalyticsEventRowSchema))
  events(@ZodQuery(EventsQuery) q: z.output<typeof EventsQuery>) {
    return this.reports.events(q);
  }

  @Post('deliveries/:id/retry')
  @HttpCode(200)
  async retry(@Param('id') id: string) {
    await this.analytics.retryDelivery(id);
    return { ok: true as const };
  }
}

/** Admin → Settings → Analytics & Tracking. Secrets are env-only and never returned. */
@ApiTags('admin · analytics')
@AdminAuth()
@Controller('admin/tracking')
export class AdminTrackingController {
  constructor(
    private readonly settings: TrackingSettingsService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  @Get()
  @ApiZodResponse(AdminTrackingSchema)
  async get() {
    return { settings: await this.settings.get(), health: await this.settings.health() };
  }

  @Put()
  @Auth('SUPER_ADMIN')
  @ApiZodResponse(AdminTrackingSchema)
  async update(
    @ZodBody(TrackingSettingsSchema) body: z.output<typeof TrackingSettingsSchema>,
    @CurrentUser() user: AuthUser,
  ) {
    return {
      settings: await this.settings.update(body, { type: 'user', id: user.id }),
      health: await this.settings.health(),
    };
  }

  /** Checks GA4 (Measurement Protocol validation server) or Meta (token + Pixel access). */
  @Post('test/:provider')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiZodResponse(IntegrationCheckSchema)
  async test(@Param('provider') provider: string) {
    const s = await this.settings.get();
    try {
      if (provider === 'ga4') {
        if (!s.ga4MeasurementId) return { ok: false, message: 'Set a GA4 Measurement ID first' };
        if (!this.env.GA4_API_SECRET) {
          return {
            ok: false,
            message: 'Browser tracking only: set GA4_API_SECRET for server-side purchases',
          };
        }
        const url = new URL('https://www.google-analytics.com/debug/mp/collect');
        url.searchParams.set('measurement_id', s.ga4MeasurementId);
        url.searchParams.set('api_secret', this.env.GA4_API_SECRET);
        const res = await fetch(url, {
          method: 'POST',
          body: JSON.stringify({
            client_id: 'connection.test',
            events: [{ name: 'connection_test', params: {} }],
          }),
          signal: AbortSignal.timeout(10_000),
        });
        const body = (await res.json().catch(() => ({}))) as {
          validationMessages?: Array<{ description?: string }>;
        };
        const problems = body.validationMessages ?? [];
        return problems.length
          ? { ok: false, message: problems.map((p) => p.description).join('; ') }
          : {
              ok: res.ok,
              message: res.ok
                ? 'GA4 accepted a test event (validation server)'
                : `GA4 responded ${res.status}`,
            };
      }
      if (provider === 'meta') {
        if (!s.metaPixelId) return { ok: false, message: 'Set a Meta Pixel ID first' };
        if (!this.env.META_ACCESS_TOKEN)
          return { ok: false, message: 'Set META_ACCESS_TOKEN for the Conversions API' };
        const res = await fetch(
          `https://graph.facebook.com/${this.env.META_API_VERSION}/${s.metaPixelId}?fields=id,name`,
          {
            headers: { authorization: `Bearer ${this.env.META_ACCESS_TOKEN}` },
            signal: AbortSignal.timeout(10_000),
          },
        );
        const body = (await res.json().catch(() => ({}))) as {
          name?: string;
          error?: { message?: string };
        };
        return res.ok
          ? { ok: true, message: `Connected to Pixel "${body.name ?? s.metaPixelId}"` }
          : {
              ok: false,
              message: `Meta rejected the request: ${body.error?.message ?? res.status}`,
            };
      }
      return { ok: false, message: 'Unknown provider' };
    } catch (error) {
      return { ok: false, message: `Could not reach the provider: ${(error as Error).message}` };
    }
  }
}
