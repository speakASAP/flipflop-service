/**
 * Admin Settings Entity
 * Stores admin-configurable environment variables and system settings
 * Singleton pattern - only one record exists
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('admin_settings')
export class AdminSettings {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  /**
   * Environment variable overrides
   * These override .env values for all services
   * Format: { "VARIABLE_NAME": "value" }
   */
  @Column({ type: 'jsonb', nullable: true, default: {} })
  envOverrides!: Record<string, string>;

  /**
   * Feature flags
   * Enable/disable features system-wide
   */
  @Column({ type: 'jsonb', nullable: true, default: {} })
  features!: Record<string, boolean>;

  /**
   * Business configuration
   * Business-specific settings (currency, tax rates, etc.)
   */
  @Column({ type: 'jsonb', nullable: true, default: {} })
  business!: Record<string, any>;

  /**
   * Integration settings
   * Third-party service configurations
   */
  @Column({ type: 'jsonb', nullable: true, default: {} })
  integrations!: Record<string, any>;

  /**
   * System settings
   * System-wide configuration
   */
  @Column({ type: 'jsonb', nullable: true, default: {} })
  system!: Record<string, any>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

