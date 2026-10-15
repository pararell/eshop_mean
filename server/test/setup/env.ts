// Runs before every test file, before any app module is imported.
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
  GOOGLE_CLIENT_ID: 'test-google-client',
  GOOGLE_CLIENT_SECRET: 'test-google-secret',
  RECAPTCHA_SERVER_KEY: 'test-recaptcha',
  GEO_LOCATION_API_KEY: 'test-geo',
  FE_STRIPE_PUBLISHABLE_KEY: 'pk_test_dummy',
  FE_TINYMCE_API_KEY: 'test-tinymce',
  FE_RECAPTCHA_CLIENT_KEY: 'test-recaptcha-client',
  FE_ANALYTICS_TOKEN: '',
  NODE_TLS_REJECT_UNAUTHORIZED: '1',
};

Object.assign(process.env, testEnv);

// The PostgreSQL database is created per test file by createTestApp() (test/utils/test-app.ts)
