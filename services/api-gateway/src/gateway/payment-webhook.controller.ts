import { Body, Controller, Headers, HttpCode, Logger, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GatewayService } from './gateway.service';

/**
 * Public webhook for payments-microservice payment outcome callbacks.
 */
@Controller()
export class PaymentWebhookController {
  private readonly logger = new Logger(PaymentWebhookController.name);

  constructor(
    private readonly gatewayService: GatewayService,
    private readonly configService: ConfigService,
  ) {}

  @Post('api/webhooks/payment-result')
  @HttpCode(200)
  async handlePaymentResult(
    @Body() body: unknown,
    @Headers('x-api-key') apiKey?: string,
  ): Promise<{ received: boolean }> {
    const expectedKey = this.configService.get<string>('PAYMENT_WEBHOOK_API_KEY');
    if (expectedKey && apiKey !== expectedKey) {
      this.logger.warn('payment-result webhook: rejected x-api-key');
      return { received: true };
    }

    const internalSecret = this.configService.get<string>('FLIPFLOP_INTERNAL_SERVICE_SECRET');
    try {
      await this.gatewayService.forwardRequest(
        'orders',
        '/internal/orders/payment-result',
        'POST',
        body,
        internalSecret ? { 'X-Flipflop-Internal-Key': internalSecret } : {},
      );
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`payment-result forward to order-service failed: ${message}`);
    }

    return { received: true };
  }
}
