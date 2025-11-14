/**
 * Product Service Main Entry Point
 */

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { LoggerService } from '../../../shared/logger/logger.service';
import {
  validateAndLog,
  commonDefinitions,
  databaseDefinitions,
} from '../../../shared/config/env-validator';

// Validate environment variables before starting
const productServiceDefinitions = [
  ...commonDefinitions,
  ...databaseDefinitions,
];

validateAndLog(productServiceDefinitions, 'product-service');

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

  // Serve static files for uploaded images
  const express = require('express');
  app.use('/uploads', express.static('uploads'));

  const port = process.env.PORT || 3002;
  await app.listen(port);

  const logger = app.get(LoggerService);
  logger.log(`Product Service is running on: http://localhost:${port}`);
}

bootstrap();
