import { Controller, Get, HttpCode, Inject, NotFoundException, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  type EmailTemplatePreview,
  EmailTemplatePreviewSchema,
  type EmailTemplateSummary,
  EmailTemplateSummarySchema,
  IntegrationCheckSchema,
  TestEmailInputSchema,
} from '@shimanto/types';
import { z } from 'zod';
import type { AuthUser } from '../auth/auth.types.js';
import { AdminAuth, CurrentUser } from '../auth/guards.js';
import { ApiZodResponse, ZodBody } from '../common/zod.js';
import { ENV } from '../config/config.module.js';
import type { Env } from '../config/env.js';
import { EmailService } from '../mail/email.service.js';
import { isTemplateKey, templateCatalog } from '../mail/template-catalog.js';
import { type TemplateKey, renderTemplate } from '../mail/transactional.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SettingsService } from '../settings/settings.service.js';

/**
 * Every transactional email the store sends, for the admin's Emails page: grouped, rendered with
 * sample data, and sendable to yourself. The copy itself lives in code (mail/transactional.ts).
 */
@ApiTags('admin · emails')
@AdminAuth()
@Controller('admin/email-templates')
export class AdminEmailTemplatesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly email: EmailService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  @Get()
  @ApiZodResponse(z.array(EmailTemplateSummarySchema))
  async list(): Promise<EmailTemplateSummary[]> {
    const [ctx, counts] = await Promise.all([
      this.context(),
      this.prisma.emailEvent.groupBy({
        by: ['type', 'status'],
        where: { status: { in: ['SENT', 'FAILED'] } },
        _count: { _all: true },
        _max: { sentAt: true },
      }),
    ]);
    const stat = (type: string, status: 'SENT' | 'FAILED') =>
      counts.find((c) => c.type === type && c.status === status);
    return (Object.keys(templateCatalog) as TemplateKey[]).map((key) => {
      const entry = templateCatalog[key];
      const sent = stat(key, 'SENT');
      return {
        key,
        group: entry.group,
        name: entry.name,
        trigger: entry.trigger,
        audience: entry.audience,
        subject: this.render(key, ctx).subject,
        sent: sent?._count._all ?? 0,
        failed: stat(key, 'FAILED')?._count._all ?? 0,
        lastSentAt: sent?._max.sentAt?.toISOString() ?? null,
      };
    });
  }

  @Get(':key')
  @ApiZodResponse(EmailTemplatePreviewSchema)
  async preview(@Param('key') key: string): Promise<EmailTemplatePreview> {
    const template = this.known(key);
    return { key: template, ...this.render(template, await this.context()) };
  }

  @Post(':key/test')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiZodResponse(IntegrationCheckSchema)
  async test(
    @Param('key') key: string,
    @ZodBody(TestEmailInputSchema) body: z.output<typeof TestEmailInputSchema>,
    @CurrentUser() user: AuthUser,
  ) {
    const template = this.known(key);
    await this.email.send(template, {
      to: body.to,
      idempotencyKey: `template-test:${template}:${user.id}:${Date.now()}`,
      data: templateCatalog[template].sample(this.urls()) as never,
    });
    const provider = this.settings.integrations().email.provider;
    return {
      ok: true,
      message:
        provider === 'log'
          ? 'Queued, but email is in log-only mode, so it won’t arrive. Check the email log.'
          : `Sent to ${body.to} via ${provider}, with sample data.`,
    };
  }

  private known(key: string): TemplateKey {
    if (!isTemplateKey(key)) throw new NotFoundException('No email template with that key');
    return key;
  }

  private urls() {
    return { portal: this.env.PORTAL_URL, admin: this.env.ADMIN_URL };
  }

  /** The same layout context EmailService renders real emails with. */
  private async context() {
    const general = await this.settings.general();
    return {
      storeName: general.storeName,
      siteUrl: this.env.SITE_URL,
      supportUrl: `${this.env.PORTAL_URL}/support`,
    };
  }

  private render(key: TemplateKey, ctx: Awaited<ReturnType<typeof this.context>>) {
    return renderTemplate(key, templateCatalog[key].sample(this.urls()) as never, ctx);
  }
}
