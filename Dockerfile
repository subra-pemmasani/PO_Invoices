FROM node:22-alpine AS runtime
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install --omit=dev
COPY backend/ ./
COPY --from=frontend-builder /app/frontend/dist ./public
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080
CMD sh -c "until npx prisma db push; do echo 'Database not ready, retrying in 3s...'; sleep 3; done; node src/index.js"
