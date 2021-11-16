import { NestExpressApplication } from '@nestjs/platform-express';
import session from 'express-session';
import mongoose from 'mongoose';
import MongoStore from 'connect-mongo';
import passport from 'passport';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import compression from 'compression';
import { json, urlencoded } from 'body-parser';

export const setAppDB = (app: NestExpressApplication): void => {
  app.use(compression());
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ limit: '10mb' }));
  app.use(cookieParser());

  app.use(
    cors({
      credentials: true,
      origin: process.env.ORIGIN,
    })
  );

  const clientP: any = mongoose
    .connect(process.env.MONGO_URI, {})
    .then((m) => m.connection.getClient());

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
      }),
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());
};
