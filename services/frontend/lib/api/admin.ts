/**
 * Admin API
 * Admin-only endpoints for dashboard management
 */

import { apiClient } from './client';
import { Product, PaginatedResponse } from './products';
import { Order, OrderStatus, PaymentStatus } from './orders';

// Re-export Order type for convenience
export type { Order };

export interface CompanySettings {
  id: string;
  name: string;
  address: string;
  country: string;
  ico: string;
  dic: string;
  phone: string;
  email: string;
  website: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminSettings {
  id: string;
  envOverrides: Record<string, string>;
  features: Record<string, boolean>;
  business: Record<string, unknown>;
  integrations: Record<string, unknown>;
  system: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ConfigurableVariable {
  name: string;
  value: string;
  description?: string;
}

export interface SalesData {
  totalSales: number;
  orderCount: number;
  averageOrderValue: number;
  salesByDate?: Array<{ date: string; sales: number }>;
}

export interface RevenueData {
  totalRevenue: number;
  revenueByProduct: Record<string, number>;
  orderCount: number;
}

export interface ProductAnalytics {
  productId?: string;
  totalSold: number;
  totalRevenue: number;
  averagePrice: number;
  topProducts?: Array<{
    productId: string;
    productName: string;
    quantity: number;
    revenue: number;
  }>;
}

export interface MarginAnalysis {
  totalMargin: number;
  averageMargin: number;
  marginByProduct: Record<string, number>;
  marginByOrder: Array<{
    orderId: string;
    margin: number;
  }>;
}

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  isAdmin: boolean;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateOrderStatusDto {
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  notes?: string;
}

export const adminApi = {
  // Company Settings
  async getCompanySettings() {
    return apiClient.get<CompanySettings>('/admin/company-settings');
  },

  async updateCompanySettings(data: Partial<CompanySettings>) {
    return apiClient.put<CompanySettings>('/admin/company-settings', data);
  },

  // Admin Settings
  async getAdminSettings() {
    return apiClient.get<AdminSettings>('/admin/settings');
  },

  async updateAdminSettings(data: Partial<AdminSettings>) {
    return apiClient.put<AdminSettings>('/admin/settings', data);
  },

  async getConfigurableVariables() {
    return apiClient.get<{
      configurable: ConfigurableVariable[];
      nonEditable: string[];
    }>('/admin/settings/available');
  },

  // Analytics
  async getSales(startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return apiClient.get<SalesData>(`/analytics/sales?${params.toString()}`);
  },

  async getRevenue(startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return apiClient.get<RevenueData>(`/analytics/revenue?${params.toString()}`);
  },

  async getProductAnalytics(productId?: string) {
    const params = productId ? `?productId=${productId}` : '';
    return apiClient.get<ProductAnalytics>(`/analytics/products${params}`);
  },

  async getMarginAnalysis(startDate?: string, endDate?: string) {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return apiClient.get<MarginAnalysis>(`/analytics/margins?${params.toString()}`);
  },

  // Products (Admin CRUD)
  async createProduct(data: Partial<Product> & Record<string, unknown>) {
    return apiClient.post<Product>('/products', data);
  },

  async updateProduct(id: string, data: Partial<Product> & Record<string, unknown>) {
    return apiClient.put<Product>(`/products/${id}`, data);
  },

  async deleteProduct(id: string) {
    return apiClient.delete(`/products/${id}`);
  },

  // Orders (Admin)
  async getAllOrders(filters?: {
    status?: OrderStatus;
    paymentStatus?: PaymentStatus;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }
    const query = params.toString();
    return apiClient.get<PaginatedResponse<Order>>(
      `/admin/orders${query ? `?${query}` : ''}`
    );
  },

  async updateOrderStatus(id: string, data: UpdateOrderStatusDto) {
    return apiClient.put<Order>(`/admin/orders/${id}/status`, data);
  },

  // Users (Admin)
  async getAllUsers(filters?: {
    search?: string;
    isAdmin?: boolean;
    page?: number;
    limit?: number;
  }) {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }
    const query = params.toString();
    return apiClient.get<PaginatedResponse<User>>(
      `/users/admin/list${query ? `?${query}` : ''}`
    );
  },

  async updateUser(id: string, data: Partial<User>) {
    return apiClient.put<User>(`/users/admin/${id}`, data);
  },

  // CSV Import
  async previewCsv(csvContent: string) {
    return apiClient.post<{
      headers: string[];
      rows: string[][];
    }>('/products/import/preview', { csvContent });
  },

  async importCsv(data: {
    csvContent: string;
    fieldMapping: Record<string, string>;
    defaultProfitMargin?: number;
    updateExisting?: boolean;
    skipErrors?: boolean;
  }) {
    return apiClient.post<{
      success: number;
      failed: number;
      errors: Array<{ row: number; error: string; data: Record<string, unknown> }>;
      skipped: number;
    }>('/products/import', data);
  },
};

