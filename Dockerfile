FROM node:24-slim

WORKDIR /app

# Copy shared module first (required by package-lock.json symlink resolution)
COPY shared ./shared

# Install service dependencies
COPY services/api-gateway/package*.json ./
RUN npm install --legacy-peer-deps --no-package-lock

# Copy pre-built dist (already compiled in repo)
COPY services/api-gateway/dist ./dist

# Ensure @flipflop/shared is properly resolved in node_modules
RUN mkdir -p /app/node_modules/@flipflop && ln -sf /app/shared /app/node_modules/@flipflop/shared

# dist files compiled with ../../../../shared path — create symlink at /shared
RUN ln -sf /app/shared /shared

EXPOSE 3000

CMD ["node", "dist/main.js"]
