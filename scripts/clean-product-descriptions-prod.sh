#!/bin/bash
# Script to clean HTML from product descriptions on production database
# Usage: ./scripts/clean-product-descriptions-prod.sh

echo "=========================================="
echo "Clean HTML from Product Descriptions"
echo "=========================================="
echo ""
echo "This script will remove all HTML tags from product descriptions"
echo "in the production database, keeping only plain text."
echo ""
read -p "Are you sure you want to proceed? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "Operation cancelled."
  exit 0
fi

echo ""
echo "Connecting to production database..."
echo ""

# Run the SQL script on production
ssh statex "cd /home/statex/database-server && docker exec -i db-server-postgres psql -U dbadmin -d ecommerce" < scripts/clean-product-descriptions.sql

if [ $? -eq 0 ]; then
  echo ""
  echo "✓ HTML cleaning completed successfully!"
  echo ""
  echo "All product descriptions have been cleaned of HTML tags."
else
  echo ""
  echo "✗ Error occurred during cleanup."
  echo "Please check the error messages above."
  exit 1
fi

