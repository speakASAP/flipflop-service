/**
 * Admin dashboard shared types (see also lib/api/admin.ts for API client).
 */

export type RevenueMoM = {
  month: string;
  revenue: number;
};

export type ConversionRate = {
  conversionRate: number;
  confirmedOrders: number;
  totalOrders: number;
  targetPct: number;
};

export type SlaStats = {
  slaTargetHours: number;
  avgFulfilmentHours: number;
  pctMeetingSla: number;
  totalFulfilled: number;
};

export type LowStockItem = {
  productId: string;
  productName: string;
  stock: number;
  threshold: number;
};

export type DeadStockItem = {
  productId: string;
  productName: string;
  stock: number;
  lastSoldAt: string | null;
  currentPrice: number;
  suggestedMarkdown: number | null;
};

export type SupplierPerformance = {
  supplierId: string;
  supplierName: string;
  avgLeadTimeDays: number | null;
  totalOrders: number;
  pendingOrders: number;
  flagged: boolean;
};

export type ReviewRequest = {
  orderId: string;
  customerEmail: string;
  sentAt: string;
  productCount: number;
};

export type LoyaltyAccount = {
  customerId: string;
  customerEmail: string;
  totalPoints: number;
  lastUpdated: string;
};

export type RepeatBuyer = {
  customerId: string;
  customerEmail: string;
  orderCount: number;
  totalSpent: number;
  lastOrderAt: string;
  recommendedProduct: string | null;
};

export type PriceSuggestion = {
  id: string;
  productId: string;
  productName: string;
  currentPrice: number;
  suggestedPrice: number;
  changePercent: number;
  rationale: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};
