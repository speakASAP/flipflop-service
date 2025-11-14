/**
 * AI Service Main Entry Point
 */

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { LoggerService } from '../../../shared/logger/logger.service';
import {
  validateAndLog,
  commonDefinitions,
  EnvVarDefinition,
} from '../../../shared/config/env-validator';

// Validate environment variables before starting
const aiServiceDefinitions: EnvVarDefinition[] = [
  ...commonDefinitions,
  {
    name: 'OPENROUTER_API_KEY',
    required: true,
    type: 'string',
    description: 'OpenRouter API key',
  },
  {
    name: 'OPENROUTER_API_BASE',
    required: false,
    type: 'url',
    default: 'https://openrouter.ai/api/v1',
    description: 'OpenRouter API base URL',
  },
  {
    name: 'OPENROUTER_MODEL',
    required: false,
    type: 'string',
    default: 'google/gemini-2.0-flash-exp:free',
    description: 'AI model identifier',
  },
  {
    name: 'OPENROUTER_TIMEOUT',
    required: false,
    type: 'number',
    default: '60',
    description: 'Request timeout in seconds',
  },
];

validateAndLog(aiServiceDefinitions, 'ai-service');

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

  const port = process.env.PORT || 3007;
  await app.listen(port);

  const logger = app.get(LoggerService);
  logger.log(`AI Service is running on: http://localhost:${port}`);
}

bootstrap();

