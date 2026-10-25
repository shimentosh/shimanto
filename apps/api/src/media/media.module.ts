import { Module } from '@nestjs/common';
import { AdminMediaController } from './media.controller.js';
import { MediaService } from './media.service.js';
import { StorageSettingsService } from './storage-settings.service.js';
import { StorageService } from './storage.service.js';

@Module({
  controllers: [AdminMediaController],
  providers: [MediaService, StorageService, StorageSettingsService],
  exports: [StorageService, StorageSettingsService],
})
export class MediaModule {}
