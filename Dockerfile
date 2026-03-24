# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
# If yarn.lock exists, copy it too
COPY yarn.lock* ./

# Install dependencies (use npm or yarn depending on lockfile)
RUN if [ -f yarn.lock ]; then yarn install; else npm install; fi

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Production
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY yarn.lock* ./

# Install only production dependencies
RUN if [ -f yarn.lock ]; then yarn install --production; else npm install --only=production; fi

# Copy built assets from builder
COPY --from=builder /app/dist ./dist

# Copy other necessary assets if any (e.g. templates)
# COPY --from=builder /app/src/templates ./dist/templates

# Set environment variables
ENV NODE_ENV=production

# Expose port
EXPOSE 3000

# Start the application
# Note: The build output is in dist/src/main.js due to the project structure.
CMD ["node", "-r", "module-alias/register", "dist/src/main.js"]
