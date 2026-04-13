import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateSupplierDeliveryDto {
  @IsString()
  supplierId: string;

  @IsString()
  supplierName: string;

  @IsString()
  productId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsDateString()
  orderedAt: string;

  @IsOptional()
  @IsDateString()
  receivedAt?: string | null;
}
