/**
 * Script to import products from CSV file directly to database
 * Uses the production database via SSH tunnel
 */

import * as fs from 'fs';
import * as path from 'path';
import { config } from 'dotenv';
import { Category } from '../shared/entities/category.entity';
import { Product } from '../shared/entities/product.entity';
import { DataSource } from 'typeorm';

config();

// Create DataSource with entities for import - only Product and Category needed
const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5433', 10),
  username: process.env.DB_USER || 'dbadmin',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ecommerce',
  entities: [Product, Category],
  synchronize: false,
  logging: false,
});

// Field mapping for bizbox.cz CSV format
const fieldMapping: Record<string, string> = {
  sku: 'code',
  name: 'name:cs',
  shortDescription: 'shortDescription:cs',
  description: 'description:cs',
  price: 'purchasePriceGrossPrice', // Use gross price as base
  compareAtPrice: 'purchasePrice',
  brand: 'brand',
  manufacturer: 'manufacturer',
  stockQuantity: 'availability',
  isActive: 'active',
  mainImageUrl: 'bigImages',
  imageUrls: 'galleryImages',
  categories: 'categoriesSingle',
  seoTitle: 'seoTitle:cs',
  seoDescription: 'seoDescription:cs',
  seoKeywords: 'seoKeywords:cs',
};

// Parse CSV row handling quoted fields
function parseCsvRow(row: string, delimiter: string = ';'): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    const nextChar = row[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// Parse CSV content
function parseCsv(csvContent: string, delimiter: string = ';'): string[][] {
  const lines: string[][] = [];
  const rows = csvContent.split(/\r?\n/);
  
  for (const row of rows) {
    if (row.trim()) {
      lines.push(parseCsvRow(row, delimiter));
    }
  }
  
  return lines;
}

// Extract price from string (handles various formats)
function extractPrice(priceStr: string): number | null {
  if (!priceStr || priceStr.trim() === '') return null;
  
  // Remove currency symbols, spaces, and extract number
  const cleaned = priceStr.toString().replace(/[^\d.,]/g, '').replace(',', '.');
  const price = parseFloat(cleaned);
  
  return isNaN(price) ? null : price;
}

// Calculate selling price with profit margin
function calculateSellingPrice(purchasePrice: number, profitMargin: number = 30): number {
  return Math.round(purchasePrice * (1 + profitMargin / 100) * 100) / 100;
}

// Find or create category
async function findOrCreateCategory(
  categoryName: string,
): Promise<Category | null> {
  if (!categoryName || categoryName.trim() === '') return null;
  
  const categoryRepository = dataSource.getRepository(Category);
  
  // Try to find existing category
  let category = await categoryRepository.findOne({
    where: { name: categoryName.trim() },
  });
  
  if (!category) {
    // Create new category
    category = categoryRepository.create({
      name: categoryName.trim(),
      slug: categoryName.trim().toLowerCase().replace(/\s+/g, '-'),
      isActive: true,
    });
    category = await categoryRepository.save(category);
    console.log(`Created category: ${category.name}`);
  }
  
  return category;
}

// Main import function
async function importProducts() {
  const csvFilePath = process.argv[2];
  
  if (!csvFilePath) {
    console.error('Usage: ts-node scripts/import-products-from-csv.ts <path-to-csv-file>');
    process.exit(1);
  }
  
  if (!fs.existsSync(csvFilePath)) {
    console.error(`CSV file not found: ${csvFilePath}`);
    process.exit(1);
  }
  
  console.log('Connecting to database...');
  
  try {
    await dataSource.initialize();
    console.log('Database connected successfully');
    
    // Read CSV file
    console.log(`Reading CSV file: ${csvFilePath}`);
    const csvContent = fs.readFileSync(csvFilePath, 'utf-8');
    const rows = parseCsv(csvContent);
    
    if (rows.length < 2) {
      throw new Error('CSV file must have at least a header row and one data row');
    }
    
    const headers = rows[0];
    const dataRows = rows.slice(1);
    
    console.log(`Found ${dataRows.length} product rows`);
    
    // Find column indices
    const columnMap: Record<string, number> = {};
    for (const [key, csvColumn] of Object.entries(fieldMapping)) {
      const index = headers.findIndex((h) => h === csvColumn);
      if (index !== -1) {
        columnMap[key] = index;
        console.log(`Mapped ${key} -> ${csvColumn} (column ${index})`);
      }
    }
    
    // Validate required fields
    if (columnMap.sku === undefined || columnMap.name === undefined || columnMap.price === undefined) {
      throw new Error(`Required fields (sku, name, price) must be found in CSV. Found: sku=${columnMap.sku}, name=${columnMap.name}, price=${columnMap.price}`);
    }
    
        const productRepository = dataSource.getRepository(Product);
        const categoryRepository = dataSource.getRepository(Category);
    
    let success = 0;
    let failed = 0;
    let skipped = 0;
    const errors: Array<{ row: number; error: string }> = [];
    
    // Process each row
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowNumber = i + 2; // +2 because header is row 1, and we're 0-indexed
      
      try {
        // Extract values
        const sku = row[columnMap.sku]?.trim() || '';
        const name = row[columnMap.name]?.trim() || '';
        const purchasePriceStr = row[columnMap.price] || '';
        const purchasePrice = extractPrice(purchasePriceStr);
        
        // Skip if required fields are missing
        if (!sku || !name || purchasePrice === null) {
          console.log(`Row ${rowNumber}: Skipping - missing required fields (sku: ${sku}, name: ${name}, price: ${purchasePrice})`);
          skipped++;
          continue;
        }
        
        // Check if product exists
        const existingProduct = await productRepository.findOne({
          where: { sku },
        });
        
        if (existingProduct) {
          console.log(`Row ${rowNumber}: Product with SKU ${sku} already exists, skipping...`);
          skipped++;
          continue;
        }
        
        // Calculate selling price (30% profit margin by default)
        const sellingPrice = calculateSellingPrice(purchasePrice, 30);
        
        // Create product
        const product = productRepository.create({
          sku,
          name,
          shortDescription: row[columnMap.shortDescription]?.trim() || name.substring(0, 200),
          description: row[columnMap.description]?.trim() || '',
          price: sellingPrice,
          compareAtPrice: extractPrice(row[columnMap.compareAtPrice] || '') || purchasePrice,
          brand: row[columnMap.brand]?.trim() || null,
          manufacturer: row[columnMap.manufacturer]?.trim() || null,
          stockQuantity: parseInt(row[columnMap.stockQuantity] || '0', 10) || 0,
          isActive: row[columnMap.isActive]?.toLowerCase() === '1' || row[columnMap.isActive]?.toLowerCase() === 'true',
          mainImageUrl: row[columnMap.mainImageUrl]?.trim() || null,
          seoTitle: row[columnMap.seoTitle]?.trim() || name,
          seoDescription: row[columnMap.seoDescription]?.trim() || '',
          seoKeywords: row[columnMap.seoKeywords]?.trim() || '',
        });
        
        // Handle categories
        if (columnMap.categories && row[columnMap.categories]) {
          const categoryNames = row[columnMap.categories].split(',').map((c: string) => c.trim());
          const categories: Category[] = [];
          
          for (const catName of categoryNames) {
            if (catName) {
              const category = await findOrCreateCategory(catName);
              if (category) {
                categories.push(category);
              }
            }
          }
          
          if (categories.length > 0) {
            product.categories = categories;
          }
        }
        
        // Save product
        await productRepository.save(product);
        success++;
        
        if (success % 10 === 0) {
          console.log(`Imported ${success} products...`);
        }
        
      } catch (error) {
        failed++;
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push({ row: rowNumber, error: errorMsg });
        console.error(`Row ${rowNumber}: Error - ${errorMsg}`);
      }
    }
    
    console.log('\n=== Import Summary ===');
    console.log(`Success: ${success}`);
    console.log(`Failed: ${failed}`);
    console.log(`Skipped: ${skipped}`);
    
    if (errors.length > 0) {
      console.log('\nErrors:');
      errors.slice(0, 10).forEach((err) => {
        console.log(`  Row ${err.row}: ${err.error}`);
      });
      if (errors.length > 10) {
        console.log(`  ... and ${errors.length - 10} more errors`);
      }
    }
    
  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
    console.log('Database connection closed');
  }
}

// Run import
importProducts().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

