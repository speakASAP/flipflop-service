/**
 * User Service App Module
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { HealthModule, PrismaModule, LoggerModule, AuthModule } from '@flipflop/shared';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),
    PrismaModule,
    LoggerModule,
    AuthModule,
    HealthModule,
    UsersModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
