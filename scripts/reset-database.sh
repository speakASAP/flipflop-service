#!/bin/bash

# Database Reset Script
# Drops and recreates the flipflop database on production server

set -e

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Database connection parameters
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_USER=${DB_USER:-dbadmin}
DB_NAME=${DB_NAME:-flipflop}

echo "Resetting database: $DB_NAME on $DB_HOST:$DB_PORT"

# Check if password is set
if [ -z "$DB_PASSWORD" ]; then
  echo "Error: DB_PASSWORD not set in .env"
  exit 1
fi

# Export password for psql
export PGPASSWORD=$DB_PASSWORD

# Drop and recreate database
echo "Dropping database if exists..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;" || true

echo "Creating new database..."
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d postgres -c "CREATE DATABASE $DB_NAME;"

echo "Database $DB_NAME created successfully"

# Generate Prisma Client
echo "Generating Prisma Client..."
npx prisma generate

# Create and apply initial migration
echo "Creating and applying Prisma migrations..."
npx prisma migrate dev --name init

echo "Database reset complete!"

