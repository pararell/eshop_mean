import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { OrdersModule } from '../orders/orders.module';
import { AdminPaymentsController, PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { createStripe, STRIPE } from './stripe.client';

/** Card payments with the Stripe Payment Element (docs/payments.md) */
@Module({
  imports: [AuthModule, OrdersModule],
  controllers: [PaymentsController, AdminPaymentsController],
  providers: [{ provide: STRIPE, useFactory: () => createStripe() }, PaymentsService],
})
export class PaymentsModule {}
