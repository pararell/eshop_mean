import { NestExpressApplication } from '@nestjs/platform-express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import type { Pool } from 'pg';
import passport from 'passport';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import compression from 'compression';
import { json, urlencoded } from 'body-parser';
import helmet from 'helmet';

import { PG_POOL } from './db/database.module';

/**
 * `TRUST_PROXY`: Express "trust proxy" setting for a TLS-terminating reverse proxy in front of the
 * app (e.g. `1` for one hop, or `loopback`). Needed for the client IP (rate limits) and for HTTPS
 * detection (secure session cookie). Unset = no proxy is trusted.
 */
const trustProxy = (value: string | undefined): boolean | number | string | undefined => {
  if (!value) return undefined;
  if (value === 'true' || value === 'false') return value === 'true';
  return /^\d+$/.test(value) ? Number(value) : value;
};

/**
 * Security headers (audit SEC-09). The Content-Security-Policy is report-only for now: violations
 * show in the browser console without breaking Stripe, TinyMCE, reCAPTCHA or analytics; it will be
 * enforced once verified (milestone M2).
 */
const securityHeaders = () =>
  helmet({
    contentSecurityPolicy: {
      reportOnly: true,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          'https://js.stripe.com',
          'https://*.js.stripe.com',
          'https://cdn.tiny.cloud',
          'https://www.google.com',
          'https://www.gstatic.com',
          'https://www.googletagmanager.com',
        ],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdn.tiny.cloud'],
        fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com', 'https://cdn.tiny.cloud'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
        mediaSrc: ["'self'", 'https:'],
        connectSrc: [
          "'self'",
          'https://api.stripe.com',
          'https://*.stripe.com',
          'https://*.stripe.network',
          'https://*.tiny.cloud',
          'https://www.google-analytics.com',
          'https://*.google-analytics.com',
        ],
        frameSrc: ['https://js.stripe.com', 'https://*.js.stripe.com', 'https://hooks.stripe.com', 'https://www.google.com'],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'self'"],
        // Ignored (with a console warning) in a report-only policy
        upgradeInsecureRequests: null,
      },
    },
    // Images and media come from Cloudinary and other origins
    crossOriginEmbedderPolicy: false,
    // Only this host; other subdomains of the domain may not be HTTPS
    strictTransportSecurity: { maxAge: 15_552_000, includeSubDomains: false },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  });

export const setAppDB = (app: NestExpressApplication): void => {
  const proxy = trustProxy(process.env.TRUST_PROXY);
  if (proxy !== undefined) app.set('trust proxy', proxy);

  app.use(securityHeaders());
  app.use(compression());
  app.use(
    json({
      limit: '10mb',
      // Stripe signs the exact bytes it sent: keep them for webhook verification (payments.controller.ts)
      verify: (req, _res, buf) => {
        if (req.url?.startsWith('/api/payments/webhook')) (req as typeof req & { rawBody?: Buffer }).rawBody = buf;
      },
    }),
  );
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
        httpOnly: true,
        // Sent on top-level navigations (Google login, payment redirects), not on cross-site requests
        sameSite: 'lax',
        // Secure when the request is HTTPS; behind a proxy that needs TRUST_PROXY (audit SEC-11)
        secure: 'auto',
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
