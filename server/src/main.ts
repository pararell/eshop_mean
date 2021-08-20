import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import session from 'express-session'
import mongoose from 'mongoose';
import MongoStore from 'connect-mongo';
import passport from 'passport';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import {json, urlencoded} from 'body-parser';

async function bootstrap() {
  const logger = new Logger('boostrap');

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ limit: '10mb' }));
  app.use(cookieParser());

  app.use(
    cors({
      credentials: true,
      origin: process.env.ORIGIN,
    }),
  );

  const clientP: any = mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false
}).then(m => m.connection.getClient());

app.use(
  session({
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      secure: false,
    },
    secret: process.env.COOKIE_KEY,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      clientPromise: clientP,
      collectionName: 'session',
    })
  })
);

  app.use(passport.initialize());
  app.use(passport.session());

  const port = process.env.SERVER_PORT;
  await app.listen(port);
  logger.log('App listening on port ' + port);
}

bootstrap();
