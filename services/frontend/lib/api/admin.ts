/**
 * Admin API
 * Admin-only endpoints for dashboard management
 */

import { apiClient } from './client';
import { Product, PaginatedResponse } from './products';
import { Order, OrderStatus, PaymentStatus } from './orders';
import type {
  RevenueMoM,
  ConversionRate,
  SlaStats,
  LowStockItem,
  DeadStockItem,
  SupplierPerformance,
  ReviewRequest,
} from '../admin';

// Re-export Order type for convenience
export type { Order };
export type {
  RevenueMoM,
  ConversionRate,
  SlaStats,
  LowStockItem,
  DeadStockItem,
  SupplierPerformance,
  ReviewRequest,
} from '../admin';

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

export interface CheckoutFunnel {
  orders_created: number;
  payments_initiated: number;
  payments_completed: number;
  payments_failed: number;
  completion_rate_pct: number;
  abandonment_rate_pct: number;
}

export interface CompetitorAnalysis {
  generatedAt: string;
  commentary: string;
  products: Array<{ name: string; price: number }>;
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

  async getCheckoutFunnel(days?: number) {
    const params = days !== undefined && days > 0 ? `?days=${days}` : '';
    return apiClient.get<CheckoutFunnel>(`/admin/checkout-funnel${params}`);
  },

  async getCompetitorAnalysis() {
    return apiClient.get<CompetitorAnalysis>('/admin/competitor-analysis');
  },

  async getRevenueMoM(months?: number) {
    const q =
      months !== undefined && Number.isFinite(months) && months > 0 ? `?months=${months}` : '';
    return apiClient.get<RevenueMoM[]>(`/admin/analytics/revenue-mom${q}`);
  },

  async getConversionRate(days?: number) {
    const q =
      days !== undefined && Number.isFinite(days) && days > 0 ? `?days=${days}` : '?days=30';
    return apiClient.get<ConversionRate>(`/admin/analytics/conversion-rate${q}`);
  },

  async getSlaStats(days?: number) {
    const q =
      days !== undefined && Number.isFinite(days) && days > 0 ? `?days=${days}` : '?days=30';
    return apiClient.get<SlaStats>(`/admin/analytics/sla${q}`);
  },

  async getLowStock(threshold?: number) {
    const q =
      threshold !== undefined && Number.isFinite(threshold) && threshold > 0
        ? `?threshold=${threshold}`
        : '';
    return apiClient.get<{ items: LowStockItem[]; total: number }>(
      `/admin/inventory/low-stock${q}`,
    );
  },

  async getDeadStock(days?: number) {
    const d = days !== undefined && Number.isFinite(days) && days > 0 ? days : 90;
    return apiClient.get<{ items: DeadStockItem[]; total: number }>(
      `/admin/inventory/dead-stock?days=${d}`,
    );
  },

  async getSupplierPerformance() {
    return apiClient.get<{ suppliers: SupplierPerformance[] }>(
      '/admin/inventory/supplier-performance',
    );
  },

  async getReviewRequests(days?: number) {
    const d = days !== undefined && Number.isFinite(days) && days > 0 ? days : 30;
    return apiClient.get<{ total: number; items: ReviewRequest[] }>(
      `/admin/retention/review-requests?days=${d}`,
    );
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

  // Allegro Sync
  async syncProductsFromAllegro(options?: {
    productCodes?: string[];
    syncAll?: boolean;
  }) {
    return apiClient.post<{
      total: number;
      products: Array<{
        name: string;
        sku: string;
        description?: string;
        price: number;
        stockQuantity: number;
        trackInventory: boolean;
        [key: string]: unknown;
      }>;
      message: string;
    }>('/allegro/sync', {
      productCodes: options?.productCodes,
      syncAll: options?.syncAll || false,
    });
  },

  async getAllegroProducts(filters?: {
    page?: number;
    limit?: number;
    search?: string;
    active?: boolean;
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
    return apiClient.get<{
      items: Array<Record<string, unknown>>;
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
      };
    }>(`/allegro/products${query ? `?${query}` : ''}`);
  },
};

