import { NestExpressApplication } from '@nestjs/platform-express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import type { Pool } from 'pg';
import passport from 'passport';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import compression from 'compression';
import { json, urlencoded } from 'body-parser';

import { PG_POOL } from './db/database.module';

export const setAppDB = (app: NestExpressApplication): void => {
  app.use(compression());
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ limit: '10mb' }));
  app.use(cookieParser());

  app.use(
    cors({
      credentials: true,
      origin: process.env.ORIGIN,
    }),
  );

  // Sessions (and the cart in them) live in the `session` table, created by the migrations
  const PgStore = connectPgSimple(session);

  app.use(
    session({
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        secure: false,
      },
      secret: process.env.COOKIE_KEY!,
      resave: false,
      saveUninitialized: false,
      store: new PgStore({
        pool: app.get<Pool>(PG_POOL),
        tableName: 'session',
        createTableIfMissing: false,
      }),
    }),
  );

  app.use(passport.initialize());
  app.use(passport.session());
};
