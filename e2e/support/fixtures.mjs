// Seed data shared by the e2e server (start-server.mjs) and the specs.
export const E2E = {
  admin: { email: 'admin@e2e.test', password: 'Admin123' },
  car: { titleUrl: 'e2e-car', title: 'E2E Car', price: 25 },
  bike: { titleUrl: 'e2e-bike', title: 'E2E Bike', price: 60 },
  shipping: 5,
};

/** Every variable the server reads; external services get harmless test values. */
export const testEnv = (baseURL) => ({
  NODE_ENV: 'production',
  SERVER_URL: baseURL,
  ORIGIN: baseURL,
  JWT_SECRET: 'e2e-jwt-secret',
  JWT_EXPIRATION: '1h',
  COOKIE_KEY: 'e2e-cookie-key',
  ADMIN_EMAILS: '',
  SENDGRID_KEY: 'SG.e2e',
  EMAIL_FROM: 'shop@e2e.test',
  CLOUDINARY_NAME: 'e2e',
  CLOUDINARY_KEY: 'e2e',
  CLOUDINARY_SECRET: 'e2e',
  STRIPE_PUBLISHABLE_KEY: 'pk_test_e2e',
  STRIPE_SECRETKEY: 'sk_test_e2e',
  GOOGLE_CLIENT_ID: 'e2e-google-client',
  GOOGLE_CLIENT_SECRET: 'e2e-google-secret',
  RECAPTCHA_SERVER_KEY: 'e2e',
  GEO_LOCATION_API_KEY: 'e2e',
  FE_STRIPE_PUBLISHABLE_KEY: 'pk_test_e2e',
  FE_TINYMCE_API_KEY: 'e2e',
  FE_RECAPTCHA_CLIENT_KEY: 'e2e',
  FE_ANALYTICS_TOKEN: '',
  NG_ALLOWED_HOSTS: 'localhost',
  // Hermetic run: outbound HTTPS from the server (SendGrid, Stripe, reCAPTCHA) goes to a dead
  // local proxy and fails fast instead of reaching real services. Localhost is not proxied.
  HTTPS_PROXY: 'http://127.0.0.1:9',
  https_proxy: 'http://127.0.0.1:9',
  NO_PROXY: 'localhost,127.0.0.1',
  no_proxy: 'localhost,127.0.0.1',
});
