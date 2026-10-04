import { tmpdir } from 'node:os';
import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { ENV } from '../config/config.module.js';
import type { Env } from '../config/env.js';
import { MediaModule } from '../media/media.module.js';
import { AdminFilesController } from './files.controller.js';
import { FilesService } from './files.service.js';

@Module({
  imports: [
    MediaModule,
    // Large deliverables go to a temp file first (not memory), then stream to R2.
    MulterModule.registerAsync({
      inject: [ENV],
      useFactory: (env: Env) => ({
        storage: diskStorage({ destination: tmpdir() }),
        limits: { fileSize: env.FILE_UPLOAD_MAX_MB * 1024 * 1024, files: 1 },
      }),
    }),
  ],
  controllers: [AdminFilesController],
  providers: [FilesService],
})
export class FilesModule {}
