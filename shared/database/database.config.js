"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.databaseConfig = void 0;
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
exports.databaseConfig = {
    type: 'postgres',
    host: process.env.DB_HOST || 'db-server-postgres',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USER || 'dbadmin',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ecommerce',
    entities: [__dirname + '/../../shared/entities/**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/../../shared/migrations/**/*{.ts,.js}'],
    synchronize: process.env.DB_SYNC === 'true',
    logging: process.env.NODE_ENV === 'development',
    extra: {
        max: 20,
        connectionTimeoutMillis: 2000,
    },
};
//# sourceMappingURL=database.config.js.map