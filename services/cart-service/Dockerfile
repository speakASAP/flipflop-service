FROM node:lts-slim

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
COPY shared/package.json shared/package-lock.json* ./shared/
COPY services/cart-service/package.json ./services/cart-service/

# Install dependencies
RUN npm install

# Copy source code
COPY shared ./shared
COPY services/cart-service ./services/cart-service
COPY prisma ./prisma
COPY tsconfig.json ./

# Install shared module dependencies first
WORKDIR /app/shared
RUN npm install --legacy-peer-deps

# Generate Prisma Client in shared module (needed for AdminSettings type)
RUN cp -r ../prisma ./prisma || true
RUN npx prisma generate --schema=./prisma/schema.prisma || npx prisma generate

# Build shared module
RUN npm run build

# Build service
WORKDIR /app/services/cart-service
RUN npm run build

# Expose port
EXPOSE 3009

# Start service
CMD ["node", "dist/main.js"]

