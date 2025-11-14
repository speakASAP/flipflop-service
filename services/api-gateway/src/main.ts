/**
 * API Gateway Main Entry Point
 */

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { LoggerService } from '../../../shared/logger/logger.service';
import {
  validateAndLog,
  commonDefinitions,
  jwtDefinitions,
  EnvVarDefinition,
} from '../../../shared/config/env-validator';

// Validate environment variables before starting
const apiGatewayDefinitions: EnvVarDefinition[] = [
  ...commonDefinitions,
  ...jwtDefinitions,
  {
    name: 'CORS_ORIGIN',
    required: false,
    type: 'string' as const,
    default: 'http://localhost:3000',
    description: 'CORS allowed origin',
  },
];

validateAndLog(apiGatewayDefinitions, 'api-gateway');

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

  // Global prefix
  app.setGlobalPrefix('api');

  const port = process.env.PORT || 3001;
  await app.listen(port);

  const logger = app.get(LoggerService);
  logger.log(`API Gateway is running on: http://localhost:${port}`);
}

bootstrap();

