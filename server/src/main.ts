import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import * as session from 'express-session';
import * as mongoose from 'mongoose';
import * as connectMongo from 'connect-mongo';
import * as passport from 'passport';
import * as cookieParser from 'cookie-parser';
import * as cors from 'cors';


async function bootstrap() {
  const logger = new Logger('boostrap');
  const MongoStore = connectMongo(session);

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.use(cookieParser());

  app.use(cors({
    credentials: true,
    origin: process.env.ORIGIN
  }));

  if (process.env.MONGO_URI) {
    mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    mongoose.set('useFindAndModify', false);
  }

  app.use(
    session({
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        secure: false
      },
      secret: process.env.COOKIE_KEY,
      resave: false,
      saveUninitialized: false,
      store: new MongoStore({
        mongooseConnection: mongoose.connection,
        collection: 'session'
     })
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  app.use((req, res, next) => {
    res.locals.login = req.isAuthenticated();
    res.locals.session = req.session;
    next();
  });

  const port = process.env.SERVER_PORT;
  await app.listen(port);
  logger.log('App listening on port ' + port);
}

bootstrap();
