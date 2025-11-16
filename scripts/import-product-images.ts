/**
 * Script to import product images from flipflop.cz
 * Visits each product page and extracts full-resolution images
 */

import { Pool } from 'pg';
import { config } from 'dotenv';
import * as https from 'https';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { URL } from 'url';

config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5433', 10),
  user: process.env.DB_USER || 'dbadmin',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ecommerce',
  max: 20,
});

// Map product names/SKUs to URL slugs
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

// Extract base image URL from CloudFront thumbnail URL
function getFullImageUrl(thumbnailUrl: string): string {
  if (!thumbnailUrl) return '';
  
  try {
    const url = new URL(thumbnailUrl);
    // Remove thumbnail parameters and get base path
    const basePath = url.pathname.replace('/__thumb', '');
    // Remove query parameters for full resolution
    return `https://${url.hostname}${basePath}`;
  } catch (e) {
    // If it's already a relative path, convert to full URL
    if (thumbnailUrl.startsWith('/')) {
      return `https://www.flipflop.cz${thumbnailUrl}`;
    }
    return thumbnailUrl;
  }
}

// Fetch HTML from URL
function fetchHtml(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const client = parsedUrl.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    };
    
    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve(data);
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.end();
  });
}

// Extract main image from product page HTML
function extractMainImage(html: string): string {
  // Try to find main product image
  const patterns = [
    /<img[^>]*class="[^"]*product[^"]*image[^"]*"[^>]*src="([^"]+)"/i,
    /<img[^>]*id="[^"]*main[^"]*image[^"]*"[^>]*src="([^"]+)"/i,
    /<img[^>]*data-src="([^"]+)"[^>]*class="[^"]*product/i,
    /<img[^>]*src="([^"]*\/PRODUCTS\/[^"]+\.(jpg|jpeg|png|webp))"/i,
  ];
  
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      return getFullImageUrl(match[1]);
    }
  }
  
  // Try to find in meta tags
  const metaPattern = /<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i;
  const metaMatch = html.match(metaPattern);
  if (metaMatch && metaMatch[1]) {
    return getFullImageUrl(metaMatch[1]);
  }
  
  return '';
}

// Extract all gallery images
function extractGalleryImages(html: string): string[] {
  const images: string[] = [];
  const galleryPattern = /<img[^>]*class="[^"]*gallery[^"]*"[^>]*src="([^"]+)"/gi;
  let match;
  
  while ((match = galleryPattern.exec(html)) !== null) {
    if (match[1]) {
      const fullUrl = getFullImageUrl(match[1]);
      if (fullUrl && !images.includes(fullUrl)) {
        images.push(fullUrl);
      }
    }
  }
  
  // Also try data attributes
  const dataSrcPattern = /<img[^>]*data-src="([^"]*\/PRODUCTS\/[^"]+\.(jpg|jpeg|png|webp))"/gi;
  while ((match = dataSrcPattern.exec(html)) !== null) {
    if (match[1]) {
      const fullUrl = getFullImageUrl(match[1]);
      if (fullUrl && !images.includes(fullUrl)) {
        images.push(fullUrl);
      }
    }
  }
  
  return images;
}

async function updateProductImages() {
  const client = await pool.connect();
  
  try {
    // Get all products
    const productsResult = await client.query('SELECT id, sku, name, "mainImageUrl" FROM products ORDER BY sku');
    const products = productsResult.rows;
    
    console.log(`Found ${products.length} products to update`);
    
    let updated = 0;
    let failed = 0;
    let skipped = 0;
    
    for (const product of products) {
      try {
        // Find URL slug for this product
        let urlSlug = productUrlMap[product.sku];
        
        // If no direct mapping, try to construct from name
        if (!urlSlug) {
          // Try to match by name patterns
          const nameLower = product.name.toLowerCase();
          if (nameLower.includes('83 cm') && nameLower.includes('sovy')) {
            urlSlug = 'nafukovaci-kluzak-83-cm-sovy';
          } else if (nameLower.includes('83 cm') && nameLower.includes('jelen')) {
            urlSlug = 'nafukovaci-kluzak-83-cm-jelen';
          } else if (nameLower.includes('93 cm') && nameLower.includes('fly')) {
            urlSlug = 'nafukovaci-kluzak-d93-fly';
          } else if (nameLower.includes('93 cm') && nameLower.includes('vzory')) {
            urlSlug = 'nafukovaci-kluzak-d93-patterns';
          } else if (nameLower.includes('pes') && nameLower.includes('červený')) {
            urlSlug = 'nafukovaci-kluzak-pes-red';
          } else if (nameLower.includes('autičko') && nameLower.includes('žluté')) {
            urlSlug = 'nafukovaci-kluzak-car2';
          } else if (nameLower.includes('letadlo')) {
            urlSlug = 'nafukovaci-kluzak-plane';
          } else if (nameLower.includes('loď')) {
            urlSlug = 'nafukovaci-kluzak-ship';
          }
        }
        
        if (!urlSlug) {
          console.log(`Skipping ${product.sku}: No URL mapping found`);
          skipped++;
          continue;
        }
        
        const productUrl = `https://www.flipflop.cz/nafukovaci-kluzaky/${urlSlug}`;
        console.log(`Fetching images for ${product.sku} from ${productUrl}...`);
        
        try {
          const html = await fetchHtml(productUrl);
          const mainImage = extractMainImage(html);
          const galleryImages = extractGalleryImages(html);
          
          if (!mainImage && galleryImages.length === 0) {
            console.log(`  No images found for ${product.sku}`);
            skipped++;
            continue;
          }
          
          // Use first gallery image if no main image found
          const finalMainImage = mainImage || galleryImages[0] || '';
          const imageUrls = galleryImages.length > 0 ? galleryImages : (mainImage ? [mainImage] : []);
          
          // Update product in database
          await client.query(
            `UPDATE products 
             SET "mainImageUrl" = $1, "imageUrls" = $2, "updatedAt" = NOW()
             WHERE id = $3`,
            [finalMainImage, JSON.stringify(imageUrls), product.id]
          );
          
          console.log(`  ✓ Updated ${product.sku}: ${finalMainImage}`);
          console.log(`    Gallery images: ${imageUrls.length}`);
          updated++;
          
          // Small delay to avoid overwhelming the server
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (error: any) {
          console.error(`  ✗ Error fetching ${productUrl}: ${error.message}`);
          failed++;
        }
        
      } catch (error: any) {
        console.error(`Error processing ${product.sku}: ${error.message}`);
        failed++;
      }
    }
    
    console.log('\n=== Update Summary ===');
    console.log(`Updated: ${updated}`);
    console.log(`Failed: ${failed}`);
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

