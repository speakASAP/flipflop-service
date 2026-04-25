FROM node:24-slim

WORKDIR /app

# Install service dependencies
COPY services/api-gateway/package*.json ./
RUN npm install --prefer-offline --legacy-peer-deps

# Copy pre-built dist (already compiled in repo)
COPY services/api-gateway/dist ./dist

# Copy shared module (pre-built dist in repo)
COPY shared ./shared

# Ensure @flipflop/shared is properly resolved in node_modules
RUN mkdir -p /app/node_modules/@flipflop && ln -sf ../shared /app/node_modules/@flipflop/shared

EXPOSE 3000

CMD ["node", "dist/main.js"]
