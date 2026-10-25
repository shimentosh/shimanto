import { Controller, Get, HttpCode, Post, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  type EmailSettingsView,
  EmailSettingsUpdateSchema,
  EmailSettingsViewSchema,
  IntegrationCheckSchema,
} from '@shimanto/types';
import type { z } from 'zod';
import type { AuthUser } from '../auth/auth.types.js';
import { AdminAuth, Auth, CurrentUser } from '../auth/guards.js';
import { ApiZodResponse, ZodBody } from '../common/zod.js';
import { EmailConfigService } from '../mail/email-config.service.js';

/**
 * Admin → Settings → Emails: the Resend API key (write-only, sealed in the database) and the
 * sender address. Both win over RESEND_API_KEY / MAIL_FROM; clearing them goes back to those.
 */
@ApiTags('admin · settings')
@AdminAuth()
@Controller('admin/settings/email')
export class AdminEmailSettingsController {
  constructor(private readonly config: EmailConfigService) {}

  @Get()
  @ApiZodResponse(EmailSettingsViewSchema)
  view(): Promise<EmailSettingsView> {
    return this.config.view();
  }

  /** A new key is checked with Resend first; a rejected key isn't saved. */
  @Put()
  @Auth('SUPER_ADMIN')
  @ApiZodResponse(EmailSettingsViewSchema)
  save(
    @ZodBody(EmailSettingsUpdateSchema) body: z.output<typeof EmailSettingsUpdateSchema>,
    @CurrentUser() user: AuthUser,
  ): Promise<EmailSettingsView> {
    return this.config.update(body, { type: 'user', id: user.id });
  }

  /** Does Resend accept the key in use, and is the sender's domain verified there? */
  @Post('check')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiZodResponse(IntegrationCheckSchema)
  check() {
    return this.config.check();
  }
}
