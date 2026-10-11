
# ==========================================
# 1. Frontend build
# ==========================================
FROM node:22-bookworm-slim AS frontend-build

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install --no-audit --no-fund

COPY frontend/ ./

ARG VITE_API_URL=/api
ARG VITE_CLERK_PUBLISHABLE_KEY

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY

RUN npm run build


# ==========================================
# 2. Backend build
# ==========================================
FROM node:22-bookworm-slim AS backend-build

WORKDIR /app

COPY backend/package*.json ./
RUN npm install --no-audit --no-fund

COPY backend/ ./

RUN npm run build


# ==========================================
# 3. Production runner
# ==========================================
FROM node:22-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

COPY backend/package.json backend/package-lock.json ./

RUN npm install --no-audit --no-fund --omit=dev \
    && npm cache clean --force

COPY --from=backend-build /app/dist ./dist
COPY --from=frontend-build /app/frontend/dist ./public

EXPOSE 3001

USER node

CMD ["node", "dist/index.js"]
