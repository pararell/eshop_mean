import { createTestApp, createUser, loginToken, TestApp } from '../utils/test-app';

describe('Auth API', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(() => t.close());
  beforeEach(() => t.model('User').deleteMany({}));

  describe('POST /api/auth/signup', () => {
    it('creates a user with a hashed password', async () => {
      await t.http.post('/api/auth/signup').send({ email: 'new@test.dev', password: 'abc12', name: 'New' }).expect(201);

      const user: any = await t.model('User').findOne({ email: 'new@test.dev' }).lean();
      expect(user.name).toBe('New');
      expect(user.password).not.toBe('abc12');
      expect(user.roles).toEqual([]);
    });

    it('ignores client-supplied roles (SEC-01 regression)', async () => {
      await t.http
        .post('/api/auth/signup')
        .send({ email: 'attacker@test.dev', password: 'abc12', roles: ['admin'] })
        .expect(201);

      const user: any = await t.model('User').findOne({ email: 'attacker@test.dev' }).lean();
      expect(user.roles).toEqual([]);
    });

    it('rejects a duplicate email', async () => {
      await createUser(t, { email: 'dup@test.dev' });
      await t.http.post('/api/auth/signup').send({ email: 'dup@test.dev', password: 'abc12' }).expect(409);
    });

    it('rejects a password without a digit', async () => {
      await t.http.post('/api/auth/signup').send({ email: 'weak@test.dev', password: 'abcdef' }).expect(400);
    });
  });

  describe('POST /api/auth/signin', () => {
    it('returns a JWT and the user profile', async () => {
      const user = await createUser(t, { email: 'user@test.dev' });

      const res = await t.http.post('/api/auth/signin').send({ email: 'user@test.dev', password: 'secret1' }).expect(201);

      expect(res.body).toMatchObject({ email: 'user@test.dev', id: String(user._id), roles: [] });
      expect(res.body.accessToken).toEqual(expect.any(String));
    });

    it('rejects a wrong password', async () => {
      await createUser(t, { email: 'user@test.dev' });
      await t.http.post('/api/auth/signin').send({ email: 'user@test.dev', password: 'wrong1' }).expect(401);
    });

    it('rejects an unknown user', async () => {
      await t.http.post('/api/auth/signin').send({ email: 'nobody@test.dev', password: 'secret1' }).expect(401);
    });

    it('accepts a password outside the sign-up rule (e.g. the seeded admin)', async () => {
      // 24 characters, no digit: sign-up would reject it, but sign-in only compares the hash
      const password = 'a-long-seeded-passphrase';
      await createUser(t, { email: 'seeded@test.dev', password });

      await t.http.post('/api/auth/signin').send({ email: 'seeded@test.dev', password }).expect(201);
      await t.http.post('/api/auth/signin').send({ email: 'seeded@test.dev', password: 'a-long-seeded-passphrasX' }).expect(401);
    });

    it('rejects an empty or oversized password', async () => {
      await createUser(t, { email: 'user@test.dev' });
      await t.http.post('/api/auth/signin').send({ email: 'user@test.dev', password: '' }).expect(400);
      await t.http
        .post('/api/auth/signin')
        .send({ email: 'user@test.dev', password: 'x'.repeat(73) })
        .expect(400);
    });
  });

  describe('GET /api/auth', () => {
    it('returns the current user for a valid token', async () => {
      await createUser(t, { email: 'me@test.dev', roles: ['admin'] });
      const token = await loginToken(t, 'me@test.dev');

      const res = await t.http.get('/api/auth').set('Authorization', `Bearer ${token}`).expect(200);

      expect(res.body).toMatchObject({ email: 'me@test.dev', roles: ['admin'] });
    });

    it('rejects missing or invalid tokens', async () => {
      await t.http.get('/api/auth').expect(401);
      await t.http.get('/api/auth').set('Authorization', 'Bearer not-a-jwt').expect(401);
    });
  });
});
