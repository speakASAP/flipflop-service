import { Supplier } from './supplier.entity';
import { Product } from './product.entity';
export declare class SupplierProduct {
    id: string;
    supplierId: string;
    supplier: Supplier;
    productId: string;
    product: Product;
    supplierSku: string;
    supplierPrice: number;
    profitMargin: number;
    supplierStock: number;
    supplierData: Record<string, any>;
    lastSyncedAt: Date;
    createdAt: Date;
    updatedAt: Date;
}
