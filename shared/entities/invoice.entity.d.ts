import { Order } from './order.entity';
export declare class Invoice {
    id: string;
    orderId: string;
    order: Order;
    invoiceNumber: string;
    fileUrl: string;
    invoiceData: Record<string, any>;
    issuedAt: Date;
    paidAt: Date;
    createdAt: Date;
    updatedAt: Date;
}
