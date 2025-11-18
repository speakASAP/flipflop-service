FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
COPY shared/package.json shared/package-lock.json* ./shared/
COPY services/product-service/package.json ./services/product-service/

# Install dependencies
RUN npm install

# Copy source code
COPY shared ./shared
COPY services/product-service ./services/product-service
COPY prisma ./prisma
COPY tsconfig.json ./

# Generate Prisma Client
RUN npx prisma generate

# Build shared module
WORKDIR /app/shared
RUN npm run build

# Build service
WORKDIR /app/services/product-service
RUN npm run build

# Expose port
EXPOSE 3002

# Start service
CMD ["node", "dist/main.js"]

