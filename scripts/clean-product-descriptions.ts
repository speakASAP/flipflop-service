/**
 * Clean HTML tags from product descriptions
 * Removes all HTML tags and keeps only plain text
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

/**
 * Strip HTML tags and decode HTML entities
 * Returns plain text only
 */
function stripHtml(html: string | null): string {
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

async function cleanProductDescriptions() {
  const client = await pool.connect();
  
  try {
    console.log('Fetching all products...');
    
    // Fetch all products with descriptions
    const result = await client.query(
      'SELECT id, sku, name, description, "shortDescription" FROM products WHERE description IS NOT NULL OR "shortDescription" IS NOT NULL'
    );
    
    const products = result.rows;
    console.log(`Found ${products.length} products to process`);
    
    let updated = 0;
    let skipped = 0;
    
    for (const product of products) {
      const originalDescription = product.description || '';
      const originalShortDescription = product.shortDescription || '';
      
      const cleanedDescription = stripHtml(originalDescription);
      const cleanedShortDescription = stripHtml(originalShortDescription);
      
      // Only update if there was a change
      if (cleanedDescription !== originalDescription || cleanedShortDescription !== originalShortDescription) {
        await client.query(
          `UPDATE products 
           SET description = $1, "shortDescription" = $2, "updatedAt" = NOW()
           WHERE id = $3`,
          [
            cleanedDescription || null,
            cleanedShortDescription || null,
            product.id
          ]
        );
        
        updated++;
        console.log(`✓ Updated product ${product.sku} (${product.name.substring(0, 50)})`);
      } else {
        skipped++;
      }
    }
    
    console.log('\n=== Cleanup Summary ===');
    console.log(`Total products processed: ${products.length}`);
    console.log(`Updated: ${updated}`);
    console.log(`Skipped (no HTML found): ${skipped}`);
    
  } catch (error: any) {
    console.error('Error cleaning descriptions:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

cleanProductDescriptions().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

