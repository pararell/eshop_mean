import { NestExpressApplication } from '@nestjs/platform-express';
import session from 'express-session';
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

  app.enable('trust proxy');

  app.use(
    cors({
      credentials: true,
      origin: process.env.ORIGIN,
    }),
  );

  app.use(
    session({
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        secure: false,
        httpOnly: true,
        sameSite: 'lax',
      },
      secret: process.env.COOKIE_KEY,
      resave: true,
      saveUninitialized: true,
      name: 'eshop.sid',
    }),
  );

  app.use(passport.initialize());
  app.use(passport.session());
};
