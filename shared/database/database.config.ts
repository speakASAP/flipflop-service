/**
 * Database Configuration
 * Connects to production PostgreSQL database
 * 
 * For local development: Use DB_HOST=localhost (via SSH tunnel to production)
 * For Docker: Use DB_HOST=db-server-postgres (Docker network name)
 * 
 * Production database is at: statex server (db-server-postgres container)
 */

import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { config } from 'dotenv';

config();

export const databaseConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  // Default to Docker network name, but should be overridden via .env
  // Local dev: localhost (SSH tunnel), Docker: db-server-postgres
  host: process.env.DB_HOST || 'db-server-postgres',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'dbadmin',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ecommerce',
  entities: [__dirname + '/../../shared/entities/**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../../shared/migrations/**/*{.ts,.js}'],
  synchronize: process.env.DB_SYNC === 'true', // Should be false in production
  logging: process.env.NODE_ENV === 'development',
  extra: {
    max: 20, // Maximum number of connections in the pool
    connectionTimeoutMillis: 10000, // Increased timeout for connection establishment
  },
  // Retry connection on failure
  retryAttempts: 3,
  retryDelay: 3000,
};

