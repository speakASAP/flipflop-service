#!/bin/bash
# Direct SQL method to create admin user (requires password hash from elsewhere)
# Usage: ./scripts/create-admin-sql-direct.sh <email> <hashed_password>

EMAIL=$1
HASHED_PASSWORD=$2

if [ -z "$EMAIL" ] || [ -z "$HASHED_PASSWORD" ]; then
  echo "Usage: ./scripts/create-admin-sql-direct.sh <email> <hashed_password>"
  echo ""
  echo "To get hashed password, run locally:"
  echo "  node -e \"const bcrypt = require('bcrypt'); console.log(bcrypt.hashSync('YourPassword123!', 10));\""
  echo ""
  echo "Then run:"
  echo "  ssh statex 'cd database-server && docker exec db-server-postgres psql -U dbadmin -d ecommerce -c \"INSERT INTO users (email, password, \\\"isAdmin\\\", \\\"isEmailVerified\\\") VALUES ('$EMAIL', '\$HASHED_PASSWORD', true, true) ON CONFLICT (email) DO UPDATE SET \\\"isAdmin\\\" = true;\"'"
  exit 1
fi

ssh statex "cd database-server && docker exec db-server-postgres psql -U dbadmin -d ecommerce" <<EOF
INSERT INTO users (email, password, "isAdmin", "isEmailVerified", "createdAt", "updatedAt")
VALUES ('$EMAIL', '$HASHED_PASSWORD', true, true, NOW(), NOW())
ON CONFLICT (email) 
DO UPDATE SET 
  "isAdmin" = true,
  "isEmailVerified" = true,
  "updatedAt" = NOW();
EOF

echo "Admin user created/updated: $EMAIL"

