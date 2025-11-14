# -----------------------------
# 1) BUILDER
# -----------------------------
FROM node:18-alpine AS builder

# Install build tools for native modules
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy package files first (for caching)
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy source
COPY . .

# Build NestJS app
RUN yarn build

# -----------------------------
# 2) FINAL IMAGE
# -----------------------------
FROM node:18-alpine

WORKDIR /grome-backend

# Copy package.json and node_modules for production
COPY package.json yarn.lock ./
RUN yarn install --production --frozen-lockfile

# Copy built app
COPY --from=builder /app/dist ./dist

# Copy env file (use secrets in production)
COPY .env.stage.prod ./

EXPOSE 8082
CMD ["node", "dist/main.js"]
