// Runs before every test file, before any app module is imported.
// Nest loads the decorator metadata polyfill itself; unit specs that skip Nest (DTOs with @Type) need it too.
import 'reflect-metadata';

// Every variable the server reads is set explicitly so values from a local .env
// (loaded by ConfigModule, which never overrides existing variables) cannot leak into tests.
const testEnv: Record<string, string> = {
  PORT: '0',
  SERVER_URL: 'http://localhost:4000',
  ORIGIN: 'http://localhost:3000',
  JWT_SECRET: 'test-jwt-secret',
  JWT_EXPIRATION: '1h',
  COOKIE_KEY: 'test-cookie-key',
  ADMIN_EMAILS: 'admin1@test.dev,admin2@test.dev',
  SENDGRID_KEY: 'SG.test',
  EMAIL_FROM: 'shop@test.dev',
  CLOUDINARY_NAME: 'test',
  CLOUDINARY_KEY: 'test',
  CLOUDINARY_SECRET: 'test',
  STRIPE_SECRETKEY: 'sk_test_dummy',
  // The real SDK runs in tests, but only against test/utils/stripe-stub.ts; the default points at a
  // closed local port so a test that forgets the stub fails instead of reaching Stripe
  STRIPE_API_BASE: 'http://127.0.0.1:9',
  STRIPE_WEBHOOK_SECRET: '',
  GOOGLE_CLIENT_ID: 'test-google-client',
  GOOGLE_CLIENT_SECRET: 'test-google-secret',
  RECAPTCHA_SERVER_KEY: 'test-recaptcha',
  GEO_LOCATION_API_KEY: 'test-geo',
  FE_STRIPE_PUBLISHABLE_KEY: 'pk_test_dummy',
  FE_TINYMCE_API_KEY: 'test-tinymce',
  FE_RECAPTCHA_CLIENT_KEY: 'test-recaptcha-client',
  FE_ANALYTICS_TOKEN: '',
  NODE_TLS_REJECT_UNAUTHORIZED: '1',
  // Specs sign in many times; security.spec.ts tests the limit with its own app
  RATE_LIMIT_PER_MINUTE: '10000',
  TRUST_PROXY: '',
  // AI drafts are off unless a test enables them with a stub provider (never a real API)
  AI_PROVIDER: 'gemini',
  AI_MODEL: '',
  GEMINI_API_KEY: '',
  ANTHROPIC_API_KEY: '',
  AI_BASE_URL: '',
  AI_IMAGE_ORIGIN: '',
};

Object.assign(process.env, testEnv);

// The PostgreSQL database is created per test file by createTestApp() (test/utils/test-app.ts)
