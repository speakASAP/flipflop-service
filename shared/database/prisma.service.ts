/**
 * Prisma Service
 * Provides Prisma Client instance for database access
 */

import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    // Construct DATABASE_URL from DB_* variables if not set
    if (!process.env.DATABASE_URL) {
      const dbHost = process.env.DB_HOST || 'db-server-postgres';
      const dbPort = process.env.DB_PORT || '5432';
      const dbUser = process.env.DB_USER || 'dbadmin';
      const dbPassword = process.env.DB_PASSWORD || '';
      const dbName = process.env.DB_NAME || 'ecommerce';
      
      // URL encode password to handle special characters
      const encodedPassword = encodeURIComponent(dbPassword);
      
      process.env.DATABASE_URL = `postgresql://${dbUser}:${encodedPassword}@${dbHost}:${dbPort}/${dbName}?schema=public`;
    }

    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'info' },
        { emit: 'event', level: 'warn' },
      ],
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Prisma Client connected to database');
    } catch (error) {
      this.logger.error('Failed to connect to database', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Prisma Client disconnected from database');
  }
}
