declare const Express: any;

import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppSSRModule } from './app-ssr.module';
import { Logger } from '@nestjs/common';
import * as session from 'express-session';
import * as mongoose from 'mongoose';
import * as connectMongo from 'connect-mongo';
import * as passport from 'passport';
import * as cookieParser from 'cookie-parser';
import * as cors from 'cors';
import * as compression from 'compression';
import * as bodyParser from 'body-parser'
;

async function bootstrap() {
  const logger = new Logger('boostrap');
  const MongoStore = connectMongo(session);

  const app = await NestFactory.create<NestExpressApplication>(AppSSRModule);
  app.use(compression());
  app.use(bodyParser.json({ limit: '10mb' }));
  app.use(bodyParser.urlencoded({ limit: '10mb' }));
  app.use(cookieParser());

  app.use(
    cors({
      credentials: true,
      origin: process.env.ORIGIN,
    }),
  );

  if (process.env.MONGO_URI) {
    mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    mongoose.set('useFindAndModify', false);
  }

  app.use(
    session({
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        secure: false,
      },
      secret: process.env.COOKIE_KEY,
      resave: false,
      saveUninitialized: false,
      store: new MongoStore({
        mongooseConnection: mongoose.connection,
        collection: 'session',
      }),
    }),
  );

  app.use(passport.initialize());
  app.use(passport.session());

  const port = process.env.SERVER_PORT;
  await app.listen(port);
  logger.log('App listening on port ' + port);
}

// Webpack will replace 'require' with '__webpack_require__'
// '__non_webpack_require__' is a proxy to Node 'require'
// The below code is to ensure that the server is run only when not requiring the bundle.
declare const __non_webpack_require__: NodeRequire;
const mainModule = __non_webpack_require__.main;
const moduleFilename = (mainModule && mainModule.filename) || '';
if (moduleFilename === __filename || moduleFilename.includes('iisnode')) {
  bootstrap().catch((err) => console.error(err));
}
