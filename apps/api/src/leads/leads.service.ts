import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { LeadCreateInput } from '@shimanto/types';
import { type Actor, AuditService } from '../audit/audit.service.js';
import { cursorArgs, paginate } from '../common/cursor.js';
import { TurnstileService } from '../common/turnstile.service.js';
import { ENV } from '../config/config.module.js';
import type { Env } from '../config/env.js';
import type { LeadIntent, LeadStatus, Prisma } from '../generated/prisma/client.js';
import { JobsService } from '../jobs/jobs.types.js';
import { leadAutoReply, leadNotification } from '../mail/templates.js';
import { PrismaService } from '../prisma/prisma.service.js';

export const LEAD_STATUSES: LeadStatus[] = ['NEW', 'CONTACTED', 'QUALIFIED', 'WON', 'LOST'];

/** CSV cell: quoted, and neutralised against formula injection when opened in a spreadsheet. */
export function csvCell(value: unknown): string {
  let text = value == null ? '' : value instanceof Date ? value.toISOString() : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

@Injectable()
export class LeadsService {
  private readonly logger = new Logger('Leads');

  constructor(
    private readonly prisma: PrismaService,
    private readonly jobs: JobsService,
    private readonly turnstile: TurnstileService,
    private readonly audit: AuditService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  /** Public submission: honeypot → Turnstile → store → notify Shimanto + auto-reply. */
  async create(input: LeadCreateInput, ip?: string): Promise<{ ok: true }> {
    // Bots that fill the hidden field get a normal-looking success and nothing is stored.
    if (input.website) return { ok: true };

    if (!(await this.turnstile.verify(input.turnstileToken, ip))) {
      throw new BadRequestException('Human verification failed. Please try again.');
    }

    const lead = await this.prisma.lead.create({
      data: {
        intent: input.intent,
        name: input.name,
        email: input.email.toLowerCase(),
        company: input.company,
        budgetRange: input.budgetRange,
        timeline: input.timeline,
        message: input.message,
        locale: input.locale,
        source: input.source,
        utm: input.utm,
      },
    });

    if (this.env.NOTIFY_EMAIL) {
      await this.jobs.enqueue('mail.send', {
        to: this.env.NOTIFY_EMAIL,
        ...leadNotification(lead, `${this.env.ADMIN_URL}/leads/${lead.id}`),
      });
    } else {
      this.logger.warn('NOTIFY_EMAIL not set: new lead stored without a notification');
    }
    await this.jobs.enqueue('mail.send', {
      to: lead.email,
      ...leadAutoReply(lead.name, lead.locale, this.env.SITE_URL),
    });
    return { ok: true };
  }

  // ───────────── Admin ─────────────

  async list(query: {
    status?: LeadStatus;
    intent?: LeadIntent;
    q?: string;
    limit: number;
    cursor?: string;
  }) {
    const rows = await this.prisma.lead.findMany({
      where: this.where(query),
      include: { assignedTo: { select: { id: true, name: true, email: true } } },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      ...cursorArgs(query.limit, query.cursor),
    });
    return paginate(rows, query.limit);
  }

  /** Kanban data: every status column, ordered by manual position then newest. */
  async board() {
    const columns = await Promise.all(
      LEAD_STATUSES.map((status) =>
        this.prisma.lead.findMany({
          where: { status },
          include: {
            assignedTo: { select: { id: true, name: true, email: true } },
            _count: { select: { notes: true } },
          },
          orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
          take: 200,
        }),
      ),
    );
    return LEAD_STATUSES.map((status, i) => ({ status, leads: columns[i]! }));
  }

  async get(id: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        notes: {
          orderBy: { createdAt: 'desc' },
          include: { author: { select: { id: true, name: true, email: true } } },
        },
      },
    });
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  async update(
    id: string,
    input: { status?: LeadStatus; position?: number; assignedToId?: string | null },
    actor: Actor,
  ) {
    const before = await this.get(id);
    const lead = await this.prisma.lead.update({ where: { id }, data: input });
    await this.audit.record(actor, 'lead.update', 'Lead', id, {
      ...(input.status && input.status !== before.status
        ? { from: before.status, to: input.status }
        : {}),
      ...(input.assignedToId !== undefined ? { assignedToId: input.assignedToId } : {}),
    });
    return lead;
  }

  async addNote(id: string, body: string, actor: Actor & { type: 'user' }) {
    await this.get(id);
    const note = await this.prisma.leadNote.create({
      data: { leadId: id, body, authorId: actor.id },
    });
    await this.audit.record(actor, 'lead.note', 'Lead', id);
    return note;
  }

  async exportCsv(query: {
    status?: LeadStatus;
    intent?: LeadIntent;
    q?: string;
  }): Promise<string> {
    const leads = await this.prisma.lead.findMany({
      where: this.where(query),
      orderBy: { createdAt: 'desc' },
    });
    const header = [
      'createdAt',
      'status',
      'intent',
      'name',
      'email',
      'company',
      'budgetRange',
      'timeline',
      'locale',
      'source',
      'message',
    ] as const;
    const lines = leads.map((lead) => header.map((key) => csvCell(lead[key])).join(','));
    return [header.join(','), ...lines].join('\r\n');
  }

  private where(query: {
    status?: LeadStatus;
    intent?: LeadIntent;
    q?: string;
  }): Prisma.LeadWhereInput {
    return {
      status: query.status,
      intent: query.intent,
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: 'insensitive' } },
              { email: { contains: query.q, mode: 'insensitive' } },
              { company: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
  }
}
