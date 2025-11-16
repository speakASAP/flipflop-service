/**
 * Script to import product images using browser automation
 * Uses the image URLs from the listing page and converts them to full resolution
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

// Image URLs extracted from the listing page
const imageMappings: Record<string, string> = {
  'TT.001.OWLS1.01.01.083': 'https://ddg537h92usg9.cloudfront.net/flipflop/images/PRODUCTS/SPORT%20goods/Snow%20Tubing/Tubing%20Tyanitolkai/83%20cm/Owls%2083%20cm.JPG',
  'TT.001.DEER1.01.01.083': 'https://d2q6siu4tcpw5e.cloudfront.net/flipflop/images/PRODUCTS/SPORT%20goods/Snow%20Tubing/Tubing%20Tyanitolkai/83%20cm/Deer%2083%20cm.jpg',
  'tubing-dog-red': 'https://ddg537h92usg9.cloudfront.net/flipflop/images/PRODUCTS/SPORT%20goods/Snow%20Tubing/Tubing%20Tyanitolkai/Non%20typical/dog%20%281%29.JPG',
  'TT.001.Car2.02.13.000': 'https://ddg537h92usg9.cloudfront.net/flipflop/images/PRODUCTS/SPORT%20goods/Snow%20Tubing/Tubing%20Tyanitolkai/Non%20typical/auto%20yellow%20%281%29.JPG',
  'TT.001.DRIVECOMFORT1.01.13.083': 'https://ddg537h92usg9.cloudfront.net/flipflop/images/PRODUCTS/SPORT%20goods/Snow%20Tubing/Tubing%20Tyanitolkai/83%20cm/Drive%20comfort%2083%20cm.jpg',
  'TT.001.EXTREMECOMFO1.01.13.107': 'https://d2q6siu4tcpw5e.cloudfront.net/flipflop/images/PRODUCTS/SPORT%20goods/Snow%20Tubing/Tubing%20Tyanitolkai/107%20cm/Extreme%20comfort%20107%20cm.jpg',
  'TT.001.FLY1.01.13.093': 'https://d2q6siu4tcpw5e.cloudfront.net/flipflop/images/PRODUCTS/SPORT%20goods/Snow%20Tubing/Tubing%20Tyanitolkai/93%20cm/Fly%2093%20cm.jpg',
  'TT.001.PLANE1.03.13.000': 'https://d2q6siu4tcpw5e.cloudfront.net/flipflop/images/PRODUCTS/SPORT%20goods/Snow%20Tubing/Tubing%20Tyanitolkai/Non%20typical/plane%20%281%29.JPG',
  'TT.001.SHIP1.03.13.000': 'https://ddg537h92usg9.cloudfront.net/flipflop/images/PRODUCTS/SPORT%20goods/Snow%20Tubing/Tubing%20Tyanitolkai/Non%20typical/ship%20%281%29.JPG',
  'TT.001.PATTERNS1.01.13.093': 'https://ddg537h92usg9.cloudfront.net/flipflop/images/PRODUCTS/SPORT%20goods/Snow%20Tubing/Tubing%20Tyanitolkai/93%20cm/Patterns%2093%20cm.jpg',
  'tubing-93-sm-ornament': 'https://ddg537h92usg9.cloudfront.net/flipflop/images/PRODUCTS/SPORT%20goods/Snow%20Tubing/Tubing%20Tyanitolkai/93%20cm/Patterns%2093%20cm.jpg',
  'TT.001.KHOKHLOMA1.01.13.093': 'https://d2q6siu4tcpw5e.cloudfront.net/flipflop/images/PRODUCTS/SPORT%20goods/Snow%20Tubing/Tubing%20Tyanitolkai/93%20cm/Khokhloma%2093%20cm.jpg',
  'TT.001.KHOKHLOMACOM2.01.13.093': 'https://d2q6siu4tcpw5e.cloudfront.net/flipflop/images/PRODUCTS/SPORT%20goods/Snow%20Tubing/Tubing%20Tyanitolkai/93%20cm/Khokhloma%20comfort%2093%20cm.jpg',
  'TT.001.MUSICBANGCOM1.01.13.093': 'https://d2q6siu4tcpw5e.cloudfront.net/flipflop/images/PRODUCTS/SPORT%20goods/Snow%20Tubing/Tubing%20Tyanitolkai/93%20cm/Musicband%20comfort%2093%20cm.jpg',
  'TT.001.NEWYEAR1.01.13.093': 'https://d2q6siu4tcpw5e.cloudfront.net/flipflop/images/PRODUCTS/SPORT%20goods/Snow%20Tubing/Tubing%20Tyanitolkai/93%20cm/New%20Year%2093%20cm.jpg',
  'TT.001.SNOWMAN1.01.13.093': 'https://d2q6siu4tcpw5e.cloudfront.net/flipflop/images/PRODUCTS/SPORT%20goods/Snow%20Tubing/Tubing%20Tyanitolkai/93%20cm/Snowman%2093%20cm.jpg',
  'TT.001.UNICORN1.03.13.000': 'https://d2q6siu4tcpw5e.cloudfront.net/flipflop/images/PRODUCTS/SPORT%20goods/Snow%20Tubing/Tubing%20Tyanitolkai/Non%20typical/Unicorn.jpg',
  'TT.001.SPEED1.03.13.000': 'https://d2q6siu4tcpw5e.cloudfront.net/flipflop/images/PRODUCTS/SPORT%20goods/Snow%20Tubing/Tubing%20Tyanitolkai/Non%20typical/Speed1.jpg',
  'TT.001.PARTYDANCE1.03.13.000': 'https://ddg537h92usg9.cloudfront.net/flipflop/images/PRODUCTS/SPORT%20goods/Snow%20Tubing/Tubing%20Tyanitolkai/Non%20typical/party%20dance.jpg',
  'TT.001.SNOWFOXCOMFO1.01.13.083': 'https://ddg537h92usg9.cloudfront.net/flipflop/images/PRODUCTS/SPORT%20goods/Snow%20Tubing/Tubing%20Tyanitolkai/83%20cm/Snowfox%20comfort%2083%20cm.jpg',
  'TT.001.MUSICBAND1.01.13.100': 'https://ddg537h92usg9.cloudfront.net/flipflop/images/PRODUCTS/SPORT%20goods/Snow%20Tubing/Tubing%20Tyanitolkai/100%20cm/Musicband%20%20100%20cm.jpg',
  'TT.001.TRIO1.01.13.100': 'https://ddg537h92usg9.cloudfront.net/flipflop/images/PRODUCTS/SPORT%20goods/Snow%20Tubing/Tubing%20Tyanitolkai/100%20cm/Trio%20100%20cm.jpg',
  'TT.001.WINTERCOMFOR1.01.13.100': 'https://d2q6siu4tcpw5e.cloudfront.net/flipflop/images/PRODUCTS/SPORT%20goods/Snow%20Tubing/Tubing%20Tyanitolkai/100%20cm/Winter%20comfort%20100%20cm.jpg',
  'TT.001.KHOKHOLOMA2.01.13.100': 'https://ddg537h92usg9.cloudfront.net/flipflop/images/PRODUCTS/SPORT%20goods/Snow%20Tubing/Tubing%20Tyanitolkai/100%20cm/Khokhloma%20100%20cm.jpg',
  'TT.001.KHOKHOLOMACO1.01.13.100': 'https://ddg537h92usg9.cloudfront.net/flipflop/images/PRODUCTS/SPORT%20goods/Snow%20Tubing/Tubing%20Tyanitolkai/100%20cm/Khokhloma%20comfort%20100%20cm.jpg',
  'TT.001.MUSICCOMFORT1.01.13.100': 'https://d2q6siu4tcpw5e.cloudfront.net/flipflop/images/PRODUCTS/SPORT%20goods/Snow%20Tubing/Tubing%20Tyanitolkai/100%20cm/Music%20comfort%20100%20cm.jpg',
  'TT.001.SNOWMACHINE1.01.13.107': 'https://ddg537h92usg9.cloudfront.net/flipflop/images/PRODUCTS/SPORT%20goods/Snow%20Tubing/Tubing%20Tyanitolkai/107%20cm/Snow%20machine%20107%20cm.jpg',
  'TT.001.TRIO1.01.13.107': 'https://ddg537h92usg9.cloudfront.net/flipflop/images/PRODUCTS/SPORT%20goods/Snow%20Tubing/Tubing%20Tyanitolkai/107%20cm/Trio%20107%20cm.jpg',
  'TT.001.URAL1.01.13.107': 'https://ddg537h92usg9.cloudfront.net/flipflop/images/PRODUCTS/SPORT%20goods/Snow%20Tubing/Tubing%20Tyanitolkai/107%20cm/Ural%20107%20cm.jpg',
};

// Convert thumbnail URL to full resolution
function getFullImageUrl(thumbnailUrl: string): string {
  if (!thumbnailUrl) return '';
  
  // Remove thumbnail parameters
  const url = thumbnailUrl.replace('/__thumb', '').split('?')[0];
  return url;
}

async function updateProductImages() {
  const client = await pool.connect();
  
  try {
    // Get all products
    const productsResult = await client.query('SELECT id, sku, name, "mainImageUrl" FROM products ORDER BY sku');
    const products = productsResult.rows;
    
    console.log(`Found ${products.length} products to update`);
    
    let updated = 0;
    let skipped = 0;
    
    for (const product of products) {
      // Check if we have a direct mapping
      let imageUrl = imageMappings[product.sku];
      
      // If no direct mapping, try to extract from existing mainImageUrl
      if (!imageUrl && product.mainImageUrl) {
        // Convert relative path to CloudFront URL
        const relativePath = product.mainImageUrl;
        if (relativePath.startsWith('/flipflop/images/')) {
          // Try both CloudFront domains
          imageUrl = `https://d2q6siu4tcpw5e.cloudfront.net${relativePath}`;
        }
      }
      
      if (!imageUrl) {
        console.log(`Skipping ${product.sku}: No image URL found`);
        skipped++;
        continue;
      }
      
      // Ensure it's a full resolution URL (remove thumbnail params)
      const fullUrl = getFullImageUrl(imageUrl);
      
      if (!fullUrl) {
        console.log(`Skipping ${product.sku}: Invalid image URL`);
        skipped++;
        continue;
      }
      
      // Update product in database
      await client.query(
        `UPDATE products 
         SET "mainImageUrl" = $1, "imageUrls" = $2, "updatedAt" = NOW()
         WHERE id = $3`,
        [fullUrl, JSON.stringify([fullUrl]), product.id]
      );
      
      console.log(`✓ Updated ${product.sku}: ${fullUrl}`);
      updated++;
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

