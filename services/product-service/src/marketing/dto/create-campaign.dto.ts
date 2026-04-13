import { IsArray, IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateCampaignDto {
  @IsString()
  @IsNotEmpty()
  goalId: string;

  @IsArray()
  @IsUUID('4', { each: true })
  productIds: string[];
}
