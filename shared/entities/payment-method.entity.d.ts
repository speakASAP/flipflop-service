import { User } from './user.entity';
export declare class PaymentMethod {
    id: string;
    userId: string;
    user: User;
    type: string;
    provider: string;
    metadata: Record<string, any>;
    isDefault: boolean;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
