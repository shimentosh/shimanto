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
import { z } from 'zod';
import type { AuthUser } from '../auth/auth.types.js';
import { AdminAuth, CurrentUser } from '../auth/guards.js';
import { ZodBody, ZodPipe, ZodQuery } from '../common/zod.js';
import { MAX_UPLOAD_BYTES, MediaService } from './media.service.js';

const UploadFields = z.object({
  alt: z.string().max(300).optional(),
  visibility: z.enum(['public', 'private']).default('public'),
});
const MediaQuery = z.object({
  q: z.string().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(40),
  cursor: z.string().optional(),
});
const MediaUpdate = z.object({ alt: z.string().min(1).max(300).optional() });

@ApiTags('admin · storage')
@AdminAuth()
@Controller('admin/media')
export class AdminMediaController {
  constructor(private readonly media: MediaService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
        alt: { type: 'string', description: 'Required for public images' },
        visibility: { type: 'string', enum: ['public', 'private'], default: 'public' },
      },
    },
  })
  upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body(new ZodPipe(UploadFields)) fields: z.output<typeof UploadFields>,
    @CurrentUser() user: AuthUser,
  ) {
    if (!file) throw new BadRequestException('Attach a file in the "file" field');
    return this.media.upload(file, fields, { type: 'user', id: user.id });
  }

  @Get()
  list(@ZodQuery(MediaQuery) query: z.output<typeof MediaQuery>) {
    return this.media.list(query);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @ZodBody(MediaUpdate) body: z.output<typeof MediaUpdate>,
    @CurrentUser() user: AuthUser,
  ) {
    return this.media.update(id, body, { type: 'user', id: user.id });
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    await this.media.remove(id, { type: 'user', id: user.id });
  }
}
