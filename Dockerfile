FROM node:16-alpine as builder

WORKDIR /app
# Copy package files first (for caching)
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy source
COPY . .

# Build NestJS app
RUN yarn build

FROM node:16-alpine

WORKDIR /grome-backend

COPY package.json /grome-backend/
COPY tsconfig.json /grome-backend/
COPY --from=builder /app/node_modules /grome-backend//node_modules
COPY --from=builder /app/dist /grome-backend/dist
COPY .env.stage.prod /grome-backend/
EXPOSE 8082
CMD ["yarn", "start:prod"]
