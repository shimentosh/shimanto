import { Inject, Injectable, Logger } from '@nestjs/common';
import { ENV } from '../config/config.module.js';
import type { Env } from '../config/env.js';
import { Prisma } from '../generated/prisma/client.js';
import { JobsService } from '../jobs/jobs.types.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SettingsService } from '../settings/settings.service.js';
import { type TemplateData, type TemplateKey, renderTemplate } from './transactional.js';

export interface SendOptions<K extends TemplateKey> {
  to: string;
  data: TemplateData<K>;
  /**
   * Stable key for this logical email, e.g. `order:<id>:payment-successful`. A repeated event
   * (webhook retry, double click) with the same key sends nothing.
   */
  idempotencyKey: string;
  customerId?: string | null;
  orderId?: string | null;
  ticketId?: string | null;
}

/**
 * The one way to send transactional email: render the template, record an EmailEvent (QUEUED),
 * enqueue delivery. The unique idempotency key turns duplicates into no-ops.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger('Email');

  constructor(
    private readonly prisma: PrismaService,
    private readonly jobs: JobsService,
    private readonly settings: SettingsService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  /** Returns false when this email was already sent (or queued) for the same key. */
  async send<K extends TemplateKey>(key: K, options: SendOptions<K>): Promise<boolean> {
    const general = await this.settings.general();
    const rendered = renderTemplate(key, options.data, {
      storeName: general.storeName,
      siteUrl: this.env.SITE_URL,
      supportUrl: `${this.env.PORTAL_URL}/support`,
    });

    let eventId: string;
    try {
      const event = await this.prisma.emailEvent.create({
        data: {
          type: key,
          recipient: options.to,
          subject: rendered.subject,
          idempotencyKey: options.idempotencyKey,
          customerId: options.customerId ?? null,
          orderId: options.orderId ?? null,
          ticketId: options.ticketId ?? null,
        },
      });
      eventId = event.id;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        this.logger.debug(`Skipped duplicate ${key} (${options.idempotencyKey})`);
        return false;
      }
      throw error;
    }

    await this.jobs.enqueue('mail.send', {
      to: options.to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      replyTo: general.supportEmail ?? undefined,
      eventId,
    });
    return true;
  }
}
