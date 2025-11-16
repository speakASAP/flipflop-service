/**
 * Simple CSV import using pg client directly (no TypeORM)
 * Handles multiline CSV fields properly
 */

import * as fs from 'fs';
import { Pool } from 'pg';
import { config } from 'dotenv';
import * as csv from 'csv-parse/sync';

config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5433', 10),
  user: process.env.DB_USER || 'dbadmin',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ecommerce',
  max: 20,
});

// Field mapping
const fieldMapping: Record<string, string> = {
  sku: 'code',
  name: 'name:cs',
  shortDescription: 'shortDescription:cs',
  description: 'description:cs',
  price: 'purchasePriceGrossPrice',
  compareAtPrice: 'purchasePrice',
  brand: 'brand',
  manufacturer: 'manufacturer',
  stockQuantity: 'availability',
  isActive: 'active',
  mainImageUrl: 'bigImages',
  categories: 'categoriesSingle',
  seoTitle: 'seoTitle:cs',
  seoDescription: 'seoDescription:cs',
  seoKeywords: 'seoKeywords:cs',
};

function extractPrice(priceStr: string): number | null {
  if (!priceStr || priceStr.trim() === '') return null;
  const cleaned = priceStr.toString().replace(/[^\d.,]/g, '').replace(',', '.');
  const price = parseFloat(cleaned);
  return isNaN(price) ? null : price;
}

function calculateSellingPrice(purchasePrice: number, profitMargin: number = 30): number {
  return Math.round(purchasePrice * (1 + profitMargin / 100) * 100) / 100;
}

/**
 * Strip HTML tags and decode HTML entities
 * Returns plain text only
 */
function stripHtml(html: string | null | undefined): string {
  if (!html || html.trim() === '') return '';
  
  let text = html;
  
  // Remove HTML comments
  text = text.replace(/<!--[\s\S]*?-->/g, '');
  
  // Remove script and style tags with their content
  text = text.replace(/<script[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[\s\S]*?<\/style>/gi, '');
  
  // Replace common HTML entities
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&apos;/g, "'");
  
  // Remove all HTML tags
  text = text.replace(/<[^>]+>/g, '');
  
  // Decode remaining HTML entities (basic ones)
  text = text.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(dec));
  text = text.replace(/&#x([a-f\d]+);/gi, (match, hex) => String.fromCharCode(parseInt(hex, 16)));
  
  // Clean up whitespace
  text = text.replace(/\s+/g, ' ').trim();
  
  return text;
}

async function findOrCreateCategory(client: any, categoryName: string): Promise<string | null> {
  if (!categoryName || categoryName.trim() === '') return null;
  
  const name = categoryName.trim();
  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  
  // Find existing
  const findResult = await client.query('SELECT id FROM categories WHERE name = $1', [name]);
  if (findResult.rows.length > 0) {
    return findResult.rows[0].id;
  }
  
  // Create new
  const insertResult = await client.query(
    'INSERT INTO categories (name, slug, "isActive", "createdAt", "updatedAt") VALUES ($1, $2, true, NOW(), NOW()) RETURNING id',
    [name, slug]
  );
  
  return insertResult.rows[0].id;
}

async function importProducts() {
  const csvFilePath = process.argv[2];
  
  if (!csvFilePath) {
    console.error('Usage: ts-node scripts/import-products-simple.ts <path-to-csv-file>');
    process.exit(1);
  }
  
  if (!fs.existsSync(csvFilePath)) {
    console.error(`CSV file not found: ${csvFilePath}`);
    process.exit(1);
  }
  
  console.log('Reading CSV file...');
  const csvContent = fs.readFileSync(csvFilePath, 'utf-8');
  
  // Parse CSV with proper multiline handling
  const records = csv.parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    delimiter: ';',
    relax_column_count: true,
    relax_quotes: true,
  });
  
  console.log(`Found ${records.length} product rows`);
  
  const client = await pool.connect();
  
  try {
    let success = 0;
    let failed = 0;
    let skipped = 0;
    
    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const rowNumber = i + 2;
      
      try {
        const sku = row[fieldMapping.sku]?.trim() || '';
        const name = row[fieldMapping.name]?.trim() || '';
        const purchasePriceStr = row[fieldMapping.price] || '';
        const purchasePrice = extractPrice(purchasePriceStr);
        
        // Skip if missing SKU or name, but allow price to be 0 (will be set to minimum)
        if (!sku || !name) {
          skipped++;
          if (i < 10) console.log(`Row ${rowNumber}: Skipping - missing SKU or name (sku: ${sku}, name: ${name})`);
          continue;
        }
        
        // If price is null or 0, set a default minimum price
        const finalPrice = purchasePrice === null || purchasePrice === 0 ? 100 : purchasePrice;
        
        // Check if exists
        const existing = await client.query('SELECT id FROM products WHERE sku = $1', [sku]);
        if (existing.rows.length > 0) {
          skipped++;
          if (i < 10) console.log(`Row ${rowNumber}: Product ${sku} already exists`);
          continue;
        }
        
        const sellingPrice = calculateSellingPrice(finalPrice, 30);
        const comparePrice = extractPrice(row[fieldMapping.compareAtPrice] || '') || finalPrice;
        const stockQty = parseInt(row[fieldMapping.stockQuantity] || '0', 10) || 0;
        const isActive = row[fieldMapping.isActive]?.toString() === '1' || 
                        row[fieldMapping.isActive]?.toString().toLowerCase() === 'true';
        
        // Insert product
        const productResult = await client.query(
          `INSERT INTO products (
            sku, name, "shortDescription", description, price, "compareAtPrice",
            brand, manufacturer, "stockQuantity", "trackInventory", "isActive",
            "mainImageUrl", "seoTitle", "seoDescription", "seoKeywords",
            "createdAt", "updatedAt"
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())
          RETURNING id`,
          [
            sku,
            name,
            stripHtml(row[fieldMapping.shortDescription] || name.substring(0, 200)),
            stripHtml(row[fieldMapping.description] || ''),
            sellingPrice,
            comparePrice,
            row[fieldMapping.brand]?.trim() || null,
            row[fieldMapping.manufacturer]?.trim() || null,
            stockQty,
            stockQty > 0,
            isActive,
            row[fieldMapping.mainImageUrl]?.trim() || null,
            (row[fieldMapping.seoTitle] || name).trim(),
            stripHtml(row[fieldMapping.seoDescription] || ''),
            (row[fieldMapping.seoKeywords] || '').trim(),
          ]
        );
        
        const productId = productResult.rows[0].id;
        
        // Handle categories
        if (row[fieldMapping.categories]) {
          const categoryNames = row[fieldMapping.categories].split(',').map((c: string) => c.trim()).filter((c: string) => c);
          for (const catName of categoryNames) {
            const categoryId = await findOrCreateCategory(client, catName);
            if (categoryId) {
              await client.query(
                'INSERT INTO product_categories ("productId", "categoryId") VALUES ($1, $2) ON CONFLICT DO NOTHING',
                [productId, categoryId]
              );
            }
          }
        }
        
        success++;
        if (success % 100 === 0) {
          console.log(`Imported ${success} products...`);
        }
        
      } catch (error: any) {
        failed++;
        if (failed <= 10) {
          console.error(`Row ${rowNumber}: Error - ${error.message}`);
        }
      }
    }
    
    console.log('\n=== Import Summary ===');
    console.log(`Success: ${success}`);
    console.log(`Failed: ${failed}`);
    console.log(`Skipped: ${skipped}`);
    
  } finally {
    client.release();
    await pool.end();
  }
}

importProducts().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

