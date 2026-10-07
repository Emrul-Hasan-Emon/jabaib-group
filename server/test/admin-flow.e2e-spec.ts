/**
 * Phase 7 step 2, 4, 6 — admin e2e flow against a spawned app + isolated DB:
 *   login → create category/attribute/product/SKU → publish → appears in list,
 *   permission checks (non-super_admin cannot reach admin-user endpoints),
 *   soft-deleted rows are excluded from list + tree.
 */
import bcrypt from 'bcrypt';
import {
  ensureTestDatabase,
  syncTestDatabase,
  openTestDataSource,
  getFreePort,
  bootServer,
  adminLogin,
  api,
  entityId,
  type TestServer,
} from './helpers/e2e-harness';
import { AdminUser } from '../src/database/entities';
import { AdminUserRoleEnum } from '../src/database/enums/user-type.enum';

const PASSWORD = 'Admin@12345';

describe('Phase 7 — admin e2e flow', () => {
  let server: TestServer;
  let superToken: string;
  let managerToken: string;
  let categoryId = 0;
  let attributeId = 0;
  let attributeValueId = 0;
  let productId = 0;
  let skuId = 0;

  beforeAll(async () => {
    await ensureTestDatabase();
    await syncTestDatabase();

    const ds = await openTestDataSource();
    const passwordHash = await bcrypt.hash(PASSWORD, 10);
    const admins = ds.getRepository(AdminUser);
    await admins.save(
      admins.create({
        name: 'Root Admin',
        email: 'root@jabaib.test',
        passwordHash,
        role: AdminUserRoleEnum.SUPER_ADMIN,
      }),
    );
    await admins.save(
      admins.create({
        name: 'Mid Manager',
        email: 'manager@jabaib.test',
        passwordHash,
        role: AdminUserRoleEnum.ADMIN,
      }),
    );
    await ds.destroy();

    server = await bootServer(await getFreePort());
    superToken = await adminLogin(server.baseUrl, 'root@jabaib.test', PASSWORD);
    managerToken = await adminLogin(
      server.baseUrl,
      'manager@jabaib.test',
      PASSWORD,
    );
  }, 120_000);

  afterAll(async () => {
    await server?.stop();
  });

  it('logs an admin in and returns a usable bearer token', () => {
    expect(superToken).toEqual(expect.any(String));
  });

  describe('permission checks (Step 4)', () => {
    it('rejects a non-super_admin role from admin-user endpoints (403)', async () => {
      const res = await api(
        server.baseUrl,
        'post',
        '/v1/admin/admin-user',
        managerToken,
        {
          name: 'Sneaky Editor',
          email: 'sneaky@jabaib.test',
          password: 'Pass@1234',
          role: AdminUserRoleEnum.EDITOR,
        },
      );
      expect(res.status).toBe(403);
    });

    it('lets a super_admin create an admin (201)', async () => {
      const res = await api(
        server.baseUrl,
        'post',
        '/v1/admin/admin-user',
        superToken,
        {
          name: 'New Editor',
          email: 'new-editor@jabaib.test',
          password: 'Pass@1234',
          role: AdminUserRoleEnum.EDITOR,
        },
      );
      expect(res.status).toBe(201);
      expect(res.body.id).toEqual(expect.any(Number));
    });
  });

  describe('catalog creation + publish flow (Step 2)', () => {
    it('creates a category and lists it', async () => {
      const create = await api(
        server.baseUrl,
        'post',
        '/v1/admin/category',
        superToken,
        { name: 'E2E Apparel', isActive: true },
      );
      expect(create.status).toBe(201);
      categoryId = entityId(create.body);

      const list = await api(
        server.baseUrl,
        'get',
        '/v1/admin/category',
        superToken,
      );
      expect(list.status).toBe(200);
      expect(list.body.data.map((c: any) => c.id)).toContain(categoryId);
    });

    it('creates an attribute with a value and lists it', async () => {
      const create = await api(
        server.baseUrl,
        'post',
        '/v1/admin/attribute',
        superToken,
        { name: 'E2E Size', values: [{ name: 'M' }] },
      );
      expect(create.status).toBe(201);
      attributeId = entityId(create.body);
      attributeValueId = Number(create.body.values?.[0]?.id);

      const list = await api(
        server.baseUrl,
        'get',
        '/v1/admin/attribute',
        superToken,
      );
      expect(list.status).toBe(200);
      expect(list.body.data.map((a: any) => a.id)).toContain(attributeId);
    });

    it('creates a product, publishes it, and lists it', async () => {
      const create = await api(
        server.baseUrl,
        'post',
        '/v1/admin/product',
        superToken,
        {
          name: 'E2E Cotton Tee',
          categoryId,
          isPublished: true,
          isActive: true,
        },
      );
      expect(create.status).toBe(201);
      productId = entityId(create.body);

      const list = await api(
        server.baseUrl,
        'get',
        '/v1/admin/product',
        superToken,
      );
      expect(list.status).toBe(200);
      expect(list.body.data.map((p: any) => p.id)).toContain(productId);
    });

    it('creates a SKU bound to the attribute value and lists it', async () => {
      const create = await api(
        server.baseUrl,
        'post',
        `/v1/admin/product/${productId}/skus`,
        superToken,
        {
          sku: 'E2E-TEE-M',
          price: 599,
          quantity: 25,
          variants: [{ attributeId, attributeValueId }],
        },
      );
      expect(create.status).toBe(201);
      skuId = entityId(create.body);

      const list = await api(
        server.baseUrl,
        'get',
        `/v1/admin/product/${productId}/skus`,
        superToken,
      );
      expect(list.status).toBe(200);
      const skus: any[] = Array.isArray(list.body) ? list.body : list.body.data;
      expect(skus.map((s: any) => s.id)).toContain(skuId);
      expect(skus.find((s: any) => s.id === skuId).sku).toBe('E2E-TEE-M');
    });
  });

  describe('soft-delete exclusion (Step 6)', () => {
    it('removes a soft-deleted category from list and tree', async () => {
      const remove = await api(
        server.baseUrl,
        'delete',
        `/v1/admin/category/${categoryId}`,
        superToken,
      );
      expect(remove.status).toBe(200);

      const list = await api(
        server.baseUrl,
        'get',
        '/v1/admin/category',
        superToken,
      );
      expect(list.body.data.map((c: any) => c.id)).not.toContain(categoryId);

      const tree = await api(
        server.baseUrl,
        'get',
        '/v1/admin/category/tree',
        superToken,
      );
      const flatten = (nodes: any[]): any[] =>
        nodes.flatMap((n) => [n, ...flatten(n.childrenNodes ?? [])]);
      expect(flatten(tree.body).map((c: any) => c.id)).not.toContain(
        categoryId,
      );
    });
  });
});
