import { INestApplication } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { getModelToken } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { of } from 'rxjs';
import request from 'supertest';

import { AppModule } from '../../src/app.module';
import { setAppDB } from '../../src/setAppDB';

/** Mocked outbound HTTP (reCAPTCHA siteverify, geolocation). Override `post` per test. */
export const httpMock = {
  post: jest.fn(() => of({ data: { success: true } })),
  get: jest.fn(() => of({ data: {} })),
};

export interface TestApp {
  app: INestApplication;
  http: ReturnType<typeof request>;
  model: <T = any>(name: string) => Model<T>;
  close: () => Promise<void>;
}

/** Boots the real AppModule with the same middleware as production (session, cookies, CORS). */
export async function createTestApp(): Promise<TestApp> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(HttpService)
    .useValue(httpMock)
    .compile();

  const app = moduleRef.createNestApplication<NestExpressApplication>();
  setAppDB(app);
  await app.init();

  return {
    app,
    http: request(app.getHttpServer()),
    model: <T>(name: string) => moduleRef.get<Model<T>>(getModelToken(name)),
    close: async () => {
      // connect-mongo creates its TTL index in the background; let it finish first
      await mongoose.connection.asPromise();
      await eventually(async () => {
        const ready = await mongoose.connection.db!.collection('session').indexExists('expires_1');
        if (!ready) throw new Error('session store not ready');
      });
      await app.close();
      await mongoose.disconnect(); // session-store connection opened by setAppDB
    },
  };
}

/** Polls until `check` passes; several services persist without awaiting the write. */
export async function eventually<T>(
  check: () => Promise<T>,
  { timeout = 3000, interval = 50 } = {},
): Promise<T> {
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
  { email, password = 'secret1', roles = [] as string[] },
) {
  const salt = await bcrypt.genSalt();
  const hash = await bcrypt.hash(password, salt);
  return t.model('User').create({ email, password: hash, salt, roles });
}

export async function loginToken(t: TestApp, email: string, password = 'secret1') {
  const res = await t.http.post('/api/auth/signin').send({ email, password }).expect(201);
  return res.body.accessToken as string;
}

export async function adminToken(t: TestApp, email = 'admin@test.dev') {
  await createUser(t, { email, roles: ['admin'] });
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
