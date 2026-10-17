import { Body, Controller, Headers, HttpCode, HttpStatus, Param, Post, Req, Session, UseGuards, ValidationPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import type { PaymentCompleteResponse, PaymentIntentResponse } from '@eshop/shared';

import { RolesGuard } from '../auth/roles.guard';
import { OptionalJwtGuard } from '../auth/optional-jwt.guard';
import { User } from '../auth/models/user.model';
import { Order } from '../orders/models/order.model';
import { RateLimited } from '../shared/rate-limit/rate-limit';
import { ShopSession } from '../shared/types/session';
import { PaymentCompleteDto, PaymentIntentDto, RefundDto } from './dto/payment.dto';
import { PaymentsService } from './payments.service';

const validation = new ValidationPipe({ whitelist: true, errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY });

@Controller('api/payments')
export class PaymentsController {
  constructor(private payments: PaymentsService) {}

  /** Creates (or, on a retry, updates) the order and the PaymentIntent for the session cart */
  @RateLimited()
  @UseGuards(OptionalJwtGuard)
  @Post('/intent')
  @HttpCode(HttpStatus.OK)
  createIntent(
    @Body(validation) body: PaymentIntentDto,
    @Session() session: ShopSession,
    @Headers('lang') lang: string,
    @Req() req: Request & { user?: User | null },
  ): Promise<PaymentIntentResponse> {
    // The order belongs to the logged-in user (never to a user id taken from the body, audit SEC-04)
    return this.payments.createIntent(body, session, lang, req.user?._id ?? null);
  }

  /** Called after Stripe.js confirmed (or when Stripe redirects back): the order's payment state */
  @Post('/complete')
  @HttpCode(HttpStatus.OK)
  complete(
    @Body(validation) body: PaymentCompleteDto,
    @Session() session: ShopSession,
    @Headers('lang') lang: string,
  ): Promise<PaymentCompleteResponse> {
    return this.payments.complete(body.orderId, session, lang);
  }

  /** Stripe webhooks (signature-verified on the raw body, see setAppDB) */
  @Post('/webhook')
  @HttpCode(HttpStatus.OK)
  webhook(@Req() req: Request & { rawBody?: Buffer }, @Headers('stripe-signature') signature: string) {
    return this.payments.handleWebhook(req.rawBody, signature);
  }
}

@Controller('api/admin/orders')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class AdminPaymentsController {
  constructor(private payments: PaymentsService) {}

  /** Full or partial refund of a paid card order */
  @Post('/:orderId/refund')
  @HttpCode(HttpStatus.OK)
  refund(@Param('orderId') orderId: string, @Body(validation) body: RefundDto): Promise<Order> {
    return this.payments.refund(orderId, body.amount);
  }
}
