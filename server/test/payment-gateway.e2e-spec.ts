/**
 * Payment gateways against a spawned app: admin CRUD with the conditional
 * manual-field rules, backend-generated slugs, rich-text sanitizing, the
 * storefront list (active only) and checkout writing the manual proof into
 * `Payment.metaData` — plus the untouched cod/bkash paths.
 */
import bcrypt from 'bcrypt';
import { AdminUser, Category, Product, ProductSKU, User } from '../src/database/entities';
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
import { AdminUserRoleEnum } from '../src/database/enums/user-type.enum';

const PASSWORD = 'Admin@12345';

describe('Payment gateways — admin management and checkout', () => {
  let server: TestServer;
  let adminToken: string;
  let customerToken: string;
  let productId = 0;

  const admin = (
    method: 'get' | 'post' | 'patch' | 'delete',
    path: string,
    body?: unknown,
  ) => api(server.baseUrl, method, path, adminToken, body);

  const asCustomer = (
    method: 'get' | 'post' | 'patch' | 'delete',
    path: string,
    body?: unknown,
  ) => api(server.baseUrl, method, path, customerToken, body);

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
        name: 'Gateway Customer',
        email: 'gateway@jabaib.test',
        phone: '01855558888',
        passwordHash: await bcrypt.hash(PASSWORD, 10),
        isActive: true,
      }),
    );
    // A published product with one in-stock SKU, so checkout has something to buy.
    const category = await ds.getRepository(Category).save(
      ds.getRepository(Category).create({
        name: 'Gateway Tees',
        slug: 'gateway-tees',
        isActive: true,
      }),
    );
    const product = await ds.getRepository(Product).save(
      ds.getRepository(Product).create({
        name: 'Gateway Tee',
        slug: 'gateway-tee',
        categoryId: category.id,
        isPublished: true,
        isActive: true,
      }),
    );
    await ds.getRepository(ProductSKU).save(
      ds.getRepository(ProductSKU).create({
        productId: product.id,
        sku: 'GW-TEE-1',
        price: 500,
        quantity: 10,
        isActive: true,
      }),
    );
    productId = product.id;
    await ds.destroy();

    server = await bootServer(await getFreePort());
    adminToken = await adminLogin(server.baseUrl, 'root@jabaib.test', PASSWORD);
    const login = await api(
      server.baseUrl,
      'post',
      '/v1/user/auth/login',
      null,
      { emailOrPhone: 'gateway@jabaib.test', password: PASSWORD },
    );
    customerToken = login.body.accessToken;
  }, 120_000);

  afterAll(async () => {
    await server.stop();
  });

  describe('admin management', () => {
    it('creates a manual MFS gateway and generates the slug', async () => {
      const res = await admin('post', '/v1/admin/payment-gateway', {
        name: 'bKash Wallet',
        nameBN: 'বিকাশ ওয়ালেট',
        type: 'mfs',
        isManual: true,
        accountName: 'Jabaib Fashion Ltd.',
        accountNumber: '01700000000',
        description: '<p>Send to <strong>01700000000</strong></p>',
        // a client-supplied slug must never win
        slug: 'attacker-slug',
      });
      expect(res.status).toBe(201);
      expect(res.body).toEqual(
        expect.objectContaining({
          slug: 'bkash-wallet',
          type: 'mfs',
          isManual: true,
          isActive: true,
          accountName: 'Jabaib Fashion Ltd.',
        }),
      );
    });

    it('strips scripts from the rich-text description', async () => {
      const list = await admin('get', '/v1/admin/payment-gateway?q=bKash');
      const stored = list.body.data[0].description as string;
      expect(stored).toBe('<p>Send to <strong>01700000000</strong></p>');
      expect(stored).not.toContain('script');
    });

    it('refuses a manual MFS gateway with no account number', async () => {
      const res = await admin('post', '/v1/admin/payment-gateway', {
        name: 'Nagad',
        nameBN: 'নগদ',
        type: 'mfs',
        isManual: true,
        accountName: 'Jabaib',
      });
      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body.message)).toMatch(/accountNumber/i);
    });

    it('refuses a manual bank gateway with no branch', async () => {
      const res = await admin('post', '/v1/admin/payment-gateway', {
        name: 'DBBL',
        nameBN: 'ডিবিবিএল',
        type: 'bank',
        isManual: true,
        accountName: 'Jabaib',
        accountNumber: '01700000000',
        bankName: 'Dutch-Bangla Bank',
      });
      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body.message)).toMatch(/branchName/i);
    });

    it('creates a manual bank gateway with all four fields', async () => {
      const res = await admin('post', '/v1/admin/payment-gateway', {
        name: 'DBBL Transfer',
        nameBN: 'ডিবিবিএল ট্রান্সফার',
        type: 'bank',
        isManual: true,
        accountName: 'Jabaib Fashion Ltd.',
        accountNumber: '01700000000',
        bankName: 'Dutch-Bangla Bank',
        branchName: 'Dhanmondi',
      });
      expect(res.status).toBe(201);
      expect(res.body.slug).toBe('dbbl-transfer');
    });

    it('requires a provider for an automated gateway', async () => {
      const res = await admin('post', '/v1/admin/payment-gateway', {
        name: 'Card via gateway',
        nameBN: 'কার্ড',
        type: 'mfs',
        isManual: false,
      });
      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body.message)).toMatch(/provider/i);
    });

    it('creates an automated gateway bound to a provider', async () => {
      const res = await admin('post', '/v1/admin/payment-gateway', {
        name: 'Nagad Auto',
        nameBN: 'নগদ অটো',
        type: 'mfs',
        isManual: false,
        provider: 'nagad',
      });
      expect(res.status).toBe(201);
      expect(res.body).toEqual(
        expect.objectContaining({ provider: 'nagad', isManual: false }),
      );
    });

    it('gives a duplicate name a unique slug', async () => {
      const first = await admin('post', '/v1/admin/payment-gateway', {
        name: 'Rocket',
        nameBN: 'রকেট',
        type: 'mfs',
        isManual: true,
        accountName: 'Jabaib',
        accountNumber: '01700000000',
      });
      const second = await admin('post', '/v1/admin/payment-gateway', {
        name: 'Rocket',
        nameBN: 'রকেট',
        type: 'mfs',
        isManual: true,
        accountName: 'Jabaib',
        accountNumber: '01700000000',
      });
      expect(first.body.slug).toBe('rocket');
      expect(second.body.slug).toBe('rocket-2');
    });

    it('re-checks the merged row when the type flips to bank', async () => {
      const list = await admin('get', '/v1/admin/payment-gateway?q=Rocket');
      const id = list.body.data[0].id;
      const res = await admin('patch', `/v1/admin/payment-gateway/${id}`, {
        type: 'bank',
      });
      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body.message)).toMatch(/bankName/i);
    });

    it('soft deletes a gateway', async () => {
      const throwaway = await admin('post', '/v1/admin/payment-gateway', {
        name: 'Retired Wallet',
        nameBN: 'অবসর্তৃত',
        type: 'mfs',
        isManual: true,
        accountName: 'Jabaib',
        accountNumber: '01700000000',
      });
      const id = throwaway.body.id;
      const res = await admin('delete', `/v1/admin/payment-gateway/${id}`);
      expect(res.status).toBe(200);
      const after = await admin(
        'get',
        `/v1/admin/payment-gateway/${id}`,
      );
      expect(after.status).toBe(404);
    });
  });

  describe('storefront list', () => {
    it('lists only active gateways with their input spec', async () => {
      const res = await api(server.baseUrl, 'get', '/v1/user/payment-gateway', null);
      expect(res.status).toBe(200);
      const mfs = res.body.find((g: any) => g.slug === 'bkash-wallet');
      expect(mfs).toEqual(
        expect.objectContaining({
          isManual: true,
          accountNumber: '01700000000',
          description: '<p>Send to <strong>01700000000</strong></p>',
        }),
      );
      expect(mfs.fields.map((f: any) => f.key)).toEqual(['txnId']);

      const bank = res.body.find((g: any) => g.slug === 'dbbl-transfer');
      expect(bank.fields.map((f: any) => f.key)).toEqual([
        'accountName',
        'accountNumber',
        'bankName',
        'branchName',
      ]);

      const automated = res.body.find((g: any) => g.isManual === false);
      expect(automated.fields).toEqual([]);
    });

    it('hides an inactive gateway', async () => {
      const list = await admin('get', '/v1/admin/payment-gateway?q=DBBL Transfer');
      const id = list.body.data[0].id;
      await admin('patch', `/v1/admin/payment-gateway/${id}`, {
        isActive: false,
      });
      const res = await api(server.baseUrl, 'get', '/v1/user/payment-gateway', null);
      expect(res.body.some((g: any) => g.slug === 'dbbl-transfer')).toBe(false);
      await admin('patch', `/v1/admin/payment-gateway/${id}`, {
        isActive: true,
      });
    });
  });

  describe('checkout', () => {
    const address = {
      recipientName: 'Gateway Customer',
      phone: '01855558888',
      address: 'House 9, Road 9, Dhanmondi',
      deliveryType: 'inside_dhaka',
    };

    async function gatewayId(slug: string) {
      const res = await api(server.baseUrl, 'get', '/v1/user/payment-gateway', null);
      return res.body.find((g: any) => g.slug === slug)?.id as number;
    }

    async function fillCart() {
      await asCustomer('post', '/v1/user/cart/items', {
        productId,
        quantity: 1,
      });
    }

    it('records a manual MFS payment with the txn id in metaData', async () => {
      await fillCart();
      const id = await gatewayId('bkash-wallet');
      const res = await asCustomer('post', '/v1/user/order', {
        ...address,
        paymentMethod: 'cod',
        paymentGatewayId: id,
        paymentMetaData: { txnId: 'TXN123456' },
      });
      expect(res.status).toBe(201);
      const detail = await asCustomer('get', `/v1/user/order/${res.body.id}`);
      expect(detail.body.paymentMethod).toBe('bkash-wallet');
      expect(detail.body.payments).toEqual([
        expect.objectContaining({
          method: 'bkash-wallet',
          status: 'pending',
          transactionId: 'TXN123456',
          metaData: { txnId: 'TXN123456' },
        }),
      ]);
    });

    it('refuses a manual MFS payment with no transaction id', async () => {
      await fillCart();
      const id = await gatewayId('bkash-wallet');
      const res = await asCustomer('post', '/v1/user/order', {
        ...address,
        paymentMethod: 'cod',
        paymentGatewayId: id,
      });
      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body.message)).toMatch(/Transaction ID/i);
    });

    it('records a manual bank payment with every account detail', async () => {
      await fillCart();
      const id = await gatewayId('dbbl-transfer');
      const res = await asCustomer('post', '/v1/user/order', {
        ...address,
        paymentMethod: 'cod',
        paymentGatewayId: id,
        paymentMetaData: {
          accountName: 'Gateway Customer',
          accountNumber: '01855558888',
          bankName: 'Dutch-Bangla Bank',
          branchName: 'Dhanmondi',
        },
      });
      expect(res.status).toBe(201);
      const detail = await asCustomer('get', `/v1/user/order/${res.body.id}`);
      expect(detail.body.payments[0]).toEqual(
        expect.objectContaining({
          method: 'dbbl-transfer',
          // no single reference for a transfer, so the account number is used
          transactionId: '01855558888',
          metaData: {
            accountName: 'Gateway Customer',
            accountNumber: '01855558888',
            bankName: 'Dutch-Bangla Bank',
            branchName: 'Dhanmondi',
          },
        }),
      );
    });

    it('refuses a manual bank payment missing a field', async () => {
      await fillCart();
      const id = await gatewayId('dbbl-transfer');
      const res = await asCustomer('post', '/v1/user/order', {
        ...address,
        paymentMethod: 'cod',
        paymentGatewayId: id,
        paymentMetaData: { accountName: 'Gateway Customer' },
      });
      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body.message)).toMatch(/Account number/i);
    });

    it('refuses an inactive gateway at checkout', async () => {
      await fillCart();
      const list = await admin('get', '/v1/admin/payment-gateway?q=DBBL Transfer');
      const row = list.body.data[0];
      await admin('patch', `/v1/admin/payment-gateway/${row.id}`, {
        isActive: false,
      });
      const res = await asCustomer('post', '/v1/user/order', {
        ...address,
        paymentMethod: 'cod',
        paymentGatewayId: row.id,
        paymentMetaData: { txnId: 'TXN1' },
      });
      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body.message)).toMatch(/not available/i);
      await admin('patch', `/v1/admin/payment-gateway/${row.id}`, {
        isActive: true,
      });
    });

    it('404s for a gateway that does not exist', async () => {
      await fillCart();
      const res = await asCustomer('post', '/v1/user/order', {
        ...address,
        paymentMethod: 'cod',
        paymentGatewayId: 987654,
        paymentMetaData: { txnId: 'TXN1' },
      });
      expect(res.status).toBe(404);
    });

    it('keeps the existing cod flow working with no gateway selected', async () => {
      await fillCart();
      const res = await asCustomer('post', '/v1/user/order', {
        ...address,
        paymentMethod: 'cod',
      });
      expect(res.status).toBe(201);
      const detail = await asCustomer('get', `/v1/user/order/${res.body.id}`);
      expect(detail.body.paymentMethod).toBe('cod');
      expect(detail.body.payments[0]).toEqual(
        expect.objectContaining({ method: 'cod', status: 'pending' }),
      );
      expect(detail.body.payments[0].metaData ?? null).toBeNull();
    });

    it('keeps requiring a reference for the automated bkash method', async () => {
      await fillCart();
      const res = await asCustomer('post', '/v1/user/order', {
        ...address,
        paymentMethod: 'bkash',
      });
      expect(res.status).toBe(400);
      expect(JSON.stringify(res.body.message)).toMatch(/transaction reference/i);
    });

    it('settles an automated gateway through its existing provider path', async () => {
      await fillCart();
      const list = await admin('get', '/v1/admin/payment-gateway?q=Nagad');
      const automated = list.body.data.find((g: any) => g.isManual === false);
      const res = await asCustomer('post', '/v1/user/order', {
        ...address,
        paymentMethod: 'cod',
        paymentGatewayId: automated.id,
        transactionId: 'NAG123',
      });
      expect(res.status).toBe(201);
      const detail = await asCustomer('get', `/v1/user/order/${res.body.id}`);
      // recorded under the bound provider, so the callback still settles it
      expect(detail.body.paymentMethod).toBe('nagad');
      expect(detail.body.payments[0]).toEqual(
        expect.objectContaining({
          method: 'nagad',
          transactionId: 'NAG123',
        }),
      );
    });

    it('previews the same payment method the order will record', async () => {
      await fillCart();
      const id = await gatewayId('bkash-wallet');
      const res = await asCustomer('post', '/v1/user/checkout/preview', {
        ...address,
        paymentMethod: 'cod',
        paymentGatewayId: id,
        paymentMetaData: { txnId: 'TXN123456' },
      });
      expect(res.status).toBe(200);
      expect(res.body.payment).toEqual(
        expect.objectContaining({ method: 'bkash-wallet' }),
      );
    });
  });
});