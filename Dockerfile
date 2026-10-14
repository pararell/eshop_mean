FROM node:24.21-alpine3.24 AS buildContainer
RUN apk update && apk add python3 make g++

WORKDIR /usr/src/app
COPY ./package.json ./package-lock.json ./
RUN npm install
COPY . /usr/src/app
RUN npm run build:ssr

FROM node:24.21-alpine3.24
WORKDIR /usr/src/app
COPY --from=buildContainer /usr/src/app/package.json /usr/src/app/package-lock.json ./
RUN npm i whatwg-url
COPY --from=buildContainer /usr/src/app/dist ./dist

ENTRYPOINT ["npm", "run", "start"]
