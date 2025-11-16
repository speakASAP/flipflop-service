/**
 * Order Service Main Entry Point
 */

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { LoggerService } from '../../../shared/logger/logger.service';
import {
  validateAndLog,
  commonDefinitions,
  databaseDefinitions,
  jwtDefinitions,
} from '../../../shared/config/env-validator';

// Validate environment variables before starting
const orderServiceDefinitions = [
  ...commonDefinitions,
  ...databaseDefinitions,
  ...jwtDefinitions,
  {
    name: 'PAYU_MERCHANT_ID',
    required: true,
    type: 'string',
    description: 'PayU merchant ID',
  },
  {
    name: 'PAYU_POS_ID',
    required: true,
    type: 'string',
    description: 'PayU POS ID',
  },
  {
    name: 'PAYU_CLIENT_ID',
    required: true,
    type: 'string',
    description: 'PayU client ID',
  },
  {
    name: 'PAYU_CLIENT_SECRET',
    required: true,
    type: 'string',
    description: 'PayU client secret',
  },
  {
    name: 'PAYU_API_URL',
    required: false,
    type: 'url',
    default: 'https://secure.payu.com/api/v2_1',
    description: 'PayU API URL',
  },
  {
    name: 'PAYU_SANDBOX',
    required: false,
    type: 'boolean',
    default: 'false',
    description: 'Use PayU sandbox',
  },
  {
    name: 'NOTIFICATION_SERVICE_URL',
    required: false,
    type: 'url',
    default: 'https://notifications.statex.cz',
    description: 'Notification microservice URL',
  },
];

validateAndLog(orderServiceDefinitions, 'order-service');

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new LoggerService(),
  });

  // Enable CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = process.env.PORT || 3003;
  await app.listen(port);

  const logger = app.get(LoggerService);
  logger.log(`Order Service is running on: http://localhost:${port}`);
}

bootstrap();

