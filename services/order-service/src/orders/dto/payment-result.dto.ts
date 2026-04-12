import { IsObject, IsOptional, IsString } from 'class-validator';

/**
 * Body from payments-microservice callback (JSON POST).
 */
export class PaymentResultDto {
  @IsString()
  paymentId: string;

  @IsString()
  orderId: string;

  @IsString()
  status: string;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  event?: string;

  @IsOptional()
  @IsString()
  timestamp?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
