import { DeliveryAddress } from './delivery-address.entity';
import { Order } from './order.entity';
import { CartItem } from './cart-item.entity';
export declare class User {
    id: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone: string;
    isEmailVerified: boolean;
    isAdmin: boolean;
    preferences: Record<string, any>;
    deliveryAddresses: DeliveryAddress[];
    orders: Order[];
    cartItems: CartItem[];
    createdAt: Date;
    updatedAt: Date;
}
