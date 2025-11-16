-- SQL script to create or update admin user
-- Usage: Run this in your PostgreSQL database

-- Option 1: Create new admin user (replace email and password)
-- Password will be hashed, but for quick setup you can use this:
-- Default password: admin123 (you should change it after first login)

-- First, register a user normally through the UI, then run:
UPDATE users SET "isAdmin" = true WHERE email = 'your-email@example.com';

-- Option 2: Create admin user directly (requires bcrypt hash)
-- You'll need to generate a bcrypt hash for the password first
-- You can use: node -e "console.log(require('bcrypt').hashSync('admin123', 10))"
-- Then insert:
-- INSERT INTO users (id, email, password, "firstName", "lastName", "isAdmin", "isEmailVerified", "createdAt", "updatedAt")
-- VALUES (
--   gen_random_uuid(),
--   'admin@flipflop.statex.cz',
--   '$2b$10$YOUR_BCRYPT_HASH_HERE',
--   'Admin',
--   'User',
--   true,
--   true,
--   CURRENT_TIMESTAMP,
--   CURRENT_TIMESTAMP
-- );

-- Quick setup: If you already have a user, just make them admin:
-- UPDATE users SET "isAdmin" = true WHERE email = 'your-existing-email@example.com';

