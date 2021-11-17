FROM node:16.13 as buildContainer
WORKDIR /usr/src/app
COPY ./package-lock.json ./
COPY ./package.json ./
RUN npm install
COPY . /usr/src/app
RUN npm run build:ssr

FROM node:16.13
WORKDIR /usr/src/app
COPY --from=buildContainer /usr/src/app/package.json /usr/src/app/package-lock.json /usr/src/app/.env* ./
RUN npm i whatwg-url
COPY --from=buildContainer /usr/src/app/dist ./dist

ENTRYPOINT ["npm", "run", "start"]
