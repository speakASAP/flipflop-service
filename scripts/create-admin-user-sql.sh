#!/bin/bash
# Script to create admin user via SQL
# Usage: ./scripts/create-admin-user-sql.sh <email>

EMAIL=$1

if [ -z "$EMAIL" ]; then
  echo "Usage: ./scripts/create-admin-user-sql.sh <email>"
  echo "Example: ./scripts/create-admin-user-sql.sh admin@flipflop.statex.cz"
  exit 1
fi

# Load .env file
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Check if user exists, if not create one
echo "Checking if user exists..."
echo "If user doesn't exist, please register first at http://localhost:3000/register"
echo ""
echo "To make existing user admin, run this SQL:"
echo ""
echo "UPDATE users SET \"isAdmin\" = true WHERE email = '$EMAIL';"
echo ""
echo "Or connect to database and run:"
echo "docker exec -it db-server-postgres psql -U dbadmin -d ecommerce -c \"UPDATE users SET \\\"isAdmin\\\" = true WHERE email = '$EMAIL';\""

