FROM node:16-alpine as builder

WORKDIR /app
COPY package.json .
RUN yarn
COPY . .
RUN yarn run build

FROM node:16-alpine

WORKDIR /grome-backend

COPY package.json /grome-backend/
COPY tsconfig.build.json tsconfig.json  /grome-backend/
COPY --from=builder /app/node_modules /grome-backend//node_modules
COPY --from=builder /app/dist /grome-backend/dist
COPY .env.stage.prod /grome-backend/
EXPOSE 8082
CMD ["yarn", "start:prod"]
