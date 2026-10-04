import { Module } from '@nestjs/common';
import { CustomersModule } from '../customers/customers.module.js';
import { MediaModule } from '../media/media.module.js';
import {
  AdminCustomersController,
  AdminDashboardController,
  AdminEmailsController,
  AdminSettingsController,
} from './admin.controllers.js';

@Module({
  imports: [MediaModule, CustomersModule],
  controllers: [
    AdminDashboardController,
    AdminCustomersController,
    AdminSettingsController,
    AdminEmailsController,
  ],
})
export class AdminModule {}
