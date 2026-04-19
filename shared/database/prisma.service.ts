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
    // Construct DATABASE_URL from DB_* variables if not set or invalid
    let databaseUrl = process.env.DATABASE_URL;
    
    // Validate existing DATABASE_URL if present
    let isValidUrl = false;
    if (databaseUrl) {
      // Check for common issues: duplicate key, missing protocol, or invalid format
      if (databaseUrl.includes('DATABASE_URL=')) {
        // Remove duplicate key prefix if present
        databaseUrl = databaseUrl.replace(/^DATABASE_URL=/, '');
      }
      
      // Validate URL format
      if (databaseUrl.startsWith('postgresql://') || databaseUrl.startsWith('postgres://')) {
        try {
          // Try to parse the URL to validate it
          new URL(databaseUrl);
          isValidUrl = true;
        } catch {
          // URL is malformed (e.g., password contains unencoded special characters)
          isValidUrl = false;
        }
      }
    }
    
    // If DATABASE_URL is invalid or missing, construct from DB_* variables
    if (!isValidUrl) {
      const dbHost = process.env.DB_HOST || 'db-server-postgres';
      const dbPort = process.env.DB_PORT || '5432';
      const dbUser = process.env.DB_USER || 'dbadmin';
      const dbPassword = process.env.DB_PASSWORD || '';
      const dbName = process.env.DB_NAME || 'flipflop';
      
      // URL encode password to handle special characters (/, +, =, @, etc.)
      const encodedPassword = encodeURIComponent(dbPassword);
      
      databaseUrl = `postgresql://${dbUser}:${encodedPassword}@${dbHost}:${dbPort}/${dbName}?schema=public`;
      process.env.DATABASE_URL = databaseUrl;
    }

    // Pass datasources explicitly to PrismaClient to ensure correct URL is used
    super({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'info' },
        { emit: 'event', level: 'warn' },
      ],
    });
  }

  private readonly dbConnectRetries = Number(process.env.DB_CONNECT_RETRIES ?? 10);
  private readonly dbConnectRetryDelayMs = Number(process.env.DB_CONNECT_RETRY_DELAY_MS ?? 5000);

  private async sleep(ms: number) {
    return new Promise<void>((resolve) => setTimeout(resolve, ms));
  }

  async onModuleInit() {
    let attempt = 0;
    while (true) {
      attempt += 1;
      try {
        await this.$connect();
        this.logger.log('Prisma Client connected to database');
        break;
      } catch (error) {
        this.logger.error(
          `Prisma database connection attempt ${attempt} failed.`,
          error as Error,
        );

        if (attempt >= this.dbConnectRetries) {
          this.logger.error(
            `Failed to connect to the database after ${attempt} attempts.`,
          );
          throw error;
        }

        const delay = this.dbConnectRetryDelayMs * attempt;
        this.logger.warn(
          `Retrying database connection in ${delay}ms (${attempt}/${this.dbConnectRetries}).`,
        );
        await this.sleep(delay);
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Prisma Client disconnected from database');
  }
}
