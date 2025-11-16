/**
 * Script to import product images from XML file
 * XML contains product codes and image paths (bigImage and galleryImage)
 */

import { Pool } from 'pg';
import { config } from 'dotenv';
import * as fs from 'fs';
import { parseString } from 'xml2js';

config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5433', 10),
  user: process.env.DB_USER || 'dbadmin',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ecommerce',
  max: 20,
});

// Convert relative path to full CloudFront URL
function normalizeImageUrl(path: string): string {
  if (!path) return '';
  
  // If already a full URL, return as is (remove thumbnail params)
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path.split('?')[0].replace('/__thumb', '');
  }
  
  // If relative path, convert to CloudFront URL
  if (path.startsWith('/flipflop/images/')) {
    const encodedPath = encodeURI(path);
    // Try both CloudFront domains
    return `https://d2q6siu4tcpw5e.cloudfront.net${encodedPath}`;
  }
  
  return path;
}

// Parse XML and extract product images
function parseProductImages(xmlData: any): Map<string, { mainImage: string; galleryImages: string[] }> {
  const imageMap = new Map<string, { mainImage: string; galleryImages: string[] }>();
  
  if (!xmlData.importProducts || !xmlData.importProducts.product) {
    return imageMap;
  }
  
  const products = Array.isArray(xmlData.importProducts.product)
    ? xmlData.importProducts.product
    : [xmlData.importProducts.product];
  
  for (const product of products) {
    const code = product.$.code;
    if (!code) continue;
    
    const mainImages: string[] = [];
    const galleryImages: string[] = [];
    
    if (product.images && product.images[0] && product.images[0].image) {
      const images = Array.isArray(product.images[0].image)
        ? product.images[0].image
        : [product.images[0].image];
      
      // Sort by order attribute
      const sortedImages = images.sort((a: any, b: any) => {
        const orderA = parseInt(a.$.order || '0', 10);
        const orderB = parseInt(b.$.order || '0', 10);
        return orderA - orderB;
      });
      
      for (const image of sortedImages) {
        const imagePath = image.path && image.path[0] ? image.path[0] : '';
        const imageType = image.$.type || '';
        
        if (imagePath) {
          const fullUrl = normalizeImageUrl(imagePath);
          if (fullUrl) {
            if (imageType === 'bigImage') {
              mainImages.push(fullUrl);
            } else if (imageType === 'galleryImage') {
              galleryImages.push(fullUrl);
            }
          }
        }
      }
    }
    
    // Use first bigImage as main, or first gallery image if no bigImage
    const mainImage = mainImages.length > 0 ? mainImages[0] : (galleryImages.length > 0 ? galleryImages[0] : '');
    
    // Combine all images (main first, then gallery, removing duplicates)
    const allImages = [...new Set([mainImage, ...mainImages.slice(1), ...galleryImages])].filter(url => url.length > 0);
    
    if (mainImage) {
      imageMap.set(code, {
        mainImage,
        galleryImages: allImages,
      });
    }
  }
  
  return imageMap;
}

async function importImagesFromXml() {
  const xmlFilePath = process.argv[2];
  
  if (!xmlFilePath) {
    console.error('Usage: ts-node scripts/import-images-from-xml.ts <path-to-xml-file>');
    process.exit(1);
  }
  
  if (!fs.existsSync(xmlFilePath)) {
    console.error(`XML file not found: ${xmlFilePath}`);
    process.exit(1);
  }
  
  console.log('Reading XML file...');
  const xmlContent = fs.readFileSync(xmlFilePath, 'utf-8');
  
  // Parse XML
  parseString(xmlContent, (err, result) => {
    if (err) {
      console.error('Error parsing XML:', err);
      process.exit(1);
    }
    
    // Extract product images
    const imageMap = parseProductImages(result);
    console.log(`Found images for ${imageMap.size} products`);
    
    // Update database
    updateDatabase(imageMap).catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
  });
}

async function updateDatabase(imageMap: Map<string, { mainImage: string; galleryImages: string[] }>) {
  const client = await pool.connect();
  
  try {
    let updated = 0;
    let skipped = 0;
    let notFound = 0;
    
    for (const [sku, images] of imageMap.entries()) {
      try {
        // Find product by SKU
        const productResult = await client.query('SELECT id FROM products WHERE sku = $1', [sku]);
        
        if (productResult.rows.length === 0) {
          console.log(`Product not found: ${sku}`);
          notFound++;
          continue;
        }
        
        const productId = productResult.rows[0].id;
        
        // Update product with images
        await client.query(
          `UPDATE products 
           SET "mainImageUrl" = $1, "imageUrls" = $2, "updatedAt" = NOW()
           WHERE id = $3`,
          [images.mainImage, JSON.stringify(images.galleryImages), productId]
        );
        
        console.log(`✓ Updated ${sku}: ${images.galleryImages.length} image(s)`);
        updated++;
        
      } catch (error: any) {
        console.error(`Error processing ${sku}: ${error.message}`);
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
        COUNT(CASE WHEN "imageUrls" IS NOT NULL AND jsonb_array_length("imageUrls") > 1 THEN 1 END) as with_multiple_images,
        AVG(jsonb_array_length("imageUrls")) as avg_images_per_product
      FROM products
    `);
    
    console.log('\n=== Database Status ===');
    console.log(`Total products: ${verifyResult.rows[0].total}`);
    console.log(`Products with main image: ${verifyResult.rows[0].with_images}`);
    console.log(`Products with multiple images: ${verifyResult.rows[0].with_multiple_images}`);
    console.log(`Average images per product: ${parseFloat(verifyResult.rows[0].avg_images_per_product || '0').toFixed(2)}`);
    
  } finally {
    client.release();
    await pool.end();
  }
}

importImagesFromXml();

