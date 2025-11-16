/**
 * Script to create or update admin user
 * Usage: npx ts-node scripts/create-admin-user.ts <email> [password]
 * 
 * Note: Make sure bcrypt is installed: npm install bcrypt @types/bcrypt
 * Or run from user-service directory where bcrypt is already installed
 */

import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import * as path from 'path';

// Load environment variables
config({ path: path.join(__dirname, '../.env') });

// Try to import bcrypt, fallback to using user-service's bcrypt
let bcrypt: any;
try {
  bcrypt = require('bcrypt');
} catch (e) {
  // If bcrypt not found in root, try to use it from user-service
  try {
    const userServicePath = path.join(__dirname, '../services/user-service/node_modules/bcrypt');
    bcrypt = require(userServicePath);
  } catch (e2) {
    console.error('❌ Error: bcrypt module not found');
    console.error('\n📦 Installing bcrypt...');
    console.error('Please run: npm install bcrypt @types/bcrypt');
    console.error('\nOr use SQL method instead (see docs/ADMIN_ACCESS.md)');
    process.exit(1);
  }
}

async function createAdminUser() {
  const email = process.argv[2];
  const password = process.argv[3] || 'admin123';

  if (!email) {
    console.error('Usage: npx ts-node scripts/create-admin-user.ts <email> [password]');
    console.error('\nExample:');
    console.error('  npx ts-node scripts/create-admin-user.ts admin@flipflop.statex.cz admin123');
    process.exit(1);
  }

  // Import User entity dynamically
  const userEntityModule = await import('../shared/entities/user.entity');
  const User = userEntityModule.User;

  // Load database config
  const dbConfig = {
    type: 'postgres' as const,
    host: process.env.DB_HOST || 'db-server-postgres',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USER || 'dbadmin',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ecommerce',
    entities: [path.join(__dirname, '../shared/entities/**/*.entity{.ts,.js}')],
    synchronize: false,
  };

  const dataSource = new DataSource(dbConfig);

  try {
    // Initialize database connection
    await dataSource.initialize();
    console.log('✅ Connected to database');

    const userRepository = dataSource.getRepository(User);

    // Check if user exists
    let user = await userRepository.findOne({ where: { email } });

    if (user) {
      // Update existing user to admin
      const hashedPassword = await bcrypt.hash(password, 10);
      user.password = hashedPassword;
      user.isAdmin = true;
      await userRepository.save(user);
      console.log(`✅ User ${email} updated to admin with new password`);
    } else {
      // Create new admin user
      const hashedPassword = await bcrypt.hash(password, 10);
      user = userRepository.create({
        email,
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        isAdmin: true,
        isEmailVerified: true,
      });
      await userRepository.save(user);
      console.log(`✅ Admin user ${email} created successfully`);
    }

    console.log(`\n📧 Email: ${email}`);
    console.log(`🔑 Password: ${password}`);
    console.log(`\n🌐 You can now login at: http://localhost:3000/login`);
    console.log(`📊 Admin dashboard: http://localhost:3000/admin`);

    await dataSource.destroy();
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Make sure database is running');
    console.error('2. Check .env file has correct DB_HOST, DB_USER, DB_PASSWORD, DB_NAME');
    console.error('3. Try SQL method instead (see docs/ADMIN_ACCESS.md)');
    process.exit(1);
  }
}

createAdminUser();

