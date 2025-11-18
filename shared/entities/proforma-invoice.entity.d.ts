import { Order } from './order.entity';
export declare class ProformaInvoice {
    id: string;
    orderId: string;
    order: Order;
    proformaNumber: string;
    fileUrl: string;
    invoiceData: Record<string, any>;
    issuedAt: Date;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
}
