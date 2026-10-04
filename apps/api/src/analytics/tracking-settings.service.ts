import { Inject, Injectable } from '@nestjs/common';
import {
  type PublicTrackingConfig,
  type TrackingHealth,
  type TrackingSettings,
  TrackingSettingsSchema,
} from '@shimanto/types';
import { type Actor, AuditService } from '../audit/audit.service.js';
import { ENV } from '../config/config.module.js';
import type { Env } from '../config/env.js';
import type { Prisma } from '../generated/prisma/client.js';
import { JobsService } from '../jobs/jobs.types.js';
import { PrismaService } from '../prisma/prisma.service.js';

const KEY = 'tracking';
const CACHE_MS = 30_000;

/**
 * Analytics & tracking settings: public IDs and switches, stored in the Setting table and editable
 * in admin. Env vars provide the defaults. Secrets (GA4 API secret, Meta token) are env-only and
 * never returned.
 */
@Injectable()
export class TrackingSettingsService {
  private cached?: { value: TrackingSettings; at: number };

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly jobs: JobsService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  defaults(): TrackingSettings {
    const env = this.env;
    return {
      ga4Enabled: Boolean(env.GA4_MEASUREMENT_ID),
      ga4MeasurementId: env.GA4_MEASUREMENT_ID ?? null,
      gtmEnabled: Boolean(env.GTM_CONTAINER_ID),
      gtmContainerId: env.GTM_CONTAINER_ID ?? null,
      metaPixelEnabled: Boolean(env.META_PIXEL_ID),
      metaPixelId: env.META_PIXEL_ID ?? null,
      metaCapiEnabled: Boolean(env.META_PIXEL_ID && env.META_ACCESS_TOKEN),
      googleAdsEnabled: Boolean(env.GOOGLE_ADS_CONVERSION_ID),
      googleAdsConversionId: env.GOOGLE_ADS_CONVERSION_ID ?? null,
      googleAdsConversionLabel: env.GOOGLE_ADS_CONVERSION_LABEL ?? null,
      utmTracking: true,
      firstTouch: true,
      lastTouch: true,
      requireConsent: true,
    };
  }

  async get(): Promise<TrackingSettings> {
    if (this.cached && Date.now() - this.cached.at < CACHE_MS) return this.cached.value;
    const row = await this.prisma.setting.findUnique({ where: { key: KEY } });
    const parsed = TrackingSettingsSchema.safeParse({
      ...this.defaults(),
      ...(row?.value as object),
    });
    const value = parsed.success ? parsed.data : this.defaults();
    this.cached = { value, at: Date.now() };
    return value;
  }

  async update(input: TrackingSettings, actor: Actor): Promise<TrackingSettings> {
    await this.prisma.setting.upsert({
      where: { key: KEY },
      create: {
        key: KEY,
        value: input as Prisma.InputJsonValue,
        updatedById: actor.type === 'user' ? actor.id : null,
      },
      update: {
        value: input as Prisma.InputJsonValue,
        updatedById: actor.type === 'user' ? actor.id : null,
      },
    });
    this.cached = undefined;
    // The public site caches its tag config (tag `tracking`): refresh it now.
    await this.jobs.enqueue('web.revalidate', { tags: ['tracking'] });
    await this.audit.record(actor, 'settings.tracking', 'Setting', KEY, {
      ga4: input.ga4Enabled,
      gtm: input.gtmEnabled,
      metaPixel: input.metaPixelEnabled,
      metaCapi: input.metaCapiEnabled,
      googleAds: input.googleAdsEnabled,
      requireConsent: input.requireConsent,
    });
    return this.get();
  }

  /** For the public site: which tags to load. Disabled providers are simply null. */
  async publicConfig(): Promise<PublicTrackingConfig> {
    const s = await this.get();
    return {
      ga4MeasurementId: s.ga4Enabled ? s.ga4MeasurementId : null,
      gtmContainerId: s.gtmEnabled ? s.gtmContainerId : null,
      metaPixelId: s.metaPixelEnabled ? s.metaPixelId : null,
      googleAds:
        s.googleAdsEnabled && s.googleAdsConversionId
          ? { conversionId: s.googleAdsConversionId, conversionLabel: s.googleAdsConversionLabel }
          : null,
      utmTracking: s.utmTracking,
      firstTouch: s.firstTouch,
      lastTouch: s.lastTouch,
      requireConsent: s.requireConsent,
    };
  }

  async health(): Promise<TrackingHealth> {
    const s = await this.get();
    return {
      ga4: {
        configured: s.ga4Enabled && Boolean(s.ga4MeasurementId),
        serverSide: s.ga4Enabled && Boolean(s.ga4MeasurementId && this.env.GA4_API_SECRET),
      },
      gtm: { configured: s.gtmEnabled && Boolean(s.gtmContainerId) },
      metaPixel: { configured: s.metaPixelEnabled && Boolean(s.metaPixelId) },
      metaCapi: {
        configured: s.metaCapiEnabled && Boolean(s.metaPixelId && this.env.META_ACCESS_TOKEN),
        tokenSet: Boolean(this.env.META_ACCESS_TOKEN),
        apiVersion: this.env.META_API_VERSION,
      },
      googleAds: { configured: s.googleAdsEnabled && Boolean(s.googleAdsConversionId) },
    };
  }
}
