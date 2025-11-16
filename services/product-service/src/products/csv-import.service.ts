/**
 * CSV Import Service
 * Handles CSV file parsing and product import
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../../../shared/entities/product.entity';
import { Category } from '../../../shared/entities/category.entity';
import { LoggerService } from '../../../shared/logger/logger.service';

export interface CsvFieldMapping {
  sku: string;
  name: string;
  shortDescription?: string;
  description?: string;
  price: string;
  compareAtPrice?: string;
  brand?: string;
  manufacturer?: string;
  stockQuantity?: string;
  isActive?: string;
  mainImageUrl?: string;
  imageUrls?: string;
  categories?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
}

export interface CsvImportOptions {
  fieldMapping: CsvFieldMapping;
  defaultProfitMargin?: number;
  updateExisting?: boolean;
  skipErrors?: boolean;
}

export interface CsvImportResult {
  success: number;
  failed: number;
  errors: Array<{ row: number; error: string; data: any }>;
  skipped: number;
}

@Injectable()
export class CsvImportService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    private logger: LoggerService,
  ) {}

  /**
   * Parse CSV content
   */
  parseCsv(csvContent: string, delimiter: string = ';'): string[][] {
    const lines: string[][] = [];
    const rows = csvContent.split(/\r?\n/);
    
    for (const row of rows) {
      if (row.trim()) {
        // Handle quoted fields with delimiters inside
        const parsed = this.parseCsvRow(row, delimiter);
        lines.push(parsed);
      }
    }
    
    return lines;
  }

  /**
   * Parse a single CSV row handling quoted fields
   */
  private parseCsvRow(row: string, delimiter: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      const nextChar = row[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    // Add last field
    result.push(current.trim());
    
    return result;
  }

  /**
   * Import products from CSV
   */
  async importProducts(
    csvContent: string,
    options: CsvImportOptions,
  ): Promise<CsvImportResult> {
    const result: CsvImportResult = {
      success: 0,
      failed: 0,
      errors: [],
      skipped: 0,
    };

    // Parse CSV
    const rows = this.parseCsv(csvContent);
    if (rows.length < 2) {
      throw new Error('CSV file must have at least a header row and one data row');
    }

    const headers = rows[0];
    const dataRows = rows.slice(1);

    // Find column indices for mapped fields
    const columnMap: Record<string, number> = {};
    for (const [key, value] of Object.entries(options.fieldMapping)) {
      if (value) {
        const index = headers.findIndex((h) => h === value);
        if (index !== -1) {
          columnMap[key] = index;
        }
      }
    }

    // Validate required fields
    if (!columnMap.sku || !columnMap.name || !columnMap.price) {
      throw new Error('Required fields (sku, name, price) must be mapped');
    }

    // Process each row
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowNumber = i + 2; // +2 because header is row 1, and we start from 0

      try {
        // Extract values
        const sku = this.getFieldValue(row, columnMap.sku);
        const name = this.getFieldValue(row, columnMap.name);
        const priceStr = this.getFieldValue(row, columnMap.price);

        if (!sku || !name || !priceStr) {
          result.skipped++;
          continue;
        }

        // Check if product exists
        const existingProduct = await this.productRepository.findOne({
          where: { sku },
        });

        if (existingProduct && !options.updateExisting) {
          result.skipped++;
          continue;
        }

        // Parse price
        let price = parseFloat(priceStr.replace(/[^\d.,]/g, '').replace(',', '.'));
        if (isNaN(price) || price <= 0) {
          throw new Error(`Invalid price: ${priceStr}`);
        }

        // Apply profit margin if specified
        if (options.defaultProfitMargin && options.defaultProfitMargin > 0) {
          price = price * (1 + options.defaultProfitMargin / 100);
        }

        // Build product data
        const productData: any = {
          sku,
          name,
          price,
          stockQuantity: 0,
          trackInventory: false,
          isActive: true,
        };

        // Optional fields
        if (columnMap.shortDescription) {
          productData.shortDescription = this.getFieldValue(
            row,
            columnMap.shortDescription,
          );
        }
        if (columnMap.description) {
          productData.description = this.getFieldValue(row, columnMap.description);
        }
        if (columnMap.compareAtPrice) {
          const comparePrice = parseFloat(
            this.getFieldValue(row, columnMap.compareAtPrice)
              .replace(/[^\d.,]/g, '')
              .replace(',', '.'),
          );
          if (!isNaN(comparePrice) && comparePrice > price) {
            productData.compareAtPrice = comparePrice;
          }
        }
        if (columnMap.brand) {
          productData.brand = this.getFieldValue(row, columnMap.brand);
        }
        if (columnMap.manufacturer) {
          productData.manufacturer = this.getFieldValue(row, columnMap.manufacturer);
        }
        if (columnMap.stockQuantity) {
          const stock = parseInt(
            this.getFieldValue(row, columnMap.stockQuantity).replace(/\D/g, ''),
          );
          if (!isNaN(stock)) {
            productData.stockQuantity = stock;
            productData.trackInventory = true;
          }
        }
        if (columnMap.isActive) {
          const active = this.getFieldValue(row, columnMap.isActive);
          productData.isActive =
            active === '1' || active === 'true' || active === 'yes' || active === 'active';
        }
        if (columnMap.mainImageUrl) {
          productData.mainImageUrl = this.getFieldValue(row, columnMap.mainImageUrl);
        }
        if (columnMap.imageUrls) {
          const images = this.getFieldValue(row, columnMap.imageUrls);
          if (images) {
            // Split by comma or semicolon
            productData.imageUrls = images
              .split(/[,;]/)
              .map((img) => img.trim())
              .filter((img) => img.length > 0);
          }
        }
        if (columnMap.seoTitle) {
          productData.seoTitle = this.getFieldValue(row, columnMap.seoTitle);
        }
        if (columnMap.seoDescription) {
          productData.seoDescription = this.getFieldValue(row, columnMap.seoDescription);
        }
        if (columnMap.seoKeywords) {
          productData.seoKeywords = this.getFieldValue(row, columnMap.seoKeywords);
        }

        // Handle categories
        if (columnMap.categories) {
          const categoryNames = this.getFieldValue(row, columnMap.categories);
          if (categoryNames) {
            // Split categories and find or create them
            const categoryNameList = categoryNames
              .split(/[,;]/)
              .map((c) => c.trim())
              .filter((c) => c.length > 0);

            const categories = [];
            for (const categoryName of categoryNameList) {
              let category = await this.categoryRepository.findOne({
                where: { name: categoryName },
              });
              if (!category) {
                category = this.categoryRepository.create({ name: categoryName });
                category = await this.categoryRepository.save(category);
              }
              categories.push(category);
            }
            productData.categories = categories;
          }
        }

        // Save product
        if (existingProduct && options.updateExisting) {
          Object.assign(existingProduct, productData);
          await this.productRepository.save(existingProduct);
        } else {
          const product = this.productRepository.create(productData);
          await this.productRepository.save(product);
        }

        result.success++;
        this.logger.log(`Product imported: ${sku}`, { sku, name });
      } catch (error: any) {
        result.failed++;
        result.errors.push({
          row: rowNumber,
          error: error.message || 'Unknown error',
          data: row,
        });

        if (!options.skipErrors) {
          throw error;
        }
      }
    }

    return result;
  }

  /**
   * Get field value from row by column index
   */
  private getFieldValue(row: string[], columnIndex: number): string {
    if (columnIndex === undefined || columnIndex < 0 || columnIndex >= row.length) {
      return '';
    }
    return row[columnIndex] || '';
  }

  /**
   * Preview CSV - get first few rows and headers
   */
  previewCsv(csvContent: string, maxRows: number = 5): {
    headers: string[];
    rows: string[][];
  } {
    const allRows = this.parseCsv(csvContent);
    if (allRows.length === 0) {
      return { headers: [], rows: [] };
    }

    return {
      headers: allRows[0],
      rows: allRows.slice(1, maxRows + 1),
    };
  }
}

