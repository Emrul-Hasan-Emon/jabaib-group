/**
 * Phase 10 — cart → checkout → orders → returns against a spawned app:
 *   guest cart prices and stock clamping, merge into the customer cart on login,
 *   coupon validation, atomic order placement (order/items/address/payment/
 *   history/coupon usage), cancel while pending, and a return request inside the
 *   post-delivery window.
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
  Coupon,
  Product,
  ProductSKU,
  ProductSKUVariant,
  ShippingZone,
} from '../src/database/entities';
import { AdminUserRoleEnum } from '../src/database/enums/user-type.enum';
import {
  CouponType,
  DeliveryType,
  PaymentMethod,
} from '../src/database/enums/enums';

const PASSWORD = 'Admin@12345';
const GUEST_SESSION = 'e2e-guest-session-0001';

describe('Phase 10 — cart, checkout, orders and returns', () => {
  let server: TestServer;
  let adminToken: string;
  let userToken: string;
  let productId = 0;
  let skuId = 0;
  let orderId = 0;
  let orderItemId = 0;

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

    const category = await ds.getRepository(Category).save(
      ds.getRepository(Category).create({
        name: 'Men',
        slug: 'men',
        sortOrder: 1,
        isActive: true,
      }),
    );
    const size = await ds.getRepository(Attribute).save(
      ds.getRepository(Attribute).create({
        name: 'Size',
        slug: 'size',
        isActive: true,
      }),
    );
    const value = await ds.getRepository(AttributeValue).save(
      ds.getRepository(AttributeValue).create({
        attributeId: size.id,
        name: 'M',
        sortOrder: 1,
        isActive: true,
      }),
    );

    const product = await ds.getRepository(Product).save(
      ds.getRepository(Product).create({
        name: 'Checkout Tee',
        slug: 'checkout-tee',
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
        sku: 'CHECKOUT-TEE-M',
        price: 1000,
        quantity: 10,
        isActive: true,
      }),
    );
    skuId = sku.id;
    await ds.getRepository(ProductSKUVariant).save(
      ds.getRepository(ProductSKUVariant).create({
        productSKUId: sku.id,
        attributeId: size.id,
        attributeValueId: value.id,
        isActive: true,
      }),
    );

    await ds.getRepository(ShippingZone).save([
      ds.getRepository(ShippingZone).create({
        name: 'Inside Dhaka',
        code: DeliveryType.INSIDE_DHAKA,
        charge: 60,
        estimatedDays: 2,
        isActive: true,
      }),
      ds.getRepository(ShippingZone).create({
        name: 'Outside Dhaka',
        code: DeliveryType.OUTSIDE_DHAKA,
        charge: 120,
        estimatedDays: 5,
        isActive: true,
      }),
    ]);

    await ds.getRepository(Coupon).save([
      ds.getRepository(Coupon).create({
        code: 'E2E25',
        type: CouponType.PERCENT,
        amount: 25,
        minOrderAmount: 500,
        maxDiscountAmount: 750,
        usageLimit: 0,
        usedCount: 0,
        perUserLimit: 1,
        isActive: true,
      }),
      ds.getRepository(Coupon).create({
        code: 'BIGSPEND',
        type: CouponType.FLAT,
        amount: 200,
        minOrderAmount: 5000,
        isActive: true,
      }),
    ]);

    await ds.destroy();

    server = await bootServer(await getFreePort());
    adminToken = await adminLogin(server.baseUrl, 'root@jabaib.test', PASSWORD);
  }, 120_000);

  afterAll(async () => {
    await server.stop();
  });

  const guest = (
    method: 'get' | 'post' | 'patch' | 'delete',
    path: string,
    payload?: unknown,
  ) => api(server.baseUrl, method, path, null, payload);

  const asUser = (
    method: 'get' | 'post' | 'patch' | 'delete',
    path: string,
    payload?: unknown,
    token: string = userToken,
  ) => api(server.baseUrl, method, path, token, payload);

  /** Guest cart calls carry the cart-session header instead of a token. */
  const guestCart = (
    method: 'get' | 'post' | 'patch' | 'delete',
    path: string,
    payload?: unknown,
  ) =>
    api(server.baseUrl, method, path, null, payload, {
      'x-cart-session': GUEST_SESSION,
    });

  it('registers a customer', async () => {
    const res = await api(
      server.baseUrl,
      'post',
      '/v1/user/auth/register',
      null,
      {
        name: 'Checkout Tester',
        email: 'checkout@jabaib.test',
        phone: '01755550001',
        password: 'Secret@123',
      },
    );
    expect(res.status).toBe(201);
    userToken = res.body.accessToken as string;
  });

  it('guests can build a cart priced from the SKU', async () => {
    let res = await guestCart('post', '/v1/user/cart/items', {
      productId,
      productSKUId: skuId,
      quantity: 2,
    });
    expect(res.status).toBe(201);
    expect(res.body.items[0]).toEqual(
      expect.objectContaining({
        name: 'Checkout Tee',
        skuLabel: 'M',
        quantity: 2,
        unitPrice: 1000,
      }),
    );
    expect(res.body.totals).toEqual({
      itemCount: 2,
      subtotal: 2000,
      total: 2000,
      savings: 0,
    });

    // a guest without a session gets an empty cart rather than an error
    res = await guest('get', '/v1/user/cart');
    expect(res.body.totals.itemCount).toBe(0);

    // quantity updates clamp to live stock (10 available)
    res = await guestCart('patch', '/v1/user/cart/items/1', { quantity: 99 });
    expect(res.body.items[0].quantity).toBe(10);
    expect(res.body.totals.total).toBe(10000);

    res = await guestCart('patch', '/v1/user/cart/items/1', { quantity: 2 });
    expect(res.body.items[0].quantity).toBe(2);
  });

  it('merges the guest cart into the signed-in cart', async () => {
    const res = await api(
      server.baseUrl,
      'post',
      '/v1/user/cart/merge',
      userToken,
      { sessionId: GUEST_SESSION },
    );
    expect(res.status).toBe(201);
    expect(res.body.totals.itemCount).toBe(2);

    const after = await asUser('get', '/v1/user/cart');
    expect(after.body.totals.total).toBe(2000);

    // the guest cart is consumed
    const guestAfter = await guestCart('get', '/v1/user/cart');
    expect(guestAfter.body.totals.itemCount).toBe(0);
  });

  it('validates coupons before checkout', async () => {
    let res = await api(
      server.baseUrl,
      'get',
      '/v1/user/coupon/e2e25/preview?subtotal=2000',
      userToken,
    );
    expect(res.body).toEqual({
      valid: true,
      code: 'E2E25',
      type: CouponType.PERCENT,
      discountAmount: 500,
    });

    res = await api(
      server.baseUrl,
      'get',
      '/v1/user/coupon/NOPE/preview?subtotal=2000',
      userToken,
    );
    expect(res.body.valid).toBe(false);

    // basket below the minimum
    res = await api(
      server.baseUrl,
      'get',
      '/v1/user/coupon/bigspend/preview?subtotal=1000',
      userToken,
    );
    expect(res.body).toEqual(
      expect.objectContaining({ valid: false, discountAmount: 0 }),
    );
  });

  it('previews checkout totals with delivery charge and coupon', async () => {
    const res = await asUser('post', '/v1/user/checkout/preview', {
      recipientName: 'Checkout Tester',
      phone: '01755550001',
      address: 'House 9, Road 3, Dhanmondi',
      deliveryType: DeliveryType.INSIDE_DHAKA,
      paymentMethod: PaymentMethod.COD,
      couponCode: 'E2E25',
    });
    expect(res.status).toBe(200);
    expect(res.body.totals).toEqual({
      itemCount: 2,
      listTotal: 2000,
      subtotal: 2000,
      deliveryCharge: 60,
      discountAmount: 500,
      total: 1560,
    });
    expect(res.body.delivery).toEqual(
      expect.objectContaining({ charge: 60, estimatedDays: 2 }),
    );
  });

  it('requires a transaction reference for online payments', async () => {
    const res = await asUser('post', '/v1/user/order', {
      recipientName: 'Checkout Tester',
      phone: '01755550001',
      address: 'House 9, Road 3',
      deliveryType: DeliveryType.INSIDE_DHAKA,
      paymentMethod: PaymentMethod.BKASH,
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/transaction reference/i);
  });

  it('places the order atomically and empties the cart', async () => {
    const res = await asUser('post', '/v1/user/order', {
      recipientName: 'Checkout Tester',
      phone: '01755550001',
      address: 'House 9, Road 3, Dhanmondi',
      deliveryType: DeliveryType.INSIDE_DHAKA,
      paymentMethod: PaymentMethod.COD,
      couponCode: 'E2E25',
      note: 'Call before delivery',
    });
    expect(res.status).toBe(201);
    orderId = res.body.id as number;
    expect(orderId).toBeTruthy();

    const detail = await asUser('get', `/v1/user/order/${orderId}`);
    expect(detail.body).toEqual(
      expect.objectContaining({
        status: 'pending',
        deliveryType: DeliveryType.INSIDE_DHAKA,
        subtotal: 2000,
        deliveryCharge: 60,
        discountAmount: 500,
        total: 1560,
        couponCode: 'E2E25',
        note: 'Call before delivery',
        canCancel: true,
      }),
    );
    expect(detail.body.items).toHaveLength(1);
    orderItemId = detail.body.items[0].id;
    expect(detail.body.address).toEqual(
      expect.objectContaining({ recipientName: 'Checkout Tester' }),
    );
    expect(detail.body.payments[0]).toEqual(
      expect.objectContaining({ method: PaymentMethod.COD, status: 'pending' }),
    );
    expect(detail.body.statusHistory[0]).toEqual(
      expect.objectContaining({ status: 'pending' }),
    );

    // stock dropped by the ordered quantity, cart is empty
    const cart = await asUser('get', '/v1/user/cart');
    expect(cart.body.totals.itemCount).toBe(0);
    const product = await asUser('get', `/v1/user/product/${productId}`);
    expect(product.body.skus[0].quantity).toBe(8);

    // coupon usage was recorded exactly once
    const history = await api(
      server.baseUrl,
      'get',
      '/v1/admin/coupon/1/history',
      adminToken,
    );
    expect(history.body).toHaveLength(1);
    expect(history.body[0]).toEqual(
      expect.objectContaining({
        couponCode: 'E2E25',
        discountAmount: 500,
        orderTotal: 1560,
      }),
    );
  });

  it('blocks a second use of the same coupon for this customer', async () => {
    await asUser('post', '/v1/user/cart/items', {
      productId,
      productSKUId: skuId,
      quantity: 1,
    });
    const res = await asUser('post', '/v1/user/order', {
      recipientName: 'Checkout Tester',
      phone: '01755550001',
      address: 'House 9, Road 3',
      deliveryType: DeliveryType.OUTSIDE_DHAKA,
      paymentMethod: PaymentMethod.COD,
      couponCode: 'E2E25',
    });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/maximum number of times/i);
  });

  it('cancels a pending order and refuses to cancel twice', async () => {
    await asUser('post', '/v1/user/order', {
      recipientName: 'Checkout Tester',
      phone: '01755550001',
      address: 'House 9, Road 3',
      deliveryType: DeliveryType.OUTSIDE_DHAKA,
      paymentMethod: PaymentMethod.COD,
    });
    const list = await asUser('get', '/v1/user/order?size=5');
    const pending = list.body.data.find((o: any) => o.status === 'pending');
    expect(pending).toBeTruthy();

    let res = await asUser('post', `/v1/user/order/${pending.id}/cancel`, {
      reason: 'Ordered by mistake',
    });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('cancelled');

    res = await asUser('post', `/v1/user/order/${pending.id}/cancel`, {});
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Only pending orders/i);
  });

  it('moves the order to delivered and accepts one return request', async () => {
    for (const status of ['confirmed', 'processing', 'shipped', 'delivered']) {
      const res = await api(
        server.baseUrl,
        'patch',
        `/v1/admin/order/${orderId}/status`,
        adminToken,
        { status },
      );
      expect(res.status).toBe(200);
    }

    const delivered = await asUser('get', `/v1/user/order/${orderId}`);
    expect(delivered.body.canReturn).toBe(true);
    expect(delivered.body.returnWindowEnds).toEqual(expect.any(String));

    const res = await asUser('post', `/v1/user/order/${orderId}/return`, {
      reason: 'Fabric colour is different from the photo',
      items: [{ orderItemId, quantity: 1, reason: 'Wrong shade' }],
    });
    expect(res.status).toBe(201);
    expect(res.body.returnNumber).toMatch(/^RET-\d{6}-[0-9A-F]{4}$/);

    // a second request while one is open is rejected
    const again = await asUser('post', `/v1/user/order/${orderId}/return`, {
      reason: 'again',
      items: [{ orderItemId, quantity: 1 }],
    });
    expect(again.status).toBe(400);
    expect(again.body.message).toMatch(/already open/i);
  });

  it('shows the order in history with its return', async () => {
    const detail = await asUser('get', `/v1/user/order/${orderId}`);
    expect(detail.body.returns).toHaveLength(1);
    // one unit at the effective unit price (1000, no active discount window)
    expect(detail.body.returns[0]).toEqual(
      expect.objectContaining({ status: 'requested', refundAmount: 1000 }),
    );
    expect(detail.body.canReturn).toBe(false);

    const list = await asUser('get', '/v1/user/order?size=10');
    expect(list.body.data.length).toBeGreaterThanOrEqual(2);
    expect(list.body.data[0]).toEqual(
      expect.objectContaining({ orderNumber: expect.any(String) }),
    );
  });
});
