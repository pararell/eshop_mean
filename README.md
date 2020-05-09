<p align="center">
 MEAN (server - Nest.js with Mongoose BE, client - Angular, server-ssr- build both)
</p>
<p>
eshop.miroslavsmrtic.sk - dashboard test - email: test@miroslavsmrtic.sk , password: test123456
</p>
## Description
- Eshop with products and administration
- Typescript stack with decorators, use MongoDB and mongoose schemas, JWT Passport
- in progress

## Installation

One package.json contain now all neccessary for Nest and Angular, so server-side rendering with Angular is possible

```bash
$ npm install
```

## Running the app

```bash
# development - start BE - port 4000
$ npm run start

# development - start FE - port 3000
$ npm run start:client

# watch mode server
$ npm run start:dev

# build ssr, watch for changes doesnt work well now
$ npm run dev:ssr
```

For productions and another commands look to package.json

## SET ENVIROMENT FOR BE - Rename .env.example to .env

```bash
# BE HOST
SERVER_PORT=4000
SERVER_URL="http://localhost:4000"

# FE HOST
ORIGIN="http://localhost:3000"

# JWT settings
JWT_EXPIRATION="7d"
JWT_SECRET="youhavetochoseone"

COOKIE_KEY="youhavetochoseone"

# DB URI
MONGO_URI="mongodb://{user}:{password}@{host}:{port}/{databaseName}"

# Emails
SENDGRID_KEY="set if you want have notification for order or contact from https://sendgrid.com (ADMIN_EMAILS and user will get notification)"

# Images
CLOUDINARY_NAME="set name from cloudinary api https://cloudinary.com (for images upload)"
CLOUDINARY_KEY="set key from cloudinary api  https://cloudinary.com (for images upload)"
CLOUDINARY_SECRET="set secret from cloudinary api https://cloudinary.com (for images upload)"

# Pay
STRIPE_PUBLISHABLE_KEY="set for paying with card for orders with stripe https://stripe.com"
STRIPE_SECRETKEY="set for paying with card for orders with stripe https://stripe.com"

# Google login
GOOGLE_CLIENT_ID="set for google login activation"
GOOGLE_CLIENT_SECRET="set for google login activation"

# Admin emails get notification from sendgrid when order or contact are submitted
ADMIN_EMAILS="your@email.com, another@mail.com"
```
## Docker

```bash
# pull docker
docker pull pararel/eshop-mean:latest

# run docker with env file
docker run --env-file $PathToEnv --network host pararel/eshop-mean:latest

# run docker with env set in cmd line
docker run --e MONGO_URI=mongodbUrl --e OTHER_ENV=otherEnvValue --network host pararel/eshop-mean:latest

```