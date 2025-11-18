/**
 * Payment Service Interface
 * Types for external payment microservice integration
 */

export interface CreatePaymentDto {
  orderId: string;
  amount: number;
  currency?: string;
  paymentMethod?: string;
  returnUrl?: string;
  cancelUrl?: string;
  metadata?: Record<string, any>;
}

export interface PaymentResponse {
  success: boolean;
  data?: {
    id: string;
    orderId: string;
    status: PaymentStatus;
    redirectUri?: string;
    transactionId?: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface PaymentStatusResponse {
  success: boolean;
  data?: {
    id: string;
    orderId: string;
    status: PaymentStatus;
    amount: number;
    currency: string;
    transactionId?: string;
    paidAt?: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

export interface RefundPaymentDto {
  paymentId: string;
  amount?: number; // Partial refund if specified
  reason?: string;
}

export interface RefundResponse {
  success: boolean;
  data?: {
    id: string;
    paymentId: string;
    amount: number;
    status: 'refunded' | 'pending';
    refundedAt?: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled',
}

