import { Controller, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  type ChangePasswordInput,
  ChangePasswordInputSchema,
  CustomerDashboardSchema,
  CustomerMeSchema,
  DeliveryViewSchema,
  DownloadItemSchema,
  OrderDetailSchema,
  OrderSummarySchema,
  OwnedProductSchema,
  type ProfileInput,
  ProfileInputSchema,
  SignedUrlSchema,
} from '@shimanto/types';
import type { Response } from 'express';
import { z } from 'zod';
import { CustomerSessionService } from '../auth/customer-session.service.js';
import { CurrentCustomerId, CustomerAuth } from '../auth/guards.js';
import { ApiZodResponse, ZodBody } from '../common/zod.js';
import { AccountService } from './account.service.js';
import { CustomerAuthService } from './customer-auth.service.js';

/** The signed-in customer's own account, orders, products and downloads. */
@ApiTags('customer · portal')
@CustomerAuth()
@Controller('account')
export class AccountController {
  constructor(
    private readonly account: AccountService,
    private readonly auth: CustomerAuthService,
    private readonly sessions: CustomerSessionService,
  ) {}

  @Get('me')
  @ApiZodResponse(CustomerMeSchema)
  me(@CurrentCustomerId() customerId: string) {
    return this.auth.me(customerId);
  }

  @Patch('profile')
  @ApiZodResponse(CustomerMeSchema)
  profile(
    @CurrentCustomerId() customerId: string,
    @ZodBody(ProfileInputSchema) body: ProfileInput,
  ) {
    return this.auth.updateProfile(customerId, body);
  }

  /** Changes (or first sets) the password. Other devices are signed out; this one stays in. */
  @Post('password')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiZodResponse(CustomerMeSchema)
  async password(
    @CurrentCustomerId() customerId: string,
    @ZodBody(ChangePasswordInputSchema) body: ChangePasswordInput,
    @Res({ passthrough: true }) res: Response,
  ) {
    const customer = await this.auth.changePassword(customerId, body);
    await this.sessions.start(res, customer);
    return this.auth.toMe(customer);
  }

  @Get('dashboard')
  @ApiZodResponse(CustomerDashboardSchema)
  dashboard(@CurrentCustomerId() customerId: string) {
    return this.account.dashboard(customerId);
  }

  @Get('orders')
  @ApiZodResponse(z.array(OrderSummarySchema))
  orders(@CurrentCustomerId() customerId: string) {
    return this.account.orders(customerId);
  }

  @Get('orders/:number')
  @ApiZodResponse(OrderDetailSchema)
  order(@CurrentCustomerId() customerId: string, @Param('number', ParseIntPipe) number: number) {
    return this.account.order(customerId, number);
  }

  @Get('products')
  @ApiZodResponse(z.array(OwnedProductSchema))
  products(@CurrentCustomerId() customerId: string) {
    return this.account.products(customerId);
  }

  @Get('downloads')
  @ApiZodResponse(z.array(DownloadItemSchema))
  downloads(@CurrentCustomerId() customerId: string) {
    return this.account.downloads(customerId);
  }

  /** A fresh 5-minute download link, checked against the customer's entitlement every time. */
  @Post('downloads/:deliveryId/:fileId')
  @HttpCode(200)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ApiZodResponse(SignedUrlSchema)
  download(
    @CurrentCustomerId() customerId: string,
    @Param('deliveryId') deliveryId: string,
    @Param('fileId') fileId: string,
  ) {
    return this.account.downloadUrl(customerId, deliveryId, fileId);
  }

  /** Re-send a GitHub invitation that failed or expired. */
  @Post('deliveries/:id/retry')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiZodResponse(DeliveryViewSchema)
  retry(@CurrentCustomerId() customerId: string, @Param('id') id: string) {
    return this.account.retryDelivery(customerId, id);
  }

  /** Check GitHub for the invitation state now (e.g. right after accepting it). */
  @Post('deliveries/:id/refresh')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiZodResponse(DeliveryViewSchema)
  refresh(@CurrentCustomerId() customerId: string, @Param('id') id: string) {
    return this.account.refreshDelivery(customerId, id);
  }
}
