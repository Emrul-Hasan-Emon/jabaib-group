/**
 * Phase 9 step 5/6 — storefront catalog browsing flow against a spawned app:
 *   category tree with live product counts, attribute-filtered product list +
 *   facet counts, the customer wishlist (add/list/ids/remove), and the review
 *   lifecycle (submit → pending in "my reviews" → visible publicly only after
 *   an admin approves; duplicates rejected).
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
  type TestServer,
} from './helpers/e2e-harness';
import {
  AdminUser,
  Attribute,
  AttributeValue,
  Category,
  Product,
  ProductSKU,
  ProductSKUVariant,
  User,
} from '../src/database/entities';
import { AdminUserRoleEnum } from '../src/database/enums/user-type.enum';

const PASSWORD = 'Admin@12345';

describe('Phase 9 — storefront catalog browsing', () => {
  let server: TestServer;
  let adminToken: string;
  let userToken: string;
  let categoryId = 0;
  let productId = 0;
  let sizeMValueId = 0;
  let reviewId = 0;

  beforeAll(async () => {
    await ensureTestDatabase();
    await syncTestDatabase();

    const ds = await openTestDataSource();
    const passwordHash = await bcrypt.hash(PASSWORD, 10);
    await ds.getRepository(AdminUser).save(
      ds.getRepository(AdminUser).create({
        name: 'Root Admin',
        email: 'root@jabaib.test',
        passwordHash,
        role: AdminUserRoleEnum.SUPER_ADMIN,
      }),
    );

    const category = await ds.getRepository(Category).save(
      ds.getRepository(Category).create({
        name: 'Men',
        slug: 'men',
        sortOrder: 1,
        isActive: true,
      }),
    );
    categoryId = category.id;
    const attributeRepo = ds.getRepository(Attribute);
    const size = await attributeRepo.save(
      attributeRepo.create({ name: 'Size', slug: 'size', isActive: true }),
    );
    const values = await ds.getRepository(AttributeValue).save([
      ds.getRepository(AttributeValue).create({
        attributeId: size.id,
        name: 'S',
        sortOrder: 1,
        isActive: true,
      }),
      ds.getRepository(AttributeValue).create({
        attributeId: size.id,
        name: 'M',
        sortOrder: 2,
        isActive: true,
      }),
    ]);
    sizeMValueId = values[1].id;

    const product = await ds.getRepository(Product).save(
      ds.getRepository(Product).create({
        name: 'E2E Shirt',
        slug: 'e2e-shirt',
        description: 'Soft cotton',
        categoryId: category.id,
        isPublished: true,
        isActive: true,
      }),
    );
    productId = product.id;

    const sku = await ds.getRepository(ProductSKU).save(
      ds.getRepository(ProductSKU).create({
        productId: product.id,
        sku: 'E2E-SHIRT-M',
        price: 799,
        quantity: 5,
        isActive: true,
      }),
    );
    await ds.getRepository(ProductSKUVariant).save(
      ds.getRepository(ProductSKUVariant).create({
        productSKUId: sku.id,
        attributeId: size.id,
        attributeValueId: sizeMValueId,
        isActive: true,
      }),
    );

    const customer = await ds.getRepository(User).save(
      ds.getRepository(User).create({
        name: 'Storefront Tester',
        email: 'storetest@jabaib.test',
        phone: '01799990001',
        passwordHash,
        isActive: true,
      }),
    );
    void customer;
    await ds.destroy();

    server = await bootServer(await getFreePort());
    adminToken = await adminLogin(server.baseUrl, 'root@jabaib.test', PASSWORD);
  }, 120_000);

  afterAll(async () => {
    await server.stop();
  });

  it('registers a customer and gets tokens', async () => {
    const res = await api(
      server.baseUrl,
      'post',
      '/v1/user/auth/register',
      null,
      {
        name: 'Storefront Tester',
        email: 'storetest2@jabaib.test',
        phone: '01799990002',
        password: 'Secret@123',
      },
    );
    expect(res.status).toBe(201);
    expect(res.body.accessToken).toBeTruthy();
    userToken = res.body.accessToken as string;
  });

  it('category tree carries live product counts', async () => {
    const res = await api(
      server.baseUrl,
      'get',
      '/v1/user/category/tree',
      null,
    );
    expect(res.status).toBe(200);
    const root = res.body.find((c: any) => c.slug === 'men');
    expect(root).toBeTruthy();
    expect(root.productCount).toBe(1);
  });

  it('filters published products by attribute values', async () => {
    const res = await api(
      server.baseUrl,
      'get',
      `/v1/user/product?attrValues=${sizeMValueId}`,
      null,
    );
    expect(res.status).toBe(200);
    expect(res.body.pagination.totalItems).toBe(1);
    expect(res.body.data[0].slug).toBe('e2e-shirt');
    expect(res.body.data[0].priceFrom).toBe(799);
  });

  it('returns facet counts scoped to the category', async () => {
    const res = await api(
      server.baseUrl,
      'get',
      `/v1/user/product/facets?categoryId=${categoryId}`,
      null,
    );
    expect(res.status).toBe(200);
    const size = res.body.find((g: any) => g.attributeName === 'Size');
    expect(size).toBeTruthy();
    expect(size.values).toEqual([
      expect.objectContaining({ value: 'M', count: 1 }),
    ]);
  });

  it('wishlist add → ids → list → remove', async () => {
    let res = await api(
      server.baseUrl,
      'post',
      `/v1/user/wishlist/${productId}`,
      userToken,
    );
    expect(res.status).toBe(201);
    expect(res.body.added).toBe(true);

    res = await api(server.baseUrl, 'get', '/v1/user/wishlist/ids', userToken);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([productId]);

    res = await api(server.baseUrl, 'get', '/v1/user/wishlist', userToken);
    expect(res.status).toBe(200);
    expect(res.body[0].product.id).toBe(productId);

    res = await api(
      server.baseUrl,
      'delete',
      `/v1/user/wishlist/${productId}`,
      userToken,
    );
    expect(res.status).toBe(200);
    expect(res.body.removed).toBe(true);

    res = await api(server.baseUrl, 'get', '/v1/user/wishlist/ids', userToken);
    expect(res.body).toEqual([]);

    // Re-adding after a soft delete revives the row (unique index still holds it).
    res = await api(
      server.baseUrl,
      'post',
      `/v1/user/wishlist/${productId}`,
      userToken,
    );
    expect(res.status).toBe(201);
    expect(res.body.added).toBe(true);
    res = await api(server.baseUrl, 'get', '/v1/user/wishlist/ids', userToken);
    expect(res.body).toEqual([productId]);

    res = await api(
      server.baseUrl,
      'delete',
      `/v1/user/wishlist/${productId}`,
      userToken,
    );
    expect(res.status).toBe(200);
  });

  it('review lifecycle: pending → approved by admin → public', async () => {
    let res = await api(server.baseUrl, 'post', '/v1/user/review', userToken, {
      productId,
      rating: 5,
      comment: 'Excellent fabric, fits perfectly.',
    });
    expect(res.status).toBe(201);
    expect(res.body.isApproved).toBe(false);
    reviewId = res.body.id;

    // A second review for the same product is rejected.
    res = await api(server.baseUrl, 'post', '/v1/user/review', userToken, {
      productId,
      rating: 4,
    });
    expect(res.status).toBe(409);

    // Visible in the customer's own review list, marked pending.
    res = await api(server.baseUrl, 'get', '/v1/user/review/my', userToken);
    expect(res.status).toBe(200);
    expect(res.body.data[0]).toEqual(
      expect.objectContaining({
        id: reviewId,
        isApproved: false,
        product: expect.objectContaining({ id: productId }),
      }),
    );

    // Not public yet (moderation), so the product summary is zeroed.
    res = await api(
      server.baseUrl,
      'get',
      `/v1/user/review/product/${productId}`,
      null,
    );
    expect(res.status).toBe(200);
    expect(res.body.summary.count).toBe(0);
    expect(res.body.data).toEqual([]);

    // Admin approves it → it becomes public with a 5-star summary.
    res = await api(
      server.baseUrl,
      'patch',
      `/v1/admin/review/${reviewId}`,
      adminToken,
      { isApproved: true },
    );
    expect(res.status).toBe(200);

    res = await api(
      server.baseUrl,
      'get',
      `/v1/user/review/product/${productId}`,
      null,
    );
    expect(res.body.summary).toEqual(
      expect.objectContaining({ count: 1, average: 5 }),
    );
    expect(res.body.data[0]).toEqual(
      expect.objectContaining({
        rating: 5,
        comment: 'Excellent fabric, fits perfectly.',
        verified: false,
      }),
    );
  });
});
