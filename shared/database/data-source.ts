/**
 * TypeORM DataSource Configuration
 * Used by TypeORM CLI for migrations
 */

import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as path from 'path';

// Load environment variables
config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'db-server-postgres',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'dbadmin',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ecommerce',
  entities: [], // Don't load entities for migrations
  migrations: [path.join(__dirname, '../migrations/**/*{.ts,.js}')],
  synchronize: false, // Never use synchronize in production
  logging: process.env.NODE_ENV === 'development',
  migrationsRun: false,
  migrationsTableName: 'migrations',
});
