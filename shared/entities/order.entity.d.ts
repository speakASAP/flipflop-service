import { User } from './user.entity';
import { DeliveryAddress } from './delivery-address.entity';
import { OrderItem } from './order-item.entity';
import { OrderStatusHistory } from './order-status-history.entity';
import { Invoice } from './invoice.entity';
import { ProformaInvoice } from './proforma-invoice.entity';
export declare enum OrderStatus {
    PENDING = "pending",
    CONFIRMED = "confirmed",
    PROCESSING = "processing",
    SHIPPED = "shipped",
    DELIVERED = "delivered",
    CANCELLED = "cancelled",
    REFUNDED = "refunded"
}
export declare enum PaymentStatus {
    PENDING = "pending",
    PAID = "paid",
    FAILED = "failed",
    REFUNDED = "refunded"
}
export declare class Order {
    id: string;
    orderNumber: string;
    userId: string;
    user: User;
    deliveryAddressId: string;
    deliveryAddress: DeliveryAddress;
    status: OrderStatus;
    paymentStatus: PaymentStatus;
    paymentMethod: string;
    paymentTransactionId: string;
    subtotal: number;
    tax: number;
    shippingCost: number;
    discount: number;
    total: number;
    trackingNumber: string;
    shippingProvider: string;
    notes: string;
    metadata: Record<string, any>;
    items: OrderItem[];
    statusHistory: OrderStatusHistory[];
    invoices: Invoice[];
    proformaInvoices: ProformaInvoice[];
    createdAt: Date;
    updatedAt: Date;
}
