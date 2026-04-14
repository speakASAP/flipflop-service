import { IsIn, IsOptional, IsString } from 'class-validator';
import type { OrderStatus, PaymentStatus } from '@prisma/client';

const ORDER_STATUS_VALUES: OrderStatus[] = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
];

const PAYMENT_STATUS_VALUES: PaymentStatus[] = ['pending', 'paid', 'failed', 'refunded'];

export class UpdateOrderPaymentStatusDto {
  @IsIn(PAYMENT_STATUS_VALUES)
  paymentStatus: PaymentStatus;

  @IsOptional()
  @IsIn(ORDER_STATUS_VALUES)
  status?: OrderStatus;

  @IsOptional()
  @IsString()
  paymentTransactionId?: string;
}
