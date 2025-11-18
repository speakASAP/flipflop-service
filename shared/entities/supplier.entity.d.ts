import { SupplierProduct } from './supplier-product.entity';
export declare class Supplier {
    id: string;
    name: string;
    contactEmail: string;
    contactPhone: string;
    address: string;
    apiUrl: string;
    apiKey: string;
    apiSecret: string;
    apiConfig: Record<string, any>;
    isActive: boolean;
    autoSyncProducts: boolean;
    autoForwardOrders: boolean;
    supplierProducts: SupplierProduct[];
    createdAt: Date;
    updatedAt: Date;
}
