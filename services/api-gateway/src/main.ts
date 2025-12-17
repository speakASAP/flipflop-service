/**
 * API Gateway Main Entry Point
 */

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Enable CORS
  const nodeEnv = process.env.NODE_ENV || 'development';
  const allowedOrigins = nodeEnv === 'development'
    ? ['http://localhost:3500', 'http://localhost:3000', 'https://flipflop.statex.cz']
    : (process.env.CORS_ORIGIN || 'https://flipflop.statex.cz');

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const port = process.env.PORT || 3011;
  await app.listen(port, "0.0.0.0");
  console.log(`API Gateway is running on: http://localhost:${port}`);
}

bootstrap();

