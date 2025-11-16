/**
 * Script to import full-resolution product images from flipflop.cz
 * Visits each product page to get all images including gallery
 */

import { Pool } from 'pg';
import { config } from 'dotenv';

config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5433', 10),
  user: process.env.DB_USER || 'dbadmin',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ecommerce',
  max: 20,
});

// Base image URLs from existing mainImageUrl - convert to CloudFront full resolution
async function updateProductImages() {
  const client = await pool.connect();
  
  try {
    // Get all products with their existing image URLs
    const productsResult = await client.query(`
      SELECT id, sku, name, "mainImageUrl" 
      FROM products 
      WHERE "mainImageUrl" IS NOT NULL 
      ORDER BY sku
    `);
    const products = productsResult.rows;
    
    console.log(`Found ${products.length} products with existing image URLs`);
    
    let updated = 0;
    let skipped = 0;
    
    for (const product of products) {
      try {
        let imageUrl = product.mainImageUrl;
        
        // Convert relative paths to CloudFront URLs
        if (imageUrl.startsWith('/flipflop/images/')) {
          // Try both CloudFront domains
          const path = imageUrl;
          // URL encode the path properly
          const encodedPath = encodeURI(path);
          imageUrl = `https://d2q6siu4tcpw5e.cloudfront.net${encodedPath}`;
        }
        
        // Remove thumbnail parameters if present
        imageUrl = imageUrl.split('?')[0].replace('/__thumb', '');
        
        if (!imageUrl || imageUrl.includes('no-product-image')) {
          console.log(`Skipping ${product.sku}: Invalid or placeholder image`);
          skipped++;
          continue;
        }
        
        // Update product with full resolution URL
        await client.query(
          `UPDATE products 
           SET "mainImageUrl" = $1, "imageUrls" = $2, "updatedAt" = NOW()
           WHERE id = $3`,
          [imageUrl, JSON.stringify([imageUrl]), product.id]
        );
        
        console.log(`✓ Updated ${product.sku}`);
        updated++;
        
      } catch (error: any) {
        console.error(`Error processing ${product.sku}: ${error.message}`);
        skipped++;
      }
    }
    
    console.log('\n=== Update Summary ===');
    console.log(`Updated: ${updated}`);
    console.log(`Skipped: ${skipped}`);
    
  } finally {
    client.release();
    await pool.end();
  }
}

updateProductImages().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

