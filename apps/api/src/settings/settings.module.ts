import { Global, Module } from '@nestjs/common';
import { EmailService } from '../mail/email.service.js';
import { SettingsService } from './settings.service.js';

/** Store settings and transactional email: used by almost every feature module. */
@Global()
@Module({
  providers: [SettingsService, EmailService],
  exports: [SettingsService, EmailService],
})
export class SettingsModule {}
