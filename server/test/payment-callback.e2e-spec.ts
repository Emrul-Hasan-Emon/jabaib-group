/**
 * Payment gateway callbacks against a spawned app: the signature gate, the
 * provider/order match, amount validation, and replay safety.
 */
import * as crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import { AdminUser, Order, Payment, User } from '../src/database/entities';
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
import { AdminUserRoleEnum } from '../src/database/enums/user-type.enum';

const PASSWORD = 'Admin@12345';
const SECRET = 'e2e-callback-secret';

describe('Payment callbacks — signature, validation and replay', () => {
  let server: TestServer;
  let adminToken: string;
  let customerId = 0;
  let orderId = 0;
  let total = 0;

  /** HMAC exactly as the controller expects it. */
  const sign = (payload: unknown) =>
    crypto
      .createHmac('sha256', SECRET)
      .update(JSON.stringify(payload))
      .digest('hex');

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
    const customer = await ds.getRepository(User).save(
      ds.getRepository(User).create({
        name: 'Callback Customer',
        email: 'callback@jabaib.test',
        phone: '01755558888',
        passwordHash: await bcrypt.hash(PASSWORD, 10),
        isActive: true,
      }),
    );
    customerId = customer.id;
    await ds.destroy();

    server = await bootServer(await getFreePort(), {
      PAYMENT_CALLBACK_SECRET: SECRET,
    });
    adminToken = await adminLogin(server.baseUrl, 'root@jabaib.test', PASSWORD);
  }, 120_000);

  afterAll(async () => {
    await server.stop();
  });

  /** A bKash order placed straight through the admin API is not available, so
   *  the row is seeded the way checkout would write it. */
  async function seedOnlineOrder(paymentMethod: string, status = 'pending') {
    const ds = await openTestDataSource();
    const order = await ds.getRepository(Order).save(
      ds.getRepository(Order).create({
        orderNumber: `JAB-CB-${Date.now()}`,
        userId: customerId,
        status: 'pending',
        deliveryType: 'inside_dhaka',
        subtotal: 1500,
        deliveryCharge: 60,
        discountAmount: 0,
        total: 1560,
        paymentMethod,
        paymentStatus: status,
      }),
    );
    await ds.destroy();
    total = Number(order.total);
    return order.id;
  }

  const callback = (
    provider: string,
    body: Record<string, unknown>,
    signature?: string,
  ) => {
    const req = fetch(`${server.baseUrl}/v1/payment/callback/${provider}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(signature ? { 'x-callback-signature': signature } : {}),
      },
      body: JSON.stringify(body),
    });
    return req.then(async (res) => ({
      status: res.status,
      body: await res.json(),
    }));
  };

  it('rejects an unknown provider', async () => {
    orderId = await seedOnlineOrder('bkash');
    const body = { orderId, transactionId: 'TX-A', status: 'success' };
    const res = await callback('bitcoin', body, sign(body));
    expect(res.status).toBe(400);
  });

  it('rejects a callback with no signature', async () => {
    const body = { orderId, transactionId: 'TX-B', status: 'success' };
    const res = await callback('bkash', body);
    expect(res.status).toBe(401);
  });

  it('rejects a bad signature', async () => {
    const body = { orderId, transactionId: 'TX-C', status: 'success' };
    const res = await callback('bkash', body, 'deadbeef');
    expect(res.status).toBe(401);
  });

  it('accepts a correctly signed success callback and marks the order paid', async () => {
    const body = {
      orderId,
      transactionId: 'TX-D',
      status: 'success',
      amount: total,
    };
    const res = await callback('bkash', body, sign(body));
    expect(res.status).toBe(201);
    expect(res.body).toEqual(
      expect.objectContaining({
        status: 'paid',
        transactionId: 'TX-D',
        creatorType: 'gateway',
      }),
    );

    const order = await api(
      server.baseUrl,
      'get',
      `/v1/admin/order/${orderId}`,
      adminToken,
    );
    expect(order.body.paymentStatus).toBe('paid');
  });

  it('is idempotent when the same reference is replayed', async () => {
    const body = {
      orderId,
      transactionId: 'TX-D',
      status: 'success',
      amount: total,
    };
    const res = await callback('bkash', body, sign(body));
    expect(res.status).toBe(201);
    const payments = await api(
      server.baseUrl,
      'get',
      `/v1/admin/order/${orderId}`,
      adminToken,
    );
    const paidRows = (payments.body.payments ?? []).filter(
      (p: { transactionId: string | null }) => p.transactionId === 'TX-D',
    );
    expect(paidRows).toHaveLength(1);
  });

  it('settles the pending payment created at order placement without duplicating it', async () => {
    // Reproduces the real online-order shape: checkout books a `pending`
    // payment carrying the customer's TrxID, then the gateway calls back.
    const fresh = await seedOnlineOrder('bkash');
    const ds = await openTestDataSource();
    const repo = ds.getRepository(Payment);
    await repo.save(
      repo.create({
        orderId: fresh,
        method: 'bkash',
        status: 'pending',
        amount: total,
        transactionId: 'TX-PLACED',
        createdBy: customerId,
        creatorType: 'user',
      }),
    );
    await ds.destroy();

    const body = {
      orderId: fresh,
      transactionId: 'TX-PLACED',
      status: 'success',
      amount: total,
    };
    const res = await callback('bkash', body, sign(body));
    expect(res.status).toBe(201);

    const after = await api(
      server.baseUrl,
      'get',
      `/v1/admin/order/${fresh}`,
      adminToken,
    );
    const rows = after.body.payments ?? [];
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual(
      expect.objectContaining({
        transactionId: 'TX-PLACED',
        status: 'paid',
      }),
    );
    expect(after.body.paymentStatus).toBe('paid');
  });

  it('refuses a different reference for an already paid order', async () => {
    const body = { orderId, transactionId: 'TX-OTHER', status: 'success' };
    const res = await callback('bkash', body, sign(body));
    expect(res.status).toBe(400);
    expect(String(res.body.message)).toMatch(/already paid/i);
  });

  it('rejects a mismatched amount', async () => {
    const fresh = await seedOnlineOrder('nagad');
    const body = {
      orderId: fresh,
      transactionId: 'TX-E',
      status: 'success',
      amount: 1,
    };
    const res = await callback('nagad', body, sign(body));
    expect(res.status).toBe(400);
    expect(String(res.body.message)).toMatch(/does not match order total/i);
  });

  it('rejects a callback for a COD order', async () => {
    const cod = await seedOnlineOrder('cod');
    const body = { orderId: cod, transactionId: 'TX-F', status: 'success' };
    const res = await callback('bkash', body, sign(body));
    expect(res.status).toBe(400);
    expect(String(res.body.message)).toMatch(/was not placed with bkash/i);
  });

  it('records a failed callback', async () => {
    const fresh = await seedOnlineOrder('bkash');
    const body = { orderId: fresh, transactionId: 'TX-G', status: 'failed' };
    const res = await callback('bkash', body, sign(body));
    expect(res.status).toBe(201);
    expect(res.body).toEqual(expect.objectContaining({ status: 'failed' }));
    // a failed settlement never carries a paidAt stamp
    expect(res.body.paidAt ?? null).toBeNull();

    // a later success for the same reference still settles the order
    const retry = { ...body, status: 'success' };
    const ok = await callback('bkash', retry, sign(retry));
    expect(ok.status).toBe(201);
    expect(ok.body.status).toBe('paid');
  });
});
