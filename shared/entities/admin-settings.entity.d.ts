export declare class AdminSettings {
    id: string;
    envOverrides: Record<string, string>;
    features: Record<string, boolean>;
    business: Record<string, any>;
    integrations: Record<string, any>;
    system: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}
