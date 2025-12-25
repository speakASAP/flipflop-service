/**
 * Products API
 */

import { apiClient } from './client';

export interface Product {
  id: string;
  name: string;
  sku: string;
  description?: string;
  price: number;
  stockQuantity: number;
  brand?: string;
  mainImageUrl?: string;
  imageUrls?: string[];
  images?: string[]; // Alias for imageUrls for backward compatibility
  categories?: Category[];
  variants?: ProductVariant[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  sku: string;
  price: number;
  stockQuantity: number;
  attributes?: Record<string, string>;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
}

export interface ProductFilters {
  page?: number;
  limit?: number;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  brand?: string;
  categoryId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  includeWarehouse?: boolean | string; // Include warehouse stock data (default: true)
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface CreateProductInput {
  name: string;
  sku: string;
  description?: string;
  shortDescription?: string;
  price: number;
  compareAtPrice?: number;
  mainImageUrl?: string;
  imageUrls?: string[];
  stockQuantity?: number;
  trackInventory?: boolean;
  brand?: string;
  manufacturer?: string;
  categoryIds?: string[];
}

export interface UpdateProductInput {
  name?: string;
  sku?: string;
  description?: string;
  shortDescription?: string;
  price?: number;
  compareAtPrice?: number;
  mainImageUrl?: string;
  imageUrls?: string[];
  stockQuantity?: number;
  trackInventory?: boolean;
  isActive?: boolean;
  brand?: string;
  manufacturer?: string;
  categoryIds?: string[];
}

export const productsApi = {
  async getProducts(filters?: ProductFilters) {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }
    const query = params.toString();
    return apiClient.get<PaginatedResponse<Product>>(
      `/products${query ? `?${query}` : ''}`
    );
  },

  async getProduct(id: string, includeWarehouse: boolean = true) {
    const params = new URLSearchParams();
    if (includeWarehouse !== undefined) {
      params.append('includeWarehouse', String(includeWarehouse));
    }
    const query = params.toString();
    return apiClient.get<Product>(`/products/${id}${query ? `?${query}` : ''}`);
  },

  async getCategories() {
    return apiClient.get<Category[]>('/categories');
  },

  async getCategory(id: string) {
    return apiClient.get<Category>(`/categories/${id}`);
  },

  // Admin operations
  async createProduct(data: CreateProductInput) {
    return apiClient.post<Product>('/products', data);
  },

  async updateProduct(id: string, data: UpdateProductInput) {
    return apiClient.put<Product>(`/products/${id}`, data);
  },

  async deleteProduct(id: string) {
    return apiClient.delete(`/products/${id}`);
  },
};

