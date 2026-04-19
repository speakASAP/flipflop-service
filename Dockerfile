FROM node:24-slim

WORKDIR /app

COPY package*.json ./
RUN npm install --prefer-offline --no-audit || npm ci

COPY . .

# If build script not found, use tsc directly
RUN npm run build 2>/dev/null || npx tsc 2>/dev/null || true

EXPOSE 3000

CMD ["node", "dist/main.js"]
