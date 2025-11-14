/**
 * Initial Database Schema Migration
 * Creates all MVP tables with indexes and constraints
 *
 * IMPORTANT MIGRATION BEST PRACTICES:
 * 1. Always test migrations in development/staging before production
 * 2. Create database backup before running in production
 * 3. Use transactions for data migrations when possible
 * 4. Include safety checks (IF NOT EXISTS, IF EXISTS, etc.)
 * 5. Always implement the down() method for rollback capability
 * 6. Document any data transformations or special considerations
 * 7. Test rollback procedures before deploying
 *
 * EXECUTION:
 * - Run migrations: npm run typeorm:migration:run
 * - Or use script: ./scripts/run-migrations.sh
 *
 * ROLLBACK:
 * - Revert last migration: npm run typeorm:migration:revert
 * - Or use script: ./scripts/rollback-migration.sh
 *
 * See docs/DATABASE_MIGRATIONS.md for complete migration guide
 * See docs/MIGRATION_BEST_PRACTICES.md for best practices
 */

import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class InitialSchema1700000000000 implements MigrationInterface {
  name = 'InitialSchema1700000000000';

  /**
   * Forward migration - creates all initial tables
   */
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum types first
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "order_status_enum" AS ENUM ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "payment_status_enum" AS ENUM ('pending', 'paid', 'failed', 'refunded');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create users table
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'gen_random_uuid()' },
          { name: 'email', type: 'varchar', length: '255', isUnique: true },
          { name: 'password', type: 'varchar', length: '255' },
          { name: 'firstName', type: 'varchar', length: '100', isNullable: true },
          { name: 'lastName', type: 'varchar', length: '100', isNullable: true },
          { name: 'phone', type: 'varchar', length: '20', isNullable: true },
          { name: 'isEmailVerified', type: 'boolean', default: false },
          { name: 'isAdmin', type: 'boolean', default: false },
          { name: 'preferences', type: 'jsonb', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex('users', new TableIndex({ name: 'IDX_users_email', columnNames: ['email'], isUnique: true }));

    // Create categories table
    await queryRunner.createTable(
      new Table({
        name: 'categories',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'gen_random_uuid()' },
          { name: 'name', type: 'varchar', length: '255' },
          { name: 'slug', type: 'varchar', length: '255', isUnique: true },
          { name: 'description', type: 'text', isNullable: true },
          { name: 'imageUrl', type: 'varchar', length: '500', isNullable: true },
          { name: 'parentId', type: 'uuid', isNullable: true },
          { name: 'sortOrder', type: 'integer', default: 0 },
          { name: 'isActive', type: 'boolean', default: true },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex('categories', new TableIndex({ name: 'IDX_categories_slug', columnNames: ['slug'], isUnique: true }));

    // Create products table
    await queryRunner.createTable(
      new Table({
        name: 'products',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'gen_random_uuid()' },
          { name: 'name', type: 'varchar', length: '255' },
          { name: 'sku', type: 'varchar', length: '255', isUnique: true },
          { name: 'description', type: 'text', isNullable: true },
          { name: 'shortDescription', type: 'text', isNullable: true },
          { name: 'price', type: 'decimal', precision: 10, scale: 2 },
          { name: 'compareAtPrice', type: 'decimal', precision: 10, scale: 2, isNullable: true },
          { name: 'mainImageUrl', type: 'varchar', length: '500', isNullable: true },
          { name: 'imageUrls', type: 'jsonb', isNullable: true },
          { name: 'videoUrls', type: 'jsonb', isNullable: true },
          { name: 'stockQuantity', type: 'integer', default: 0 },
          { name: 'trackInventory', type: 'boolean', default: false },
          { name: 'isActive', type: 'boolean', default: true },
          { name: 'brand', type: 'varchar', length: '100', isNullable: true },
          { name: 'manufacturer', type: 'varchar', length: '100', isNullable: true },
          { name: 'attributes', type: 'jsonb', isNullable: true },
          { name: 'rating', type: 'decimal', precision: 5, scale: 2, isNullable: true },
          { name: 'reviewCount', type: 'integer', default: 0 },
          { name: 'seoTitle', type: 'varchar', length: '255', isNullable: true },
          { name: 'seoDescription', type: 'text', isNullable: true },
          { name: 'seoKeywords', type: 'varchar', length: '255', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex('products', new TableIndex({ name: 'IDX_products_sku', columnNames: ['sku'], isUnique: true }));
    await queryRunner.createIndex('products', new TableIndex({ name: 'IDX_products_name', columnNames: ['name'] }));
    await queryRunner.createIndex('products', new TableIndex({ name: 'IDX_products_isActive', columnNames: ['isActive'] }));

    // Create product_categories join table
    await queryRunner.createTable(
      new Table({
        name: 'product_categories',
        columns: [
          { name: 'productId', type: 'uuid' },
          { name: 'categoryId', type: 'uuid' },
        ],
      }),
      true,
    );

    await queryRunner.createPrimaryKey('product_categories', ['productId', 'categoryId']);

    // Create product_variants table
    await queryRunner.createTable(
      new Table({
        name: 'product_variants',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'gen_random_uuid()' },
          { name: 'productId', type: 'uuid' },
          { name: 'sku', type: 'varchar', length: '255' },
          { name: 'name', type: 'varchar', length: '100', isNullable: true },
          { name: 'options', type: 'jsonb' },
          { name: 'price', type: 'decimal', precision: 10, scale: 2 },
          { name: 'compareAtPrice', type: 'decimal', precision: 10, scale: 2, isNullable: true },
          { name: 'stockQuantity', type: 'integer', default: 0 },
          { name: 'imageUrl', type: 'varchar', length: '500', isNullable: true },
          { name: 'isActive', type: 'boolean', default: true },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex('product_variants', new TableIndex({ name: 'IDX_product_variants_product_sku', columnNames: ['productId', 'sku'], isUnique: true }));

    // Create suppliers table
    await queryRunner.createTable(
      new Table({
        name: 'suppliers',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'gen_random_uuid()' },
          { name: 'name', type: 'varchar', length: '255' },
          { name: 'contactEmail', type: 'varchar', length: '255', isNullable: true },
          { name: 'contactPhone', type: 'varchar', length: '50', isNullable: true },
          { name: 'address', type: 'text', isNullable: true },
          { name: 'apiUrl', type: 'varchar', length: '100', isNullable: true },
          { name: 'apiKey', type: 'varchar', length: '255', isNullable: true },
          { name: 'apiSecret', type: 'varchar', length: '255', isNullable: true },
          { name: 'apiConfig', type: 'jsonb', isNullable: true },
          { name: 'isActive', type: 'boolean', default: true },
          { name: 'autoSyncProducts', type: 'boolean', default: false },
          { name: 'autoForwardOrders', type: 'boolean', default: false },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex('suppliers', new TableIndex({ name: 'IDX_suppliers_name', columnNames: ['name'] }));

    // Create supplier_products table
    await queryRunner.createTable(
      new Table({
        name: 'supplier_products',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'gen_random_uuid()' },
          { name: 'supplierId', type: 'uuid' },
          { name: 'productId', type: 'uuid' },
          { name: 'supplierSku', type: 'varchar', length: '255' },
          { name: 'supplierPrice', type: 'decimal', precision: 10, scale: 2 },
          { name: 'profitMargin', type: 'decimal', precision: 5, scale: 2, isNullable: true },
          { name: 'supplierStock', type: 'integer', isNullable: true },
          { name: 'supplierData', type: 'jsonb', isNullable: true },
          { name: 'lastSyncedAt', type: 'timestamp', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex('supplier_products', new TableIndex({ name: 'IDX_supplier_products_supplier_sku', columnNames: ['supplierId', 'supplierSku'], isUnique: true }));

    // Create delivery_addresses table
    await queryRunner.createTable(
      new Table({
        name: 'delivery_addresses',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'gen_random_uuid()' },
          { name: 'userId', type: 'uuid' },
          { name: 'firstName', type: 'varchar', length: '100' },
          { name: 'lastName', type: 'varchar', length: '100' },
          { name: 'street', type: 'varchar', length: '255' },
          { name: 'city', type: 'varchar', length: '100' },
          { name: 'postalCode', type: 'varchar', length: '20' },
          { name: 'country', type: 'varchar', length: '100' },
          { name: 'phone', type: 'varchar', length: '50', isNullable: true },
          { name: 'isDefault', type: 'boolean', default: false },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex('delivery_addresses', new TableIndex({ name: 'IDX_delivery_addresses_userId', columnNames: ['userId'] }));

    // Create orders table
    await queryRunner.createTable(
      new Table({
        name: 'orders',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'gen_random_uuid()' },
          { name: 'orderNumber', type: 'varchar', length: '50', isUnique: true },
          { name: 'userId', type: 'uuid' },
          { name: 'deliveryAddressId', type: 'uuid' },
          { name: 'status', type: 'order_status_enum', default: "'pending'" },
          { name: 'paymentStatus', type: 'payment_status_enum', default: "'pending'" },
          { name: 'paymentMethod', type: 'varchar', length: '50', isNullable: true },
          { name: 'paymentTransactionId', type: 'varchar', length: '255', isNullable: true },
          { name: 'subtotal', type: 'decimal', precision: 10, scale: 2 },
          { name: 'tax', type: 'decimal', precision: 10, scale: 2, default: 0 },
          { name: 'shippingCost', type: 'decimal', precision: 10, scale: 2, default: 0 },
          { name: 'discount', type: 'decimal', precision: 10, scale: 2, default: 0 },
          { name: 'total', type: 'decimal', precision: 10, scale: 2 },
          { name: 'trackingNumber', type: 'varchar', length: '100', isNullable: true },
          { name: 'shippingProvider', type: 'varchar', length: '255', isNullable: true },
          { name: 'notes', type: 'text', isNullable: true },
          { name: 'metadata', type: 'jsonb', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex('orders', new TableIndex({ name: 'IDX_orders_orderNumber', columnNames: ['orderNumber'], isUnique: true }));
    await queryRunner.createIndex('orders', new TableIndex({ name: 'IDX_orders_userId', columnNames: ['userId'] }));
    await queryRunner.createIndex('orders', new TableIndex({ name: 'IDX_orders_status', columnNames: ['status'] }));

    // Create order_items table
    await queryRunner.createTable(
      new Table({
        name: 'order_items',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'gen_random_uuid()' },
          { name: 'orderId', type: 'uuid' },
          { name: 'productId', type: 'uuid' },
          { name: 'variantId', type: 'uuid', isNullable: true },
          { name: 'productName', type: 'varchar', length: '255' },
          { name: 'productSku', type: 'varchar', length: '255' },
          { name: 'quantity', type: 'integer' },
          { name: 'unitPrice', type: 'decimal', precision: 10, scale: 2 },
          { name: 'totalPrice', type: 'decimal', precision: 10, scale: 2 },
          { name: 'profitMargin', type: 'decimal', precision: 10, scale: 2, isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex('order_items', new TableIndex({ name: 'IDX_order_items_orderId', columnNames: ['orderId'] }));

    // Create order_status_history table
    await queryRunner.createTable(
      new Table({
        name: 'order_status_history',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'gen_random_uuid()' },
          { name: 'orderId', type: 'uuid' },
          { name: 'status', type: 'order_status_enum' },
          { name: 'notes', type: 'text', isNullable: true },
          { name: 'changedBy', type: 'varchar', length: '100', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex('order_status_history', new TableIndex({ name: 'IDX_order_status_history_orderId', columnNames: ['orderId'] }));

    // Create cart_items table
    await queryRunner.createTable(
      new Table({
        name: 'cart_items',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'gen_random_uuid()' },
          { name: 'userId', type: 'uuid' },
          { name: 'productId', type: 'uuid' },
          { name: 'variantId', type: 'uuid', isNullable: true },
          { name: 'quantity', type: 'integer' },
          { name: 'price', type: 'decimal', precision: 10, scale: 2 },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex('cart_items', new TableIndex({ name: 'IDX_cart_items_user_product_variant', columnNames: ['userId', 'productId', 'variantId'], isUnique: true }));

    // Create invoices table
    await queryRunner.createTable(
      new Table({
        name: 'invoices',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'gen_random_uuid()' },
          { name: 'orderId', type: 'uuid' },
          { name: 'invoiceNumber', type: 'varchar', length: '50', isUnique: true },
          { name: 'fileUrl', type: 'varchar', length: '500', isNullable: true },
          { name: 'invoiceData', type: 'jsonb' },
          { name: 'issuedAt', type: 'timestamp' },
          { name: 'paidAt', type: 'timestamp', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex('invoices', new TableIndex({ name: 'IDX_invoices_invoiceNumber', columnNames: ['invoiceNumber'], isUnique: true }));
    await queryRunner.createIndex('invoices', new TableIndex({ name: 'IDX_invoices_orderId', columnNames: ['orderId'] }));

    // Create proforma_invoices table
    await queryRunner.createTable(
      new Table({
        name: 'proforma_invoices',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'gen_random_uuid()' },
          { name: 'orderId', type: 'uuid' },
          { name: 'proformaNumber', type: 'varchar', length: '50', isUnique: true },
          { name: 'fileUrl', type: 'varchar', length: '500', isNullable: true },
          { name: 'invoiceData', type: 'jsonb' },
          { name: 'issuedAt', type: 'timestamp' },
          { name: 'expiresAt', type: 'timestamp', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex('proforma_invoices', new TableIndex({ name: 'IDX_proforma_invoices_proformaNumber', columnNames: ['proformaNumber'], isUnique: true }));
    await queryRunner.createIndex('proforma_invoices', new TableIndex({ name: 'IDX_proforma_invoices_orderId', columnNames: ['orderId'] }));

    // Create company_settings table
    await queryRunner.createTable(
      new Table({
        name: 'company_settings',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'gen_random_uuid()' },
          { name: 'name', type: 'varchar', length: '255', default: "'FlipFlop.cz'" },
          { name: 'address', type: 'varchar', length: '255', isNullable: true },
          { name: 'city', type: 'varchar', length: '255', isNullable: true },
          { name: 'postalCode', type: 'varchar', length: '20', isNullable: true },
          { name: 'country', type: 'varchar', length: '100', isNullable: true },
          { name: 'ico', type: 'varchar', length: '50', isNullable: true },
          { name: 'dic', type: 'varchar', length: '50', isNullable: true },
          { name: 'phone', type: 'varchar', length: '50', isNullable: true },
          { name: 'email', type: 'varchar', length: '255', isNullable: true },
          { name: 'website', type: 'varchar', length: '255', isNullable: true },
          { name: 'logoUrl', type: 'varchar', length: '500', isNullable: true },
          { name: 'notes', type: 'text', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    // Create payment_methods table
    await queryRunner.createTable(
      new Table({
        name: 'payment_methods',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, generationStrategy: 'uuid', default: 'gen_random_uuid()' },
          { name: 'userId', type: 'uuid' },
          { name: 'type', type: 'varchar', length: '50' },
          { name: 'provider', type: 'varchar', length: '255', isNullable: true },
          { name: 'metadata', type: 'jsonb', isNullable: true },
          { name: 'isDefault', type: 'boolean', default: false },
          { name: 'isActive', type: 'boolean', default: true },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex('payment_methods', new TableIndex({ name: 'IDX_payment_methods_userId', columnNames: ['userId'] }));

    // Create foreign keys
    await queryRunner.createForeignKey(
      'product_variants',
      new TableForeignKey({
        columnNames: ['productId'],
        referencedTableName: 'products',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'product_categories',
      new TableForeignKey({
        columnNames: ['productId'],
        referencedTableName: 'products',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'product_categories',
      new TableForeignKey({
        columnNames: ['categoryId'],
        referencedTableName: 'categories',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'supplier_products',
      new TableForeignKey({
        columnNames: ['supplierId'],
        referencedTableName: 'suppliers',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'supplier_products',
      new TableForeignKey({
        columnNames: ['productId'],
        referencedTableName: 'products',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'delivery_addresses',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'orders',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'orders',
      new TableForeignKey({
        columnNames: ['deliveryAddressId'],
        referencedTableName: 'delivery_addresses',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.createForeignKey(
      'order_items',
      new TableForeignKey({
        columnNames: ['orderId'],
        referencedTableName: 'orders',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'order_items',
      new TableForeignKey({
        columnNames: ['productId'],
        referencedTableName: 'products',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'order_items',
      new TableForeignKey({
        columnNames: ['variantId'],
        referencedTableName: 'product_variants',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'order_status_history',
      new TableForeignKey({
        columnNames: ['orderId'],
        referencedTableName: 'orders',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'cart_items',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'cart_items',
      new TableForeignKey({
        columnNames: ['productId'],
        referencedTableName: 'products',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'cart_items',
      new TableForeignKey({
        columnNames: ['variantId'],
        referencedTableName: 'product_variants',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'invoices',
      new TableForeignKey({
        columnNames: ['orderId'],
        referencedTableName: 'orders',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'proforma_invoices',
      new TableForeignKey({
        columnNames: ['orderId'],
        referencedTableName: 'orders',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'payment_methods',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );
  }

  /**
   * Rollback migration - drops all tables
   */
  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign keys first
    const tables = [
      'payment_methods',
      'proforma_invoices',
      'invoices',
      'cart_items',
      'order_status_history',
      'order_items',
      'orders',
      'delivery_addresses',
      'supplier_products',
      'suppliers',
      'product_variants',
      'product_categories',
      'products',
      'categories',
      'users',
    ];

    for (const table of tables) {
      const tableInstance = await queryRunner.getTable(table);
      if (tableInstance) {
        const foreignKeys = tableInstance.foreignKeys;
        for (const fk of foreignKeys) {
          await queryRunner.dropForeignKey(table, fk);
        }
      }
    }

    // Drop tables
    for (const table of tables) {
      await queryRunner.dropTable(table, true);
    }

    // Drop enum types
    await queryRunner.query(`DROP TYPE IF EXISTS "payment_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "order_status_enum"`);
  }
}

