![MEAN](https://res.cloudinary.com/dnpgh1vhi/image/upload/v1615640124/logo1_gvrmpd.svg) 

# Eshop template
![David](https://img.shields.io/david/pararell/eshop_mean)
![Lines of code](https://img.shields.io/tokei/lines/github/pararell/eshop_mean)
![GitHub repo size](https://img.shields.io/github/repo-size/pararell/eshop_mean)
![GitHub package.json version](https://img.shields.io/github/package-json/v/pararell/eshop_mean)
![GitHub Repo stars](https://img.shields.io/github/stars/pararell/eshop_mean?style=social)

## Server : <img src="https://d33wubrfki0l68.cloudfront.net/e937e774cbbe23635999615ad5d7732decad182a/26072/logo-small.ede75a6b.svg" alt="nest.js" width="50"/> Nest.js with Express and <img src="https://webassets.mongodb.com/_com_assets/cms/mongodb_logo1-76twgcu2dm.png" alt="mongoDB" width="150"> MongoDB (Mongoose)
## Client : <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/Angular_full_color_logo.svg/1200px-Angular_full_color_logo.svg.png" alt="angular" width="60"> Angular (Server-side rendering)


## Test it
- smrtic.eu - dashboard test - email: test@miroslavsmrtic.sk , password: test123456
- more info in blog https://miroslavsmrtic.sk/blog

## Description
- Eshop with products and administration
- Typescript stack with decorators, use MongoDB and mongoose schemas, JWT Passport
- Theming with css variables

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

# build ssr and serve
$ npm run build:ssr
$ npm run serve:ssr
```

For another commands look to package.json

## Set enviroment for BE 

- Rename .env.example to .env

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

# Recaptcha server key from google
RECAPTCHA_SERVER_KEY="RECAPTCHA_SERVER_KEY"

# Get location from IP - https://geolocation-db.com
GEO_LOCATION_API_KEY="GEO_LOCATION_API_KEY"

# FE ENV SEND FROM BE
FE_STRIPE_PUBLISHABLE_KEY="FE_STRIPE_PUBLISHABLE_KEY"
FE_TINYMCE_API_KEY="FE_TINYMCE_API_KEY"
FE_RECAPTCHA_CLIENT_KEY="FE_RECAPTCHA_CLIENT_KEY"
```
## Docker

```bash
# pull docker
docker pull pararel/eshop-mean:latest

# run docker with env file
docker run --env-file $PathToEnv --network=host pararel/eshop-mean:latest

# run docker with env set in cmd line
docker run --e MONGO_URI=mongodbUrl --e OTHER_ENV=otherEnvValue --network=host pararel/eshop-mean:latest

```
