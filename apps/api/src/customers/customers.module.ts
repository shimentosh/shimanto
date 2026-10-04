import { Module } from '@nestjs/common';
import { CustomerAuthController } from './customer-auth.controller.js';
import { CustomerAuthService } from './customer-auth.service.js';
import { CustomerTokensService } from './customer-tokens.service.js';

@Module({
  controllers: [CustomerAuthController],
  providers: [CustomerAuthService, CustomerTokensService],
  exports: [CustomerAuthService],
})
export class CustomersModule {}
