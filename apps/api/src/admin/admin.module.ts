import { Module } from '@nestjs/common';
import { CustomersModule } from '../customers/customers.module.js';
import { MediaModule } from '../media/media.module.js';
import {
  AdminCustomersController,
  AdminDashboardController,
  AdminEmailsController,
  AdminSettingsController,
} from './admin.controllers.js';
import { AdminEmailSettingsController } from './email-settings.controller.js';
import { AdminEmailTemplatesController } from './email-templates.controller.js';

@Module({
  imports: [MediaModule, CustomersModule],
  controllers: [
    AdminDashboardController,
    AdminCustomersController,
    AdminSettingsController,
    AdminEmailsController,
    AdminEmailTemplatesController,
    AdminEmailSettingsController,
  ],
})
export class AdminModule {}
