import { Product } from './product.entity';
export declare class ProductVariant {
    id: string;
    productId: string;
    product: Product;
    sku: string;
    name: string;
    options: Record<string, string>;
    price: number;
    compareAtPrice: number;
    stockQuantity: number;
    imageUrl: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
