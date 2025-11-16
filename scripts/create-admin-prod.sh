#!/bin/bash
# Script to create admin user on production database
# Usage: ssh statex "cd database-server && bash -s" < scripts/create-admin-prod.sh <email> <password>

EMAIL=$1
PASSWORD=$2

if [ -z "$EMAIL" ] || [ -z "$PASSWORD" ]; then
  echo "Usage: ssh statex 'cd database-server && bash -s' < scripts/create-admin-prod.sh <email> <password>"
  echo "Example: ssh statex 'cd database-server && bash -s' < scripts/create-admin-prod.sh admin@flipflop.statex.cz 'SecurePass123!'"
  exit 1
fi

# Hash password using Node.js (if available) or Python
if command -v node &> /dev/null; then
  HASHED_PASSWORD=$(node -e "const bcrypt = require('bcrypt'); console.log(bcrypt.hashSync('$PASSWORD', 10));")
elif command -v python3 &> /dev/null; then
  HASHED_PASSWORD=$(python3 -c "import bcrypt; print(bcrypt.hashpw('$PASSWORD'.encode('utf-8'), bcrypt.gensalt()).decode('utf-8'))")
else
  echo "Error: Node.js or Python3 with bcrypt required"
  echo "Please install bcrypt: npm install bcrypt or pip install bcrypt"
  exit 1
fi

# Create user via SQL
docker exec db-server-postgres psql -U dbadmin -d ecommerce <<EOF
INSERT INTO users (email, password, "isAdmin", "isEmailVerified", "createdAt", "updatedAt")
VALUES ('$EMAIL', '$HASHED_PASSWORD', true, true, NOW(), NOW())
ON CONFLICT (email) 
DO UPDATE SET 
  "isAdmin" = true,
  "isEmailVerified" = true,
  "updatedAt" = NOW();
EOF

echo "Admin user created/updated: $EMAIL"
echo "You can now login at: https://flipflop.statex.cz/login"

