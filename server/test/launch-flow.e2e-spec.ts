/**
 * Phase 12 — full launch-readiness flow against a spawned app + isolated DB.
 *
 * Unlike the per-phase specs (which each prove one slice in isolation), this
 * chains the whole journey end to end in one spawned server + one dataset:
 *   admin manages catalog -> customer registers, browses, carts, applies a
 *   coupon, checks out COD -> admin confirms/ships/delivers the order ->
 *   customer requests a return -> admin approves the return -> customer
 *   submits a review (auto-verified from the delivered order) -> admin
 *   approves the review -> it appears on the public product page.
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
import { AdminUser, Coupon, ShippingZone } from '../src/database/entities';
import { AdminUserRoleEnum } from '../src/database/enums/user-type.enum';
import {
  CouponType,
  DeliveryType,
  PaymentMethod,
} from '../src/database/enums/enums';

const PASSWORD = 'Admin@12345';

describe('Phase 12 — full launch flow (admin + customer, end to end)', () => {
  let server: TestServer;
  let adminToken: string;
  let userToken: string;
  let categoryId = 0;
  let attributeId = 0;
  let attributeValueId = 0;
  let productId = 0;
  let orderId = 0;
  let orderItemId = 0;
  let returnId = 0;
  let reviewId = 0;

  const asAdmin = (
    method: 'get' | 'post' | 'patch' | 'delete',
    path: string,
    payload?: unknown,
  ) => api(server.baseUrl, method, path, adminToken, payload);

  const asUser = (
    method: 'get' | 'post' | 'patch' | 'delete',
    path: string,
    payload?: unknown,
  ) => api(server.baseUrl, method, path, userToken, payload);

  beforeAll(async () => {
    await ensureTestDatabase();
    await syncTestDatabase();

    const ds = await openTestDataSource();
    await ds.getRepository(AdminUser).save(
      ds.getRepository(AdminUser).create({
        name: 'Root Admin',
        email: 'root@jabaib.test',
        passwordHash: await bcrypt.hash(PASSWORD, 10),
        role: AdminUserRoleEnum.SUPER_ADMIN,
      }),
    );
    // Shipping zones are infrastructure seed data, not a catalog step the
    // admin flow under test is exercising.
    await ds.getRepository(ShippingZone).save([
      ds.getRepository(ShippingZone).create({
        name: 'Inside Dhaka',
        code: DeliveryType.INSIDE_DHAKA,
        charge: 60,
        estimatedDays: 2,
        isActive: true,
      }),
    ]);
    await ds.getRepository(Coupon).save(
      ds.getRepository(Coupon).create({
        code: 'LAUNCH10',
        type: CouponType.FLAT,
        amount: 100,
        minOrderAmount: 1000,
        usageLimit: 0,
        usedCount: 0,
        perUserLimit: 1,
        isActive: true,
      }),
    );
    await ds.destroy();

    server = await bootServer(await getFreePort());
    adminToken = await adminLogin(server.baseUrl, 'root@jabaib.test', PASSWORD);
  }, 120_000);

  afterAll(async () => {
    await server?.stop();
  });

  describe('admin manages catalog', () => {
    it('creates and publishes a category + product + SKU', async () => {
      const category = await asAdmin('post', '/v1/admin/category', {
        name: 'Launch Apparel',
        isActive: true,
      });
      expect(category.status).toBe(201);
      categoryId = entityId(category.body);

      const product = await asAdmin('post', '/v1/admin/product', {
        name: 'Launch Tee',
        categoryId,
        isPublished: true,
        isActive: true,
      });
      expect(product.status).toBe(201);
      productId = entityId(product.body);

      const attribute = await asAdmin('post', '/v1/admin/attribute', {
        name: 'Size',
        values: [{ name: 'M' }],
      });
      expect(attribute.status).toBe(201);
      attributeId = entityId(attribute.body);
      attributeValueId = Number(attribute.body.values?.[0]?.id);

      const sku = await asAdmin('post', `/v1/admin/product/${productId}/skus`, {
        sku: 'LAUNCH-TEE-1',
        price: 1200,
        quantity: 15,
        variants: [{ attributeId, attributeValueId }],
      });
      expect(sku.status).toBe(201);
    });
  });

  describe('customer registers, browses and buys', () => {
    it('registers a customer', async () => {
      const res = await api(
        server.baseUrl,
        'post',
        '/v1/user/auth/register',
        null,
        {
          name: 'Launch Customer',
          email: 'launch-customer@jabaib.test',
          phone: '01799990000',
          password: 'Secret@123',
        },
      );
      expect(res.status).toBe(201);
      userToken = res.body.accessToken as string;
    });

    it('browses the published product via list, slug and detail', async () => {
      const list = await asUser('get', '/v1/user/product');
      expect(list.body.data.map((p: any) => p.id)).toContain(productId);

      const bySlug = await asUser('get', '/v1/user/product/slug/launch-tee');
      expect(bySlug.status).toBe(200);

      const detail = await asUser('get', `/v1/user/product/${productId}`);
      expect(detail.status).toBe(200);
      expect(detail.body.skus[0]).toEqual(
        expect.objectContaining({ price: 1200, quantity: 15 }),
      );
    });

    it('adds to cart and checks out with COD', async () => {
      const add = await asUser('post', '/v1/user/cart/items', {
        productId,
        quantity: 1,
      });
      expect(add.status).toBe(201);
      expect(add.body.totals.total).toBe(1200);

      const preview = await asUser(
        'get',
        '/v1/user/coupon/launch10/preview?subtotal=1200',
      );
      expect(preview.body).toEqual(
        expect.objectContaining({ valid: true, discountAmount: 100 }),
      );

      const order = await asUser('post', '/v1/user/order', {
        recipientName: 'Launch Customer',
        phone: '01799990000',
        address: 'House 1, Road 1, Dhanmondi',
        deliveryType: DeliveryType.INSIDE_DHAKA,
        paymentMethod: PaymentMethod.COD,
        couponCode: 'LAUNCH10',
      });
      expect(order.status).toBe(201);
      orderId = order.body.id as number;

      const detail = await asUser('get', `/v1/user/order/${orderId}`);
      orderItemId = detail.body.items[0].id;
      expect(detail.body.status).toBe('pending');
      expect(detail.body.total).toBe(1160); // subtotal 1200 + delivery 60 - coupon 100
    });
  });

  describe('admin processes the order and the return', () => {
    it('confirms, ships and delivers the order (writes status history)', async () => {
      for (const status of [
        'confirmed',
        'processing',
        'shipped',
        'delivered',
      ]) {
        const res = await asAdmin(
          'patch',
          `/v1/admin/order/${orderId}/status`,
          { status },
        );
        expect(res.status).toBe(200);
      }
      const detail = await asAdmin('get', `/v1/admin/order/${orderId}`);
      expect(detail.body.statusHistory).toHaveLength(5); // pending + 4 transitions
    });

    it('marks COD payment received', async () => {
      const res = await asAdmin('post', `/v1/admin/order/${orderId}/payment`, {
        transactionId: 'COD-RECEIVED',
      });
      expect(res.status).toBe(201);
      expect(res.body.status).toBe('paid');
    });

    it('customer requests a return, admin approves it', async () => {
      const request = await asUser('post', `/v1/user/order/${orderId}/return`, {
        reason: 'Wrong size delivered',
        items: [{ orderItemId, quantity: 1, reason: 'Too small' }],
      });
      expect(request.status).toBe(201);
      returnId = entityId(request.body);

      const approve = await asAdmin(
        'patch',
        `/v1/admin/order-return/${returnId}/status`,
        { status: 'approved' },
      );
      expect(approve.status).toBe(200);
      expect(approve.body.status).toBe('approved');
    });
  });

  describe('customer reviews the product, admin moderates it', () => {
    it('submits a review auto-linked to the delivered order', async () => {
      const res = await asUser('post', '/v1/user/review', {
        productId,
        rating: 5,
        comment: 'True to size, great fabric.',
      });
      expect(res.status).toBe(201);
      expect(res.body.isApproved).toBe(false);
      reviewId = entityId(res.body);
    });

    it('hides it from the public feed until approved, then shows it as verified', async () => {
      const before = await asUser(
        'get',
        `/v1/user/review/product/${productId}`,
      );
      expect(before.body.summary.count).toBe(0);

      const approve = await asAdmin('patch', `/v1/admin/review/${reviewId}`, {
        isApproved: true,
      });
      expect(approve.status).toBe(200);

      const after = await asUser('get', `/v1/user/review/product/${productId}`);
      expect(after.body.summary).toEqual(
        expect.objectContaining({ count: 1, average: 5 }),
      );
      expect(after.body.data[0]).toEqual(
        expect.objectContaining({ rating: 5, verified: true }),
      );
    });
  });
});
