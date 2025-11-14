/**
 * User Service App Module
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '../../../shared/database/database.module';
import { LoggerModule } from '../../../shared/logger/logger.module';
import { SettingsModule } from '../../../shared/settings/settings.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DeliveryAddressesModule } from './delivery-addresses/delivery-addresses.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../../.env'],
    }),
    DatabaseModule,
    LoggerModule,
    SettingsModule,
    AuthModule,
    UsersModule,
    DeliveryAddressesModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}

