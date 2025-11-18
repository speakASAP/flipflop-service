import { User } from './user.entity';
import { Product } from './product.entity';
import { ProductVariant } from './product-variant.entity';
export declare class CartItem {
    id: string;
    userId: string;
    user: User;
    productId: string;
    product: Product;
    variantId: string;
    variant: ProductVariant;
    quantity: number;
    price: number;
    createdAt: Date;
    updatedAt: Date;
}
