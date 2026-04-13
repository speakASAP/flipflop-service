import { IsString, IsIn, IsNumber, IsInt, Min, IsOptional, IsDateString } from 'class-validator';

export class CreateDiscountCodeDto {
  @IsString()
  @IsIn(['percentage', 'fixed'])
  type: 'percentage' | 'fixed';

  @IsNumber()
  @Min(0)
  value: number;

  @IsInt()
  @Min(1)
  maxUses: number;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsString()
  goalId?: string;
}
