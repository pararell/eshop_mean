import { createTestApp, createUser, loginToken, TestApp } from '../utils/test-app';

/** Every admin-only endpoint must reject anonymous users and logged-in non-admins. */
const adminEndpoints: [method: 'get' | 'post' | 'patch' | 'delete', path: string][] = [
  ['get', '/api/products/all'],
  ['post', '/api/products/add'],
  ['patch', '/api/products/edit'],
  ['delete', '/api/products/some-product'],
  ['get', '/api/products/categories/all'],
  ['patch', '/api/products/categories/edit'],
  ['delete', '/api/products/categories/some-category'],
  ['get', '/api/orders/all'],
  ['get', '/api/orders/some-order'],
  ['patch', '/api/orders'],
  ['get', '/api/translations/all'],
  ['patch', '/api/translations/all'],
  ['patch', '/api/translations?lang=en'],
  ['get', '/api/admin/images'],
  ['post', '/api/admin/images/add'],
  ['post', '/api/admin/images/upload'],
  ['post', '/api/admin/images/remove'],
  ['post', '/api/eshop/page'],
  ['delete', '/api/eshop/page/some-page'],
  ['post', '/api/eshop/theme'],
  ['delete', '/api/eshop/theme/some-theme'],
  ['post', '/api/eshop/config'],
  ['delete', '/api/eshop/config/some-config'],
  ['get', '/api/admin/ai/status'],
  ['post', '/api/admin/products/ai-draft'],
];

describe('Admin authorization', () => {
  let t: TestApp;
  let userToken: string;

  beforeAll(async () => {
    t = await createTestApp();
    await createUser(t, { email: 'customer@test.dev' });
    userToken = await loginToken(t, 'customer@test.dev');
  });
  afterAll(() => t.close());

  it.each(adminEndpoints)('%s %s rejects anonymous requests', async (method, path) => {
    await t.http[method](path).set('lang', 'en').expect(401);
  });

  it.each(adminEndpoints)('%s %s rejects non-admin users', async (method, path) => {
    // RolesGuard currently answers 401 (not 403) for authenticated non-admins, see audit BUG-24
    await t.http[method](path).set('lang', 'en').set('Authorization', `Bearer ${userToken}`).expect(401);
  });
});
