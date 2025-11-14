/**
 * Update User Settings DTO
 * For updating user preferences including environment variable overrides
 */

import { IsOptional, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class NotificationPreferencesDto {
  @IsOptional()
  email?: boolean;

  @IsOptional()
  telegram?: boolean;

  @IsOptional()
  whatsapp?: boolean;
}

export class UpdateUserSettingsDto {
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => NotificationPreferencesDto)
  notifications?: NotificationPreferencesDto;

  @IsOptional()
  language?: string;

  @IsOptional()
  theme?: string;

  /**
   * Environment variable overrides (user-specific)
   * Only non-sensitive variables can be overridden
   */
  @IsOptional()
  @IsObject()
  envOverrides?: Record<string, string>;
}
