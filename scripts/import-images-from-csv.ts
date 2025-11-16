/**
 * Script to import product images from CSV file
 * CSV contains product codes and image URLs
 */

import { Pool } from 'pg';
import { config } from 'dotenv';
import * as fs from 'fs';
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

// Parse image URLs from CSV field (can be comma-separated)
function parseImageUrls(imageField: string): string[] {
  if (!imageField || imageField.trim() === '') return [];
  
  // Split by comma and clean up
  return imageField
    .split(',')
    .map(url => url.trim())
    .filter(url => url.length > 0 && !url.includes('no-product-image'));
}

// Convert relative paths to full CloudFront URLs
function normalizeImageUrl(url: string): string {
  if (!url) return '';
  
  // If already a full URL, return as is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    // Remove thumbnail parameters
    return url.split('?')[0].replace('/__thumb', '');
  }
  
  // If relative path, convert to CloudFront URL
  if (url.startsWith('/flipflop/images/')) {
    const encodedPath = encodeURI(url);
    return `https://d2q6siu4tcpw5e.cloudfront.net${encodedPath}`;
  }
  
  return url;
}

async function importImagesFromCsv() {
  const csvFilePath = process.argv[2];
  
  if (!csvFilePath) {
    console.error('Usage: ts-node scripts/import-images-from-csv.ts <path-to-csv-file>');
    process.exit(1);
  }
  
  if (!fs.existsSync(csvFilePath)) {
    console.error(`CSV file not found: ${csvFilePath}`);
    process.exit(1);
  }
  
  console.log('Reading CSV file...');
  const csvContent = fs.readFileSync(csvFilePath, 'utf-8');
  
  // Parse CSV
  const records = csv.parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    delimiter: ';',
    relax_column_count: true,
    relax_quotes: true,
    quote: '"',
    escape: '"',
    bom: true,
  });
  
  console.log(`Found ${records.length} product records`);
  
  const client = await pool.connect();
  
  try {
    let updated = 0;
    let skipped = 0;
    let notFound = 0;
    
    for (const record of records) {
      try {
        const sku = record.code?.trim();
        if (!sku) {
          skipped++;
          continue;
        }
        
        // Get image URLs from CSV
        const bigImages = parseImageUrls(record['bigImages'] || '');
        const galleryImages = parseImageUrls(record['galleryImages'] || '');
        
        // Combine all images (bigImages first, then gallery)
        const allImages = [
          ...bigImages.map(normalizeImageUrl),
          ...galleryImages.map(normalizeImageUrl),
        ].filter(url => url.length > 0);
        
        // Remove duplicates
        const uniqueImages = [...new Set(allImages)];
        
        if (uniqueImages.length === 0) {
          console.log(`Skipping ${sku}: No images found`);
          skipped++;
          continue;
        }
        
        // Find product by SKU
        const productResult = await client.query('SELECT id FROM products WHERE sku = $1', [sku]);
        
        if (productResult.rows.length === 0) {
          console.log(`Product not found: ${sku}`);
          notFound++;
          continue;
        }
        
        const productId = productResult.rows[0].id;
        const mainImage = uniqueImages[0];
        
        // Update product
        await client.query(
          `UPDATE products 
           SET "mainImageUrl" = $1, "imageUrls" = $2, "updatedAt" = NOW()
           WHERE id = $3`,
          [mainImage, JSON.stringify(uniqueImages), productId]
        );
        
        console.log(`✓ Updated ${sku}: ${uniqueImages.length} image(s)`);
        updated++;
        
      } catch (error: any) {
        console.error(`Error processing record: ${error.message}`);
        skipped++;
      }
    }
    
    console.log('\n=== Import Summary ===');
    console.log(`Updated: ${updated}`);
    console.log(`Skipped: ${skipped}`);
    console.log(`Not found: ${notFound}`);
    
    // Final verification
    const verifyResult = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT("mainImageUrl") as with_images,
        COUNT(CASE WHEN "imageUrls" IS NOT NULL AND jsonb_array_length("imageUrls") > 1 THEN 1 END) as with_multiple_images
      FROM products
    `);
    
    console.log('\n=== Database Status ===');
    console.log(`Total products: ${verifyResult.rows[0].total}`);
    console.log(`Products with main image: ${verifyResult.rows[0].with_images}`);
    console.log(`Products with multiple images: ${verifyResult.rows[0].with_multiple_images}`);
    
  } finally {
    client.release();
    await pool.end();
  }
}

importImagesFromCsv().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

