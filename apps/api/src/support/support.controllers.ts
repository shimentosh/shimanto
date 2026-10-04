/// <reference types="multer" />
import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  SignedUrlSchema,
  TicketCreateInputSchema,
  TicketDetailSchema,
  TicketReplyInputSchema,
  TicketStatusInputSchema,
  TicketStatusSchema,
  TicketSummarySchema,
  pageSchema,
} from '@shimanto/types';
import { z } from 'zod';
import type { AuthUser } from '../auth/auth.types.js';
import { AdminAuth, CurrentCustomerId, CurrentUser, CustomerAuth } from '../auth/guards.js';
import { ApiZodResponse, ZodBody, ZodPipe, ZodQuery } from '../common/zod.js';
import { ATTACHMENT_MAX_BYTES, SupportService } from './support.service.js';

const upload = FileInterceptor('file', { limits: { fileSize: ATTACHMENT_MAX_BYTES, files: 1 } });
const docs = (fields: Record<string, object>, required: string[]) =>
  ApiBody({
    schema: {
      type: 'object',
      required,
      properties: { ...fields, file: { type: 'string', format: 'binary' } },
    },
  });

/** Customer side of support: their own tickets only. */
@ApiTags('customer · support')
@CustomerAuth()
@Controller('account/tickets')
export class CustomerSupportController {
  constructor(private readonly support: SupportService) {}

  @Get()
  @ApiZodResponse(z.array(TicketSummarySchema))
  list(@CurrentCustomerId() customerId: string) {
    return this.support.customerTickets(customerId);
  }

  @Post()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @UseInterceptors(upload)
  @ApiConsumes('multipart/form-data', 'application/json')
  @docs(
    {
      subject: { type: 'string' },
      message: { type: 'string' },
      productId: { type: 'string' },
      orderId: { type: 'string' },
    },
    ['subject', 'message'],
  )
  @ApiZodResponse(TicketDetailSchema, 201)
  create(
    @CurrentCustomerId() customerId: string,
    @Body(new ZodPipe(TicketCreateInputSchema)) body: z.output<typeof TicketCreateInputSchema>,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.support.create(customerId, body, file);
  }

  @Get(':number')
  @ApiZodResponse(TicketDetailSchema)
  get(@CurrentCustomerId() customerId: string, @Param('number', ParseIntPipe) number: number) {
    return this.support.customerTicket(customerId, number);
  }

  @Post(':number/messages')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @UseInterceptors(upload)
  @ApiConsumes('multipart/form-data', 'application/json')
  @docs({ message: { type: 'string' } }, ['message'])
  @ApiZodResponse(TicketDetailSchema, 201)
  reply(
    @CurrentCustomerId() customerId: string,
    @Param('number', ParseIntPipe) number: number,
    @Body(new ZodPipe(TicketReplyInputSchema.pick({ message: true })))
    body: { message: string },
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.support.customerReply(customerId, number, body.message, file);
  }

  @Post(':number/messages/:messageId/attachment')
  @HttpCode(200)
  @ApiZodResponse(SignedUrlSchema)
  attachment(
    @CurrentCustomerId() customerId: string,
    @Param('number', ParseIntPipe) number: number,
    @Param('messageId') messageId: string,
  ) {
    return this.support.customerAttachment(customerId, number, messageId);
  }
}

const TicketQuery = z.object({
  status: TicketStatusSchema.optional(),
  q: z.string().max(120).optional(),
  customerId: z.string().max(40).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});
const AdminReplyFields = z.object({
  message: z.string().trim().min(1).max(10_000),
  status: z
    .string()
    .optional()
    .transform((v) => (v ? v : undefined))
    .pipe(TicketStatusSchema.optional()),
});

@ApiTags('admin · support')
@AdminAuth()
@Controller('admin/tickets')
export class AdminSupportController {
  constructor(private readonly support: SupportService) {}

  @Get()
  @ApiZodResponse(pageSchema(TicketSummarySchema))
  list(@ZodQuery(TicketQuery) query: z.output<typeof TicketQuery>) {
    return this.support.list(query);
  }

  @Get(':id')
  @ApiZodResponse(TicketDetailSchema)
  get(@Param('id') id: string) {
    return this.support.detail(id);
  }

  @Post(':id/messages')
  @UseInterceptors(upload)
  @ApiConsumes('multipart/form-data', 'application/json')
  @docs({ message: { type: 'string' }, status: { type: 'string' } }, ['message'])
  @ApiZodResponse(TicketDetailSchema, 201)
  reply(
    @Param('id') id: string,
    @Body(new ZodPipe(AdminReplyFields)) body: z.output<typeof AdminReplyFields>,
    @CurrentUser() user: AuthUser,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.support.adminReply(id, body, { type: 'user', id: user.id }, file);
  }

  @Patch(':id')
  @ApiZodResponse(TicketDetailSchema)
  status(
    @Param('id') id: string,
    @ZodBody(TicketStatusInputSchema) body: z.output<typeof TicketStatusInputSchema>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.support.setStatus(id, body.status, { type: 'user', id: user.id });
  }

  @Post(':id/messages/:messageId/attachment')
  @HttpCode(200)
  @ApiZodResponse(SignedUrlSchema)
  attachment(@Param('id') id: string, @Param('messageId') messageId: string) {
    return this.support.adminAttachment(id, messageId);
  }
}
