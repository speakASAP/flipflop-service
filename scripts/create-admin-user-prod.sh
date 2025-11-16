#!/bin/bash
# Script to create admin user on production database
# Usage: ./scripts/create-admin-user-prod.sh <email>

EMAIL=$1

if [ -z "$EMAIL" ]; then
  echo "Usage: ./scripts/create-admin-user-prod.sh <email>"
  echo "Example: ./scripts/create-admin-user-prod.sh admin@flipflop.statex.cz"
  exit 1
fi

echo "=========================================="
echo "Create Admin User on Production Database"
echo "=========================================="
echo ""
echo "Method 1: Via SSH to production server"
echo "----------------------------------------"
echo "ssh statex"
echo "cd /home/statex/database-server"
echo "docker exec -it db-server-postgres psql -U dbadmin -d ecommerce"
echo ""
echo "Then run this SQL:"
echo "UPDATE users SET \"isAdmin\" = true WHERE email = '$EMAIL';"
echo ""
echo ""
echo "Method 2: Direct SQL (if you have database access)"
echo "---------------------------------------------------"
echo "Connect to database with:"
echo "  Host: db-server-postgres (or actual IP)"
echo "  Port: 5432"
echo "  User: dbadmin"
echo "  Database: ecommerce"
echo ""
echo "Then run:"
echo "UPDATE users SET \"isAdmin\" = true WHERE email = '$EMAIL';"
echo ""
echo ""
echo "Method 3: If user doesn't exist yet"
echo "------------------------------------"
echo "1. Register at https://flipflop.statex.cz/register"
echo "2. Then run the UPDATE SQL above"
echo ""

