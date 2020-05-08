FROM node:13.0.1-alpine as buildContainer
RUN apk update && apk add python make g++
WORKDIR /app
COPY ./package.json ./package-lock.json /app/
RUN npm install
COPY . /app
RUN npm run build:ssr


FROM node:13.0.1-alpine
WORKDIR /app
COPY --from=buildContainer /app/package.json /app/.env* /app/
COPY --from=buildContainer /app/dist /app/dist

CMD ["npm", "run", "serve:ssr"]
