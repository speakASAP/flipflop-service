import { Order, OrderStatus } from './order.entity';
export declare class OrderStatusHistory {
    id: string;
    orderId: string;
    order: Order;
    status: OrderStatus;
    notes: string;
    changedBy: string;
    createdAt: Date;
}
