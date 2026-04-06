# Build frontend
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Build backend runtime
FROM node:22-alpine AS runtime
WORKDIR /app/backend

# Prisma/OpenSSL runtime requirements (installed at build-time, not at container boot)
RUN apk add --no-cache openssl libc6-compat

COPY backend/package*.json ./
RUN npm install --omit=dev
COPY backend/ ./
COPY --from=frontend-builder /app/frontend/dist ./public

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080
CMD ["sh", "-c", "npx prisma generate && until npx prisma db push; do echo 'Database not ready, retrying in 3s...'; sleep 3; done; node src/index.js"]
