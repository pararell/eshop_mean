FROM node:20.9.0-alpine AS buildContainer
RUN apk update && apk add python3 make g++

WORKDIR /usr/src/app
COPY ./package.json ./package-lock.json ./
RUN npm install
COPY . /usr/src/app
RUN npm run build:ssr

FROM node:20.9.0-alpine
WORKDIR /usr/src/app
COPY --from=buildContainer /usr/src/app/package.json /usr/src/app/package-lock.json /usr/src/app/.env* ./
COPY --from=buildContainer /usr/src/app/dist ./dist

ENTRYPOINT ["npm", "run", "start"]
