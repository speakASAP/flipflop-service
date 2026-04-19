FROM node:24-slim

WORKDIR /app

COPY package*.json ./
RUN npm install --prefer-offline --no-audit || npm ci

COPY . .

# Copy pre-built dist directory (exists in repo)
EXPOSE 3000

ENTRYPOINT ["node"]
CMD ["dist/main.js"]
