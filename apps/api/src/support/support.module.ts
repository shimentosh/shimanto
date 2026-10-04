import { Module } from '@nestjs/common';
import { MediaModule } from '../media/media.module.js';
import { AdminSupportController, CustomerSupportController } from './support.controllers.js';
import { SupportService } from './support.service.js';

@Module({
  imports: [MediaModule],
  controllers: [CustomerSupportController, AdminSupportController],
  providers: [SupportService],
})
export class SupportModule {}
