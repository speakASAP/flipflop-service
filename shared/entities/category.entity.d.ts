import { Product } from './product.entity';
export declare class Category {
    id: string;
    name: string;
    slug: string;
    description: string;
    imageUrl: string;
    parentId: string;
    sortOrder: number;
    isActive: boolean;
    products: Product[];
    createdAt: Date;
    updatedAt: Date;
}
