import { IsString, IsOptional, IsNumber, Min } from 'class-validator';

export class CreateOrderDto {
  @IsString()
  deliveryAddressId: string;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  shippingCost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;
}

