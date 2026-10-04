import { Global, Module } from '@nestjs/common';
import {
  AdminAnalyticsController,
  AdminTrackingController,
  PublicAnalyticsController,
} from './analytics.controllers.js';
import { AnalyticsService } from './analytics.service.js';
import { ANALYTICS_PROVIDERS, defaultProviders } from './providers.js';
import { ReportsService } from './reports.service.js';
import { TrackingSettingsService } from './tracking-settings.service.js';

/** Central analytics: internal events, provider deliveries (GA4, Meta CAPI), reports, settings. */
@Global()
@Module({
  controllers: [PublicAnalyticsController, AdminAnalyticsController, AdminTrackingController],
  providers: [
    AnalyticsService,
    ReportsService,
    TrackingSettingsService,
    { provide: ANALYTICS_PROVIDERS, useValue: defaultProviders },
  ],
  exports: [AnalyticsService, TrackingSettingsService, ANALYTICS_PROVIDERS],
})
export class AnalyticsModule {}
