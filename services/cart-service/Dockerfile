FROM node:20-alpine

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

# Generate Prisma Client
RUN npx prisma generate

# Build shared module
WORKDIR /app/shared
RUN npm run build

# Build service
WORKDIR /app/services/cart-service
RUN npm run build

# Expose port
EXPOSE 3009

# Start service
CMD ["node", "dist/main.js"]

