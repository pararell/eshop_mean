import { Test } from '@nestjs/testing';

import { DatabaseModule } from './database.module';

describe('DatabaseModule', () => {
  const original = process.env.DATABASE_URL;
  afterEach(() => {
    process.env.DATABASE_URL = original;
  });

  it('fails at startup when DATABASE_URL is not set', async () => {
    delete process.env.DATABASE_URL;

    await expect(Test.createTestingModule({ imports: [DatabaseModule] }).compile()).rejects.toThrow('DATABASE_URL is not set');
  });
});
