/**
 * Add Admin Settings Table Migration
 * Creates admin_settings table for storing admin-configurable environment variables
 *
 * EXECUTION:
 * - Run migrations: npm run typeorm:migration:run
 * - Or use script: ./scripts/run-migrations.sh
 *
 * ROLLBACK:
 * - Revert migration: npm run typeorm:migration:revert
 * - Or use script: ./scripts/rollback-migration.sh
 */

import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class AddAdminSettings1700000001000 implements MigrationInterface {
  name = 'AddAdminSettings1700000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check if table already exists
    const tableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'admin_settings'
      );
    `);

    if (tableExists[0].exists) {
      console.log('admin_settings table already exists, skipping creation');
      return;
    }

    // Create admin_settings table
    await queryRunner.createTable(
      new Table({
        name: 'admin_settings',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'envOverrides',
            type: 'jsonb',
            isNullable: true,
            default: "'{}'",
          },
          {
            name: 'features',
            type: 'jsonb',
            isNullable: true,
            default: "'{}'",
          },
          {
            name: 'business',
            type: 'jsonb',
            isNullable: true,
            default: "'{}'",
          },
          {
            name: 'integrations',
            type: 'jsonb',
            isNullable: true,
            default: "'{}'",
          },
          {
            name: 'system',
            type: 'jsonb',
            isNullable: true,
            default: "'{}'",
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updatedAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Create index on id for faster lookups
    await queryRunner.createIndex(
      'admin_settings',
      new TableIndex({
        name: 'IDX_admin_settings_id',
        columnNames: ['id'],
      }),
    );

    // Insert default admin settings
    await queryRunner.query(`
      INSERT INTO admin_settings (id, "envOverrides", features, business, integrations, system, "createdAt", "updatedAt")
      VALUES (
        gen_random_uuid(),
        '{}',
        '{}',
        '{}',
        '{}',
        '{}',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Check if table exists before dropping
    const tableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'admin_settings'
      );
    `);

    if (!tableExists[0].exists) {
      console.log('admin_settings table does not exist, skipping drop');
      return;
    }

    // Drop index
    await queryRunner.dropIndex('admin_settings', 'IDX_admin_settings_id');

    // Drop table
    await queryRunner.dropTable('admin_settings');
  }
}

