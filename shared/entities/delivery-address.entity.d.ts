import { User } from './user.entity';
import { Order } from './order.entity';
export declare class DeliveryAddress {
    id: string;
    userId: string;
    user: User;
    firstName: string;
    lastName: string;
    street: string;
    city: string;
    postalCode: string;
    country: string;
    phone: string;
    isDefault: boolean;
    orders: Order[];
    createdAt: Date;
    updatedAt: Date;
}
