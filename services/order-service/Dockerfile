FROM node:lts-slim

# Install OpenSSL for Prisma
RUN apt-get update -y && apt-get install -y openssl libssl-dev && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
COPY shared/package.json shared/package-lock.json* ./shared/
COPY services/order-service/package.json ./services/order-service/

# Install dependencies
RUN npm install

# Copy source code
COPY shared ./shared
COPY services/order-service ./services/order-service
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
WORKDIR /app/services/order-service
RUN npm install --include=dev
RUN npm run build

# Expose port
EXPOSE 3003

# Start service
CMD ["node", "dist/services/order-service/src/main.js"]
