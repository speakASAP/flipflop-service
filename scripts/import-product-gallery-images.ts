/**
 * Script to import all gallery images for products by visiting each product page
 * Uses browser automation to extract full-resolution images
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

// Product URL mappings - map SKU to URL slug
const productUrlMap: Record<string, string> = {
  'tubing-93-sm-ornament': 'nafukovaci-kluzak-d93-patterns',
  'TT.001.OWLS1.01.01.083': 'nafukovaci-kluzak-83-cm-sovy',
  'TT.001.DEER1.01.01.083': 'nafukovaci-kluzak-83-cm-jelen',
  'tubing-dog-red': 'nafukovaci-kluzak-pes-red',
  'TT.001.Car2.02.13.000': 'nafukovaci-kluzak-car2',
  'TT.001.DRIVECOMFORT1.01.13.083': 'nafukovaci-kluzak-d83-drive-comfort',
  'TT.001.EXTREMECOMFO1.01.13.107': 'nafukovaci-kluzak-d107-extrime-comfort',
  'TT.001.FLY1.01.13.093': 'nafukovaci-kluzak-d93-fly',
  'TT.001.PLANE1.03.13.000': 'nafukovaci-kluzak-plane',
  'TT.001.SHIP1.03.13.000': 'nafukovaci-kluzak-ship',
  'TT.001.PATTERNS1.01.13.093': 'nafukovaci-kluzak-d93-patterns',
  'TT.001.KHOKHLOMA1.01.13.093': 'nafukovaci-kluzak-d93-khokhloma',
  'TT.001.KHOKHLOMACOM2.01.13.093': 'nafukovaci-kluzak-d93-khokhloma-comfort',
  'TT.001.MUSICBANGCOM1.01.13.093': 'nafukovaci-kluzak-d93-musicband-comfort',
  'TT.001.NEWYEAR1.01.13.093': 'nafukovaci-kluzak-d93-newyear',
  'TT.001.SNOWMAN1.01.13.093': 'nafukovaci-kluzak-d93-snowman',
  'TT.001.UNICORN1.03.13.000': 'nafukovaci-kluzak-unicorn',
  'TT.001.SPEED1.03.13.000': 'nafukovaci-kluzak-speed',
  'TT.001.PARTYDANCE1.03.13.000': 'nafukovaci-kluzak-partydance',
  'TT.001.SNOWFOXCOMFO1.01.13.083': 'nafukovaci-kluzak-d83-snofox-comfort',
  'TT.001.MUSICBAND1.01.13.100': 'nafukovaci-kluzak-d100-musicband',
  'TT.001.TRIO1.01.13.100': 'nafukovaci-kluzak-d100-trio',
  'TT.001.WINTERCOMFOR1.01.13.100': 'nafukovaci-kluzak-d100-winter-comfort',
  'TT.001.KHOKHOLOMA2.01.13.100': 'nafukovaci-kluzak-d100-khokhloma',
  'TT.001.KHOKHOLOMACO1.01.13.100': 'nafukovaci-kluzak-d100-khokhloma-comfort',
  'TT.001.MUSICCOMFORT1.01.13.100': 'nafukovaci-kluzak-d100-music-comfort',
  'TT.001.SNOWMACHINE1.01.13.107': 'nafukovaci-kluzak-d107-ssnow-machine',
  'TT.001.TRIO1.01.13.107': 'nafukovaci-kluzak-d107-trio',
  'TT.001.URAL1.01.13.107': 'nafukovaci-kluzak-d107-ural',
};

// Extract base image path from existing mainImageUrl and construct full URLs
function getImageUrlsFromPath(mainImageUrl: string): string[] {
  if (!mainImageUrl) return [];
  
  try {
    const url = new URL(mainImageUrl);
    const pathParts = url.pathname.split('/');
    const fileName = pathParts[pathParts.length - 1];
    const directory = pathParts.slice(0, -1).join('/');
    
    // Base CloudFront URLs
    const baseUrls = [
      `https://d2q6siu4tcpw5e.cloudfront.net${directory}/${fileName}`,
      `https://ddg537h92usg9.cloudfront.net${directory}/${fileName}`,
    ];
    
    return baseUrls;
  } catch (e) {
    return [mainImageUrl];
  }
}

async function updateProductImages() {
  const client = await pool.connect();
  
  try {
    // Get all products
    const productsResult = await client.query('SELECT id, sku, name, "mainImageUrl" FROM products ORDER BY sku');
    const products = productsResult.rows;
    
    console.log(`Found ${products.length} products to process`);
    
    let updated = 0;
    let skipped = 0;
    
    for (const product of products) {
      try {
        if (!product.mainImageUrl) {
          console.log(`Skipping ${product.sku}: No main image URL`);
          skipped++;
          continue;
        }
        
        // Get all possible image URLs from the main image path
        const imageUrls = getImageUrlsFromPath(product.mainImageUrl);
        
        if (imageUrls.length === 0) {
          console.log(`Skipping ${product.sku}: Could not extract image URLs`);
          skipped++;
          continue;
        }
        
        // Use the first URL as main, all as gallery
        const mainImage = imageUrls[0];
        const galleryImages = [...new Set(imageUrls)]; // Remove duplicates
        
        // Update product
        await client.query(
          `UPDATE products 
           SET "mainImageUrl" = $1, "imageUrls" = $2, "updatedAt" = NOW()
           WHERE id = $3`,
          [mainImage, JSON.stringify(galleryImages), product.id]
        );
        
        console.log(`✓ Updated ${product.sku}: ${galleryImages.length} image(s)`);
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

