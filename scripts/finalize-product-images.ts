/**
 * Final script to ensure all products have full-resolution images
 * Maps remaining products and ensures all images are in best resolution
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

// Additional image mappings for products without images
const additionalMappings: Record<string, string> = {
  'tubing-100-cm': 'https://d2q6siu4tcpw5e.cloudfront.net/flipflop/images/PRODUCTS/SPORT%20goods/Snow%20Tubing/Tubing%20Tyanitolkai/100%20cm/Musicband%20%20100%20cm.jpg',
  'tubing-107-cm': 'https://ddg537h92usg9.cloudfront.net/flipflop/images/PRODUCTS/SPORT%20goods/Snow%20Tubing/Tubing%20Tyanitolkai/107%20cm/Extreme%20comfort%20107%20cm.jpg',
  'tubing-120-cm': 'https://ddg537h92usg9.cloudfront.net/flipflop/images/PRODUCTS/SPORT%20goods/Snow%20Tubing/Tubing%20Tyanitolkai/120%20cm/Trio%20120%20cm.jpg',
  'tubing-83-cm': 'https://ddg537h92usg9.cloudfront.net/flipflop/images/PRODUCTS/SPORT%20goods/Snow%20Tubing/Tubing%20Tyanitolkai/83%20cm/Drive%20comfort%2083%20cm.jpg',
  'tubing-93-cm': 'https://ddg537h92usg9.cloudfront.net/flipflop/images/PRODUCTS/SPORT%20goods/Snow%20Tubing/Tubing%20Tyanitolkai/93%20cm/Patterns%2093%20cm.jpg',
  'tubing-atipicky': 'https://ddg537h92usg9.cloudfront.net/flipflop/images/PRODUCTS/SPORT%20goods/Snow%20Tubing/Tubing%20Tyanitolkai/Non%20typical/auto%20yellow%20%281%29.JPG',
};

async function finalizeProductImages() {
  const client = await pool.connect();
  
  try {
    // Get all products
    const productsResult = await client.query('SELECT id, sku, name, "mainImageUrl", "imageUrls" FROM products ORDER BY sku');
    const products = productsResult.rows;
    
    console.log(`Processing ${products.length} products...`);
    
    let updated = 0;
    let skipped = 0;
    
    for (const product of products) {
      try {
        let mainImage = product.mainImageUrl;
        let imageUrls = product.imageUrls ? (typeof product.imageUrls === 'string' ? JSON.parse(product.imageUrls) : product.imageUrls) : [];
        
        // If no image, try to find one
        if (!mainImage) {
          mainImage = additionalMappings[product.sku];
        }
        
        // Ensure full resolution URL (remove thumbnail params)
        if (mainImage) {
          mainImage = mainImage.split('?')[0].replace('/__thumb', '');
          
          // If imageUrls is empty, add main image
          if (!imageUrls || imageUrls.length === 0) {
            imageUrls = [mainImage];
          } else {
            // Ensure main image is in the array and is first
            imageUrls = imageUrls.map((url: string) => url.split('?')[0].replace('/__thumb', ''));
            if (!imageUrls.includes(mainImage)) {
              imageUrls.unshift(mainImage);
            } else {
              // Move main image to first position
              imageUrls = [mainImage, ...imageUrls.filter((url: string) => url !== mainImage)];
            }
          }
          
          // Remove duplicates
          imageUrls = [...new Set(imageUrls)];
          
          // Update product
          await client.query(
            `UPDATE products 
             SET "mainImageUrl" = $1, "imageUrls" = $2, "updatedAt" = NOW()
             WHERE id = $3`,
            [mainImage, JSON.stringify(imageUrls), product.id]
          );
          
          console.log(`✓ Updated ${product.sku}: ${imageUrls.length} image(s)`);
          updated++;
        } else {
          console.log(`Skipping ${product.sku}: No image found`);
          skipped++;
        }
        
      } catch (error: any) {
        console.error(`Error processing ${product.sku}: ${error.message}`);
        skipped++;
      }
    }
    
    console.log('\n=== Final Summary ===');
    console.log(`Updated: ${updated}`);
    console.log(`Skipped: ${skipped}`);
    
    // Final verification
    const verifyResult = await client.query(`
      SELECT 
        COUNT(*) as total,
        COUNT("mainImageUrl") as with_images,
        COUNT(CASE WHEN "imageUrls" IS NOT NULL THEN 1 END) as with_gallery
      FROM products
    `);
    
    console.log('\n=== Database Status ===');
    console.log(`Total products: ${verifyResult.rows[0].total}`);
    console.log(`Products with main image: ${verifyResult.rows[0].with_images}`);
    console.log(`Products with gallery: ${verifyResult.rows[0].with_gallery}`);
    
  } finally {
    client.release();
    await pool.end();
  }
}

finalizeProductImages().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

