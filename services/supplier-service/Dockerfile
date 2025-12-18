FROM node:lts-slim

WORKDIR /app

# Install OpenSSL for PostgreSQL connections
RUN apt-get update -y && apt-get install -y openssl libssl-dev && rm -rf /var/lib/apt/lists/*

# Copy package files
COPY package.json package-lock.json* ./
COPY shared/package.json shared/package-lock.json* ./shared/
COPY services/supplier-service/package.json ./services/supplier-service/

# Install dependencies
RUN npm install

# Copy source code
COPY shared ./shared
COPY services/supplier-service ./services/supplier-service

# Build shared module
WORKDIR /app/shared
RUN npm run build

# Build supplier-service
WORKDIR /app/services/supplier-service
RUN npm run build

# Expose port
EXPOSE 3006

# Start service
CMD ["node", "dist/main.js"]

