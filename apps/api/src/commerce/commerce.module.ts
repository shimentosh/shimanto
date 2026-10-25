import { Global, Module } from '@nestjs/common';
import { AccountController } from '../customers/account.controller.js';
import { AccountService } from '../customers/account.service.js';
import { CustomersModule } from '../customers/customers.module.js';
import { GitHubClient, HttpGitHubClient } from '../github/github.client.js';
import { GitHubController } from '../github/github.controller.js';
import { MediaModule } from '../media/media.module.js';
import { CheckoutService } from './checkout.service.js';
import {
  AdminDeliveriesController,
  AdminOrdersController,
  CheckoutController,
} from './commerce.controllers.js';
import { AdminCouponsController, CouponsService } from './coupons.js';
import { FulfillmentService } from './fulfillment.service.js';
import { ManualPaymentsService } from './manual-payments.service.js';
import { OrdersService } from './orders.service.js';
import { PaymentConfigService } from './payment-config.service.js';
import { PaymentsGateway, StripeGateway } from './payments.gateway.js';
import { PaymentsService } from './payments.service.js';
import { HttpPaypalGateway, PaypalGateway } from './paypal.gateway.js';
import { AdminProductsController, ProductsService, PublicProductsController } from './products.js';

/**
 * Products, checkout, orders, payments (Stripe, PayPal, manual) and fulfillment (R2 files +
 * GitHub repositories), plus the customer portal that reads them. The payment ports, payment
 * config and GitHub port are global so admin settings can use them.
 */
@Global()
@Module({
  imports: [MediaModule, CustomersModule],
  controllers: [
    PublicProductsController,
    AdminProductsController,
    AdminCouponsController,
    CheckoutController,
    AdminOrdersController,
    AdminDeliveriesController,
    AccountController,
    GitHubController,
  ],
  providers: [
    ProductsService,
    CouponsService,
    OrdersService,
    CheckoutService,
    PaymentsService,
    PaymentConfigService,
    ManualPaymentsService,
    FulfillmentService,
    AccountService,
    { provide: PaymentsGateway, useClass: StripeGateway },
    { provide: PaypalGateway, useClass: HttpPaypalGateway },
    { provide: GitHubClient, useClass: HttpGitHubClient },
  ],
  exports: [PaymentsGateway, PaypalGateway, PaymentConfigService, GitHubClient, FulfillmentService],
})
export class CommerceModule {}
