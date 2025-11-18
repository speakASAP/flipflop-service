FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
COPY shared/package.json shared/package-lock.json* ./shared/
COPY services/user-service/package.json ./services/user-service/

# Install dependencies
RUN npm install

# Copy source code
COPY shared ./shared
COPY services/user-service ./services/user-service
COPY prisma ./prisma
COPY tsconfig.json ./

# Generate Prisma Client
RUN npx prisma generate

# Install and build shared module dependencies
WORKDIR /app/shared
RUN npm install --legacy-peer-deps
RUN npm run build

# Build service
WORKDIR /app/services/user-service
RUN npm run build

# Expose port
EXPOSE 3004

# Start service
CMD ["node", "dist/main.js"]

