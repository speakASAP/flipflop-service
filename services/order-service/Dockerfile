FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY services/order-service/package*.json ./
COPY shared/package.json shared/
COPY shared/tsconfig.json shared/

# Install dependencies
RUN npm install

# Copy source code
COPY services/order-service/ ./
COPY shared/ ./shared/

# Build
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY services/order-service/package*.json ./
COPY shared/package.json shared/

# Install production dependencies only
RUN npm install --only=production

# Copy built files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

# Expose port
EXPOSE 3000

# Start application
CMD ["node", "dist/main"]

