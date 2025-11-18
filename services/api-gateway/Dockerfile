FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
COPY shared/package.json shared/package-lock.json* ./shared/
COPY services/api-gateway/package.json ./services/api-gateway/

# Install dependencies
RUN npm install

# Copy source code
COPY shared ./shared
COPY services/api-gateway ./services/api-gateway
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
WORKDIR /app/services/api-gateway
RUN npm run build

# Expose port
EXPOSE 3001

# Start service
CMD ["node", "dist/main.js"]

