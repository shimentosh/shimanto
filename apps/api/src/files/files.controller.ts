/// <reference types="multer" />
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import {
  AdminFileSchema,
  AttachFileInputSchema,
  SignedUrlSchema,
  pageSchema,
} from '@shimanto/types';
import { z } from 'zod';
import type { AuthUser } from '../auth/auth.types.js';
import { AdminAuth, CurrentUser } from '../auth/guards.js';
import { ApiZodResponse, ZodBody, ZodPipe, ZodQuery } from '../common/zod.js';
import { FilesService } from './files.service.js';

const FilesQuery = z.object({
  q: z.string().max(120).optional(),
  attached: z.enum(['yes', 'no']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.string().optional(),
});
const blank = (v?: string) => (v?.trim() ? v.trim() : undefined);
const UploadFields = z.object({
  productId: z.string().max(40).optional().transform(blank),
  label: z.string().max(120).optional().transform(blank),
  version: z.string().max(40).optional().transform(blank),
});
const ReplaceFields = z.object({ version: z.string().max(40).optional().transform(blank) });
const RenameInput = z.object({ filename: z.string().trim().min(1).max(120) });
const AttachmentUpdate = z.object({
  label: z.string().trim().min(1).max(120).optional(),
  version: z.string().trim().max(40).nullish(),
});

const uploadDocs = (extra: Record<string, object> = {}) =>
  ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' }, ...extra },
    },
  });

const actor = (user: AuthUser) => ({ type: 'user' as const, id: user.id });

function requireFile(file?: Express.Multer.File): Express.Multer.File {
  if (!file) throw new BadRequestException('Attach a file in the "file" field');
  return file;
}

/** Private product files in R2 (admin → API → R2; the bucket is never exposed to browsers). */
@ApiTags('admin · files')
@AdminAuth()
@Controller('admin/files')
export class AdminFilesController {
  constructor(private readonly files: FilesService) {}

  @Get()
  @ApiZodResponse(pageSchema(AdminFileSchema))
  list(@ZodQuery(FilesQuery) query: z.output<typeof FilesQuery>) {
    return this.files.list(query);
  }

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @uploadDocs({
    productId: { type: 'string', description: 'Attach to this product right away' },
    label: { type: 'string' },
    version: { type: 'string' },
  })
  @ApiZodResponse(AdminFileSchema, 201)
  upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body(new ZodPipe(UploadFields)) fields: z.output<typeof UploadFields>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.files.upload(requireFile(file), fields, actor(user));
  }

  @Get(':id')
  @ApiZodResponse(AdminFileSchema)
  get(@Param('id') id: string) {
    return this.files.get(id);
  }

  @Post(':id/download')
  @HttpCode(200)
  @ApiZodResponse(SignedUrlSchema)
  download(@Param('id') id: string) {
    return this.files.downloadUrl(id);
  }

  @Patch(':id')
  @ApiZodResponse(AdminFileSchema)
  rename(
    @Param('id') id: string,
    @ZodBody(RenameInput) body: z.output<typeof RenameInput>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.files.rename(id, body.filename, actor(user));
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    await this.files.remove(id, actor(user));
  }

  @Post(':id/attach')
  @HttpCode(200)
  @ApiZodResponse(AdminFileSchema)
  attach(
    @Param('id') id: string,
    @ZodBody(AttachFileInputSchema) body: z.output<typeof AttachFileInputSchema>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.files.attach(id, body, actor(user));
  }

  @Patch('attachments/:productFileId')
  @ApiZodResponse(AdminFileSchema)
  updateAttachment(
    @Param('productFileId') productFileId: string,
    @ZodBody(AttachmentUpdate) body: z.output<typeof AttachmentUpdate>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.files.updateAttachment(productFileId, body, actor(user));
  }

  @Delete('attachments/:productFileId')
  @HttpCode(204)
  async detach(@Param('productFileId') productFileId: string, @CurrentUser() user: AuthUser) {
    await this.files.detach(productFileId, actor(user));
  }

  /** Upload a new version of an attached file. */
  @Post('attachments/:productFileId/replace')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @uploadDocs({ version: { type: 'string' } })
  @ApiZodResponse(AdminFileSchema, 201)
  replace(
    @Param('productFileId') productFileId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body(new ZodPipe(ReplaceFields)) fields: z.output<typeof ReplaceFields>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.files.replace(productFileId, requireFile(file), fields, actor(user));
  }
}
