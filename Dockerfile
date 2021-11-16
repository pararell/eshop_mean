FROM node:14.18.1 as buildContainer
WORKDIR /usr/src/app
COPY ./package-lock.json ./
COPY ./package.json ./
RUN npm install
COPY . /usr/src/app
RUN npm run build:ssr

FROM node:14.18.1
WORKDIR /usr/src/app
COPY --from=buildContainer /usr/src/app/package.json /usr/src/app/.env* ./
COPY --from=buildContainer /usr/src/app/dist ./dist

ENTRYPOINT ["npm", "run", "serve:ssr"]
