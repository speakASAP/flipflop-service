/**
 * Database Module
 * Provides TypeORM database connection for NestJS services
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { databaseConfig } from './database.config';
import * as entities from '../entities';

// Filter out enums and only include actual entity classes
const entityClasses = Object.values(entities).filter(
  (entity) => typeof entity === 'function' && entity.prototype?.constructor,
) as Array<new (...args: any[]) => any>;

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: async () => {
        // Ensure connection is established
        return {
          ...databaseConfig,
          entities: entityClasses,
        };
      },
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}

