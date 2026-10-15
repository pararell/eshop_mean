import { INestApplication } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import * as bcrypt from 'bcryptjs';
import { of } from 'rxjs';
import request from 'supertest';

import { AppModule } from '../../src/app.module';
import { setAppDB } from '../../src/setAppDB';
import { createTestDatabase } from './test-db';
import { createModels, TestModel } from './test-models';

/** Mocked outbound HTTP (reCAPTCHA siteverify, geolocation). Override `post` per test. */
export const httpMock = {
  post: jest.fn(() => of({ data: { success: true } })),
  get: jest.fn(() => of({ data: {} })),
};

export interface TestApp {
  app: INestApplication;
  http: ReturnType<typeof request>;
  /** Mongoose-like access to the test database (see test-models.ts) */
  model: (name: string) => TestModel;
  close: () => Promise<void>;
}

/**
 * Boots the real AppModule with the same middleware as production (session, cookies, CORS) on a
 * fresh PostgreSQL database for this test file.
 */
export async function createTestApp(): Promise<TestApp> {
  const database = await createTestDatabase();
  process.env.DATABASE_URL = database.url;

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(HttpService)
    .useValue(httpMock)
    .compile();

  const app = moduleRef.createNestApplication<NestExpressApplication>();
  setAppDB(app);
  await app.init();

  const models = createModels(database.db);
  return {
    app,
    http: request(app.getHttpServer()),
    model: (name: string) => {
      const model = models[name];
      if (!model) throw new Error(`No test model ${name}`);
      return model;
    },
    close: async () => {
      await app.close(); // ends the app's pool (DatabaseModule)
      await database.drop();
    },
  };
}

/** Polls until `check` passes; several services persist without awaiting the write. */
export async function eventually<T>(check: () => Promise<T>, { timeout = 3000, interval = 50 } = {}): Promise<T> {
  const start = Date.now();
  for (;;) {
    try {
      return await check();
    } catch (error) {
      if (Date.now() - start > timeout) throw error;
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
  }
}

export async function createUser(
  t: TestApp,
  { email, password = 'secret1', roles = [] as string[] }: { email: string; password?: string; roles?: string[] },
) {
  const hash = await bcrypt.hash(password, await bcrypt.genSalt());
  return t.model('User').create({ email, password: hash, roles });
}

export async function loginToken(t: TestApp, email: string, password = 'secret1') {
  const res = await t.http.post('/api/auth/signin').send({ email, password }).expect(201);
  return res.body.accessToken as string;
}

export async function adminToken(t: TestApp, email = 'admin@test.dev') {
  // Emails are unique (decision D5), so a file that asks twice reuses its admin
  if (!(await t.model('User').findOne({ email }))) {
    await createUser(t, { email, roles: ['admin'] });
  }
  return loginToken(t, email);
}

export const productFixture = (titleUrl: string, overrides: Record<string, any> = {}) => ({
  titleUrl,
  tags: ['cars'],
  images: [],
  mainImage: { url: 'https://img.test/car.jpg', name: 'car' },
  dateAdded: new Date('2026-01-01'),
  en: {
    title: `Title ${titleUrl}`,
    description: 'Short description',
    descriptionFull: ['<p>Full description</p>'],
    regularPrice: 30,
    salePrice: 25,
    onSale: true,
    stock: '10',
    visibility: true,
    shipping: 'basic',
  },
  ...overrides,
});
