/**
 * Phase 7 step 3 — order + return status flows against a spawned app:
 *   a legal order transition writes an OrderStatusHistory row stamped with the
 *   acting admin; illegal transitions are rejected; the return flow writes its
 *   own history and carries refund details.
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
import { AdminUser, User, Order, OrderReturn } from '../src/database/entities';
import { AdminUserRoleEnum } from '../src/database/enums/user-type.enum';
import {
  DeliveryType,
  OrderStatus,
  OrderReturnStatus,
  PaymentMethod,
  PaymentStatus,
} from '../src/database/enums/enums';

const PASSWORD = 'Admin@12345';

describe('Phase 7 — order + return status flows', () => {
  let server: TestServer;
  let token: string;
  let orderId = 0;
  let returnId = 0;

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
    const customer = await ds.getRepository(User).save(
      ds.getRepository(User).create({
        name: 'E2E Customer',
        email: 'customer@jabaib.test',
        phone: '01700000001',
        passwordHash,
        isActive: true,
      }),
    );
    const order = await ds.getRepository(Order).save(
      ds.getRepository(Order).create({
        orderNumber: 'E2E-ORD-1001',
        userId: customer.id,
        status: OrderStatus.PENDING,
        deliveryType: DeliveryType.INSIDE_DHAKA,
        paymentMethod: PaymentMethod.COD,
        paymentStatus: PaymentStatus.PENDING,
        subtotal: 1200,
        deliveryCharge: 80,
        discountAmount: 100,
        total: 1180,
      }),
    );
    orderId = order.id;
    const ret = await ds.getRepository(OrderReturn).save(
      ds.getRepository(OrderReturn).create({
        returnNumber: 'E2E-RET-2001',
        orderId: order.id,
        userId: customer.id,
        status: OrderReturnStatus.REQUESTED,
        reason: 'Wrong size received',
        refundAmount: 0,
      }),
    );
    returnId = ret.id;
    await ds.destroy();

    server = await bootServer(await getFreePort());
    token = await adminLogin(server.baseUrl, 'root@jabaib.test', PASSWORD);
  }, 120_000);

  afterAll(async () => {
    await server?.stop();
  });

  describe('order status flow (Step 3)', () => {
    it('rejects a skipped transition before any history is written (400)', async () => {
      const res = await api(
        server.baseUrl,
        'patch',
        `/v1/admin/order/${orderId}/status`,
        token,
        { status: OrderStatus.DELIVERED },
      );
      expect(res.status).toBe(400);
    });

    it('moves PENDING -> CONFIRMED and writes a history row with the actor', async () => {
      const update = await api(
        server.baseUrl,
        'patch',
        `/v1/admin/order/${orderId}/status`,
        token,
        { status: OrderStatus.CONFIRMED, note: 'e2e-verified' },
      );
      expect(update.status).toBe(200);

      const detail = await api(
        server.baseUrl,
        'get',
        `/v1/admin/order/${orderId}`,
        token,
      );
      expect(detail.status).toBe(200);
      expect(detail.body.status).toBe(OrderStatus.CONFIRMED);
      const history = detail.body.statusHistory ?? [];
      expect(history).toContainEqual(
        expect.objectContaining({
          orderId,
          status: OrderStatus.CONFIRMED,
          note: 'e2e-verified',
          creatorType: 'admin',
          creatorName: 'Root Admin',
        }),
      );
    });
  });

  describe('return status flow (Step 3)', () => {
    it('rejects REQUESTED -> COMPLETED (400)', async () => {
      const res = await api(
        server.baseUrl,
        'patch',
        `/v1/admin/order-return/${returnId}/status`,
        token,
        { status: OrderReturnStatus.COMPLETED },
      );
      expect(res.status).toBe(400);
    });

    it('approves REQUESTED -> APPROVED and writes return history + refund fields', async () => {
      const update = await api(
        server.baseUrl,
        'patch',
        `/v1/admin/order-return/${returnId}/status`,
        token,
        {
          status: OrderReturnStatus.APPROVED,
          note: 'approved for pickup',
          refundAmount: 900,
          refundMethod: 'bkash',
        },
      );
      expect(update.status).toBe(200);

      const detail = await api(
        server.baseUrl,
        'get',
        `/v1/admin/order-return/${returnId}`,
        token,
      );
      expect(detail.status).toBe(200);
      expect(detail.body.status).toBe(OrderReturnStatus.APPROVED);
      expect(Number(detail.body.refundAmount)).toBe(900);
      const history = detail.body.statusHistory ?? [];
      expect(history).toContainEqual(
        expect.objectContaining({
          orderReturnId: returnId,
          status: OrderReturnStatus.APPROVED,
          note: 'approved for pickup',
          creatorType: 'admin',
          creatorName: 'Root Admin',
        }),
      );
    });
  });
});
