import {
  Body,
  Controller,
  Headers,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { PaymentResultDto } from './dto/payment-result.dto';
import { UpdateOrderPaymentStatusDto } from './dto/update-order-payment-status.dto';

@Controller('internal/orders')
export class OrdersInternalController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('payment-result')
  async paymentResult(
    @Headers('x-flipflop-internal-key') internalKey: string | undefined,
    @Body() body: PaymentResultDto,
  ) {
    this.ordersService.assertInternalServiceKey(internalKey);
    return this.ordersService.handlePaymentResult(body);
  }

  @Patch('by-id/:id/payment-status')
  async patchPaymentStatus(
    @Headers('x-flipflop-internal-key') internalKey: string | undefined,
    @Param('id') id: string,
    @Body() dto: UpdateOrderPaymentStatusDto,
  ) {
    this.ordersService.assertInternalServiceKey(internalKey);
    return this.ordersService.updateInternalPaymentStatus(id, dto);
  }
}
