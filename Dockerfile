FROM node:22-alpine AS builder
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM node:22-alpine
RUN apk add --no-cache tini
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY backend/ ./backend/
COPY frontend/ ./frontend/
RUN mkdir -p /app/backend/data /app/backend/data/logs /app/backend/data/backup \
  && chown -R node:node /app/backend/data
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
USER node
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "backend/server.js"]
