import { Controller, Get, Header, Param, Patch, Post, Req } from '@nestjs/common';
import { ApiProduces, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  type LeadCreateInput,
  LeadCreateInputSchema,
  LeadCreatedSchema,
  LeadIntentSchema,
  LeadNoteInputSchema,
  LeadStatusSchema,
  LeadUpdateInputSchema,
} from '@shimanto/types';
import type { Request } from 'express';
import { z } from 'zod';
import type { AuthUser } from '../auth/auth.types.js';
import { AdminAuth, CurrentUser } from '../auth/guards.js';
import { ApiZodResponse, ZodBody, ZodQuery } from '../common/zod.js';
import { LeadsService } from './leads.service.js';

/**
 * Rate limit for the public form (LEADS_RATE_LIMIT_PER_MINUTE, default 5). It's resolved per request
 * because decorators are evaluated before the .env file is loaded.
 */
export const LEADS_THROTTLE = {
  limit: () => Number(process.env.LEADS_RATE_LIMIT_PER_MINUTE ?? 5),
  ttl: 60_000,
};

@ApiTags('leads')
@Controller('leads')
export class PublicLeadsController {
  constructor(private readonly leads: LeadsService) {}

  @Post()
  @Throttle({ default: LEADS_THROTTLE })
  @ApiZodResponse(LeadCreatedSchema, 201, 'Lead received')
  create(@ZodBody(LeadCreateInputSchema) body: LeadCreateInput, @Req() req: Request) {
    return this.leads.create(body, req.ip);
  }
}

const LeadFilter = z.object({
  status: LeadStatusSchema.optional(),
  intent: LeadIntentSchema.optional(),
  q: z.string().max(120).optional(),
});
const LeadListQuery = LeadFilter.extend({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  cursor: z.string().optional(),
});

@ApiTags('admin · leads')
@AdminAuth()
@Controller('admin/leads')
export class AdminLeadsController {
  constructor(private readonly leads: LeadsService) {}

  @Get()
  list(@ZodQuery(LeadListQuery) query: z.output<typeof LeadListQuery>) {
    return this.leads.list(query);
  }

  /** Kanban columns NEW → CONTACTED → QUALIFIED → WON / LOST. */
  @Get('board')
  board() {
    return this.leads.board();
  }

  @Get('export.csv')
  @Header('content-type', 'text/csv; charset=utf-8')
  @Header('content-disposition', 'attachment; filename="leads.csv"')
  @ApiProduces('text/csv')
  exportCsv(@ZodQuery(LeadFilter) query: z.output<typeof LeadFilter>) {
    return this.leads.exportCsv(query);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.leads.get(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @ZodBody(LeadUpdateInputSchema) body: z.output<typeof LeadUpdateInputSchema>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.leads.update(id, body, { type: 'user', id: user.id });
  }

  @Post(':id/notes')
  addNote(
    @Param('id') id: string,
    @ZodBody(LeadNoteInputSchema) body: z.output<typeof LeadNoteInputSchema>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.leads.addNote(id, body.body, { type: 'user', id: user.id });
  }
}
