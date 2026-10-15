/**
 * Phase 12 — full launch-readiness flow against a spawned app + isolated DB.
 *
 * Unlike the per-phase specs (which each prove one slice in isolation), this
 * chains the whole journey end to end in one spawned server + one dataset:
 *   admin manages catalog + a manual MFS payment gateway -> customer
 *   registers, browses, carts, applies a coupon, checks out paying through
 *   that gateway (txn id lands in Payment.metaData) -> admin confirms/
 *   ships/delivers the order -> customer requests a return -> admin
 *   approves the return -> customer submits a review (auto-verified from
 *   the delivered order) -> admin approves the review -> it appears on the
 *   public product page.
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
  let skuId = 0;
  let gatewayId = 0;
  let stockBeforeCancel = 0;
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
      skuId = entityId(sku.body);
    });

    it('creates a manual bKash gateway for customers to pay through', async () => {
      const gateway = await asAdmin('post', '/v1/admin/payment-gateway', {
        name: 'bKash',
        nameBN: 'বিকাশ',
        type: 'mfs',
        isManual: true,
        accountName: 'Jabaib Fashion Ltd.',
        accountNumber: '01700000000',
        description: '<p>Send payment to <strong>01700000000</strong>.</p>',
      });
      expect(gateway.status).toBe(201);
      expect(gateway.body.slug).toBe('bkash');
      gatewayId = entityId(gateway.body);
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

    it('sees the manual bKash gateway in the active storefront list', async () => {
      const gateways = await asUser('get', '/v1/user/payment-gateway');
      expect(gateways.status).toBe(200);
      const bkash = gateways.body.find((g: any) => g.id === gatewayId);
      expect(bkash).toEqual(
        expect.objectContaining({ slug: 'bkash', isManual: true }),
      );
      expect(bkash.fields.map((f: any) => f.key)).toEqual(['txnId']);
    });

    it('adds to cart and checks out paying through the bKash gateway', async () => {
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
        paymentGatewayId: gatewayId,
        paymentMetaData: { txnId: 'TXN-LAUNCH-1' },
        couponCode: 'LAUNCH10',
      });
      expect(order.status).toBe(201);
      orderId = order.body.id as number;

      const detail = await asUser('get', `/v1/user/order/${orderId}`);
      orderItemId = detail.body.items[0].id;
      expect(detail.body.status).toBe('pending');
      expect(detail.body.total).toBe(1160); // subtotal 1200 + delivery 60 - coupon 100
      expect(detail.body.paymentMethod).toBe('bkash');
      expect(detail.body.payments[0]).toEqual(
        expect.objectContaining({
          method: 'bkash',
          transactionId: 'TXN-LAUNCH-1',
          metaData: { txnId: 'TXN-LAUNCH-1' },
        }),
      );
    });
  });

  describe('cancelling a pending order returns the reserved stock', () => {
    let cancelOrderId = 0;

    it('reserves stock while the order is pending', async () => {
      const before = await asUser('get', `/v1/user/product/${productId}`);
      stockBeforeCancel = before.body.skus[0].quantity;

      const add = await asUser('post', '/v1/user/cart/items', {
        productId,
        quantity: 2,
      });
      expect(add.status).toBe(201);

      const order = await asUser('post', '/v1/user/order', {
        recipientName: 'Cancel Customer',
        phone: '01799990000',
        address: 'House 2, Road 2, Dhanmondi',
        deliveryType: DeliveryType.INSIDE_DHAKA,
        paymentMethod: PaymentMethod.COD,
      });
      expect(order.status).toBe(201);
      cancelOrderId = order.body.id as number;

      const detail = await asUser('get', `/v1/user/product/${productId}`);
      expect(detail.body.skus[0].quantity).toBe(stockBeforeCancel - 2);
    });

    it('gives the units back when the customer cancels', async () => {
      const res = await asUser(
        'post',
        `/v1/user/order/${cancelOrderId}/cancel`,
        { reason: 'Ordered by mistake' },
      );
      expect(res.status).toBe(201);

      const detail = await asUser('get', `/v1/user/product/${productId}`);
      expect(detail.body.skus[0].id).toBe(skuId);
      expect(detail.body.skus[0].quantity).toBe(stockBeforeCancel);
    });

    it('will not cancel the same order twice', async () => {
      const res = await asUser('post', `/v1/user/order/${cancelOrderId}/cancel`, {});
      expect(res.status).toBe(400);
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

    it('settles the pending bKash payment by its txn id instead of stacking a new one', async () => {
      const res = await asAdmin('post', `/v1/admin/order/${orderId}/payment`, {
        transactionId: 'TXN-LAUNCH-1',
      });
      expect(res.status).toBe(201);
      expect(res.body.status).toBe('paid');

      const detail = await asAdmin('get', `/v1/admin/order/${orderId}`);
      expect(detail.body.payments).toHaveLength(1);
      expect(detail.body.payments[0]).toEqual(
        expect.objectContaining({
          method: 'bkash',
          status: 'paid',
          transactionId: 'TXN-LAUNCH-1',
          metaData: { txnId: 'TXN-LAUNCH-1' },
        }),
      );
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
