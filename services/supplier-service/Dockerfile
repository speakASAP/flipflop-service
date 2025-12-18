FROM node:lts-slim

# Build argument to force cache invalidation
ARG CACHE_BUST=1

# Install OpenSSL for Prisma
RUN apt-get update -y && apt-get install -y openssl libssl-dev && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
COPY shared/package.json shared/package-lock.json* ./shared/
COPY services/supplier-service/package.json ./services/supplier-service/

# Install dependencies
RUN npm install

# Copy source code
COPY shared ./shared
COPY prisma ./prisma
COPY tsconfig.json ./
# Copy supplier-service (this includes tsconfig.json)
COPY services/supplier-service ./services/supplier-service

# Install shared module dependencies first
WORKDIR /app/shared
RUN npm install --legacy-peer-deps

# Generate Prisma Client in shared module (needed for AdminSettings type)
RUN cp -r ../prisma ./prisma || true
RUN npx prisma generate --schema=./prisma/schema.prisma || npx prisma generate

# Build shared module
RUN npm run build

# Build service
WORKDIR /app/services/supplier-service
RUN npm install --include=dev
# Verify tsconfig.json exists before building
RUN ls -la tsconfig.json || (echo "tsconfig.json not found!" && exit 1)
# Cache bust: verify package.json build script doesn't include tsc-alias
RUN grep -q '"build": "tsc"' package.json || (echo "Build script still includes tsc-alias!" && exit 1)
RUN npm run build

# Expose port
EXPOSE 3006

# Set NODE_PATH to include shared node_modules for runtime module resolution
ENV NODE_PATH=/app/shared/node_modules:/app/node_modules

# Start service
CMD ["node", "dist/main.js"]

