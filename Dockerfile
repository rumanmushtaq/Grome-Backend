# -----------------------------
# 1) BUILDER
# -----------------------------
FROM node:16-alpine AS builder

# Install build tools
RUN apk add --no-cache python3 make g++ bash git

WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy source code
COPY . .

# Build NestJS app
RUN yarn build

# -----------------------------
# 2) FINAL IMAGE
# -----------------------------
FROM node:16-alpine

WORKDIR /grome-backend

# Copy production dependencies
COPY package.json yarn.lock ./
RUN apk add --no-cache bash
RUN yarn install --production --frozen-lockfile

# Copy built app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

# Copy env
COPY .env.stage.prod ./

EXPOSE 8082
CMD ["yarn", "start:prod"]
