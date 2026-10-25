import { Inject, Injectable, Logger } from '@nestjs/common';
import nodemailer, { type Transporter } from 'nodemailer';
import { ENV } from '../config/config.module.js';
import type { Env } from '../config/env.js';
import type { JobMap } from '../jobs/jobs.types.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { EmailConfigService } from './email-config.service.js';

export interface SentMail {
  provider: 'resend' | 'smtp' | 'log';
  messageId: string | null;
}

const RESEND_URL = 'https://api.resend.com/emails';

/**
 * Delivers one email. Resend's HTTP API when a key is set (Admin → Settings → Emails, or
 * RESEND_API_KEY), otherwise SMTP in local dev (Mailpit at http://localhost:8025) or JSON logging
 * in tests. When the message belongs to an EmailEvent, its status is updated (SENT with the
 * provider message id, or FAILED with the reason).
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger('Mail');
  private transport?: Transporter;

  constructor(
    @Inject(ENV) private readonly env: Env,
    private readonly prisma: PrismaService,
    private readonly config: EmailConfigService,
  ) {}

  /** SMTP (or JSON logging), created the first time it's needed. */
  private smtp(): Transporter {
    this.transport ??=
      this.env.SMTP_URL === 'json'
        ? nodemailer.createTransport({ jsonTransport: true })
        : nodemailer.createTransport(this.env.SMTP_URL);
    return this.transport;
  }

  /** Job handler: send, then record the outcome on the email event. Rethrows so the queue retries. */
  async send(message: JobMap['mail.send']): Promise<void> {
    try {
      const sent = await this.deliver(message);
      if (message.eventId) {
        await this.prisma.emailEvent.update({
          where: { id: message.eventId },
          data: {
            status: 'SENT',
            provider: sent.provider,
            providerMessageId: sent.messageId,
            failureReason: null,
            sentAt: new Date(),
          },
        });
      }
      this.logger.log(`Sent "${message.subject}" via ${sent.provider}`);
    } catch (error) {
      const reason = (error as Error).message.slice(0, 500);
      if (message.eventId) {
        await this.prisma.emailEvent
          .update({
            where: { id: message.eventId },
            data: {
              status: 'FAILED',
              provider: this.config.current().provider,
              failureReason: reason,
            },
          })
          .catch(() => undefined);
      }
      throw error;
    }
  }

  private async deliver(message: JobMap['mail.send']): Promise<SentMail> {
    const replyTo = message.replyTo ?? this.env.MAIL_REPLY_TO;
    const config = await this.config.config();
    if (config.resendKey) {
      const res = await fetch(RESEND_URL, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${config.resendKey}`,
          'content-type': 'application/json',
          // Resend de-duplicates retries of the same event for 24h.
          ...(message.eventId ? { 'idempotency-key': message.eventId } : {}),
        },
        body: JSON.stringify({
          from: config.from,
          to: [message.to],
          subject: message.subject,
          html: message.html,
          text: message.text,
          ...(replyTo ? { reply_to: replyTo } : {}),
        }),
        signal: AbortSignal.timeout(15_000),
      });
      const body = (await res.json().catch(() => ({}))) as {
        id?: string;
        message?: string;
        name?: string;
      };
      if (!res.ok)
        throw new Error(`Resend ${res.status}: ${body.message ?? body.name ?? 'request failed'}`);
      return { provider: 'resend', messageId: body.id ?? null };
    }
    const info = (await this.smtp().sendMail({
      from: config.from,
      to: message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
      replyTo,
    })) as { messageId?: string };
    return { provider: config.provider, messageId: info.messageId ?? null };
  }
}
