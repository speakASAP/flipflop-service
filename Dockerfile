FROM node:24-slim

WORKDIR /app

# Install OpenSSL required by Prisma client binary
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

# Copy shared module first (required by package-lock.json symlink resolution)
COPY shared ./shared

# Install service dependencies
COPY services/api-gateway/package*.json ./
RUN npm install --legacy-peer-deps --no-package-lock

# Install prisma CLI + client so generate can run from /app (schema resolution)
RUN npm install --no-save --legacy-peer-deps --no-package-lock prisma@5.22.0 @prisma/client@5.22.0

# Generate Prisma client and sync to shared/node_modules (where shared/dist resolves it)
COPY prisma ./prisma
RUN cd /app/shared && /app/node_modules/.bin/prisma generate --schema=/app/prisma/schema.prisma && \
    rm -rf /app/shared/node_modules/@prisma/client /app/shared/node_modules/.prisma && \
    cp -r /app/node_modules/@prisma/client /app/shared/node_modules/@prisma/client && \
    cp -r /app/node_modules/.prisma /app/shared/node_modules/.prisma

# Copy pre-built dist (already compiled in repo)
COPY services/api-gateway/dist ./dist

# Ensure @flipflop/shared is properly resolved in node_modules
RUN mkdir -p /app/node_modules/@flipflop && ln -sf /app/shared /app/node_modules/@flipflop/shared

# dist files compiled with ../../../../shared path — create symlink at /shared
RUN ln -sf /app/shared /shared

EXPOSE 3000

CMD ["sh", "-c", "if [ -f dist/main.js ]; then exec node dist/main.js; fi; exec node dist/services/api-gateway/src/main.js"]
