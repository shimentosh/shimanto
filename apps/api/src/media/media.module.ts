import { Module } from '@nestjs/common';
import { AdminMediaController } from './media.controller.js';
import { MediaService } from './media.service.js';
import { StorageService } from './storage.service.js';

@Module({
  controllers: [AdminMediaController],
  providers: [MediaService, StorageService],
  exports: [StorageService],
})
export class MediaModule {}
