import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { dataSource } from '../data-source';
import { User } from '../entities/user.entity';
import { Order } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { OrderAddress } from '../entities/order-address.entity';
import { OrderStatusHistory } from '../entities/order-status-history.entity';
import { OrderReturn } from '../entities/order-return.entity';
import { OrderReturnItem } from '../entities/order-return-item.entity';
import { OrderReturnStatusHistory } from '../entities/order-return-status-history.entity';
import { Payment } from '../entities/payment.entity';
import { Product } from '../entities/product.entity';
import { ProductSKU } from '../entities/product-sku.entity';
import { Division } from '../entities/division.entity';
import { District } from '../entities/district.entity';
import { DeliveryType, OrderStatus, PaymentStatus } from '../enums/enums';

async function demo() {
  await dataSource.initialize();
  const qr = dataSource.createQueryRunner();
  await qr.startTransaction();
  try {
    let user = await qr.manager.findOne(User, {
      where: { phone: '01700000001' },
    });
    if (!user) {
      user = await qr.manager.save(User, {
        name: 'Rafiq Ahmed',
        phone: '01700000001',
        email: 'rafiq@example.com',
        passwordHash: await bcrypt.hash('User@12345', 10),
      });
    }
    const product = (await qr.manager.findOne(Product, { where: { id: 2 } }))!;
    const sku = (await qr.manager.findOne(ProductSKU, {
      where: { productId: 2 },
    }))!;
    const division = await qr.manager.findOne(Division, {
      where: { name: 'Dhaka' },
    });
    const district = await qr.manager.findOne(District, {
      where: { name: 'Dhaka' },
    });

    const existing = await qr.manager.count(Order);
    if (existing === 0) {
      const order = await qr.manager.save(Order, {
        orderNumber: 'JBC-1001',
        userId: user.id,
        status: OrderStatus.PROCESSING,
        deliveryType: DeliveryType.INSIDE_DHAKA,
        subtotal: 2000,
        deliveryCharge: 80,
        discountAmount: 0,
        total: 2080,
        paymentMethod: 'cod',
        paymentStatus: PaymentStatus.PENDING,
        note: 'Handle with care',
      });
      await qr.manager.save(OrderAddress, {
        orderId: order.id,
        recipientName: user.name,
        phone: user.phone,
        address: 'House 12, Road 5, Dhanmondi',
        divisionId: division?.id,
        districtId: district?.id,
      });
      const item = await qr.manager.save(OrderItem, {
        orderId: order.id,
        productId: product.id,
        productSKUId: sku.id,
        productName: product.name,
        skuData: sku.sku,
        quantity: 2,
        unitPrice: 890,
        unitDiscountedPricePrice: 1000,
        totalPrice: 1780,
        totalDiscountedPrice: 2000,
      });
      for (const s of [
        OrderStatus.PENDING,
        OrderStatus.CONFIRMED,
        OrderStatus.PROCESSING,
      ]) {
        await qr.manager.save(OrderStatusHistory, {
          orderId: order.id,
          status: s,
        });
      }

      const order2 = await qr.manager.save(Order, {
        orderNumber: 'JBC-1002',
        userId: user.id,
        status: OrderStatus.DELIVERED,
        deliveryType: DeliveryType.OUTSIDE_DHAKA,
        subtotal: 1190,
        deliveryCharge: 130,
        discountAmount: 180,
        total: 1140,
        paymentMethod: 'bkash',
        paymentStatus: PaymentStatus.PAID,
      });
      await qr.manager.save(OrderAddress, {
        orderId: order2.id,
        recipientName: user.name,
        phone: user.phone,
        address: 'Station Road, Chattogram',
        divisionId: division?.id,
      });
      await qr.manager.save(OrderItem, {
        orderId: order2.id,
        productId: product.id,
        productSKUId: sku.id,
        productName: product.name,
        skuData: sku.sku,
        quantity: 1,
        unitPrice: 1190,
        unitDiscountedPricePrice: 1010,
        totalPrice: 1190,
        totalDiscountedPrice: 1010,
      });
      await qr.manager.save(Payment, {
        orderId: order2.id,
        method: 'bkash',
        status: PaymentStatus.PAID,
        amount: 1140,
        transactionId: 'BKASH-TXN-9001',
        paidAt: new Date(),
      });
      for (const s of [
        OrderStatus.PENDING,
        OrderStatus.CONFIRMED,
        OrderStatus.PROCESSING,
        OrderStatus.SHIPPED,
        OrderStatus.DELIVERED,
      ]) {
        await qr.manager.save(OrderStatusHistory, {
          orderId: order2.id,
          status: s,
        });
      }
      const ret = await qr.manager.save(OrderReturn, {
        returnNumber: 'RET-1001',
        orderId: order2.id,
        userId: user.id,
        status: 'requested',
        reason: 'Wrong size received',
        refundAmount: 1010,
      });
      const item2 = (await qr.manager.findOne(OrderItem, {
        where: { orderId: order2.id },
      }))!;
      await qr.manager.save(OrderReturnItem, {
        orderReturnId: ret.id,
        orderItemId: item2.id,
        quantity: 1,
        reason: 'Wrong size',
      });
      await qr.manager.save(OrderReturnStatusHistory, {
        orderReturnId: ret.id,
        status: 'requested' as any,
      });
    }
    await qr.commitTransaction();
    console.log('demo data ready');
  } catch (e) {
    await qr.rollbackTransaction();
    console.error(e);
  } finally {
    await qr.release();
    await dataSource.destroy();
  }
}
demo();
