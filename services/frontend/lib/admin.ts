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
