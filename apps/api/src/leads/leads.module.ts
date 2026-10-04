import { Module } from '@nestjs/common';
import { AdminLeadsController, PublicLeadsController } from './leads.controllers.js';
import { LeadsService } from './leads.service.js';

@Module({
  controllers: [PublicLeadsController, AdminLeadsController],
  providers: [LeadsService],
})
export class LeadsModule {}
