FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
COPY shared/package.json shared/package-lock.json* ./shared/
COPY services/warehouse-service/package.json ./services/warehouse-service/

# Install dependencies
RUN npm install

# Copy source code
COPY shared ./shared
COPY services/warehouse-service ./services/warehouse-service
COPY prisma ./prisma
COPY tsconfig.json ./

# Generate Prisma Client
RUN npx prisma generate

# Install and build shared module dependencies
WORKDIR /app/shared
RUN npm install --legacy-peer-deps
RUN npm run build

# Build service
WORKDIR /app/services/warehouse-service
RUN npm run build

# Expose port
EXPOSE 3005

# Start service
CMD ["node", "dist/main.js"]

