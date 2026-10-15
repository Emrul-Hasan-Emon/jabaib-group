import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { PaymentMethod, PaymentStatus } from '../../database/enums/enums';
import { Payment } from '../../database/entities/payment.entity';
import { PaymentCallbackDto } from '../dtos/payment-callback.dto';

/** Payment rows written by a gateway callback are stamped as such. */
const CREATOR = { creatorType: 'gateway', creatorName: 'payment-callback' };

@Injectable()
export class PaymentCallbackService {
  constructor(private readonly database: DatabaseService) {}

  async handle(provider: PaymentMethod, dto: PaymentCallbackDto) {
    const order = await this.database.order.findOne({
      where: { id: dto.orderId },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.paymentMethod !== (provider as string)) {
      throw new BadRequestException(
        `Order ${dto.orderId} was not placed with ${provider}`,
      );
    }

    // Already settled: providers retry callbacks, so replaying the SAME
    // reference is a no-op, while a different reference for a paid order is a
    // mistake we must not silently book as a second payment.
    if (order.paymentStatus === (PaymentStatus.PAID as string)) {
      const existing = await this.database.payment.findOne({
        where: { orderId: dto.orderId, transactionId: dto.transactionId },
      });
      if (existing) return existing;
      throw new BadRequestException(`Order ${dto.orderId} is already paid`);
    }

    // A gateway must settle the exact amount the customer owes — a mismatched
    // amount means the reference belongs to a different order.
    const orderTotal = Number(order.total);
    if (
      dto.amount != null &&
      Math.abs(Number(dto.amount) - orderTotal) > 0.01
    ) {
      throw new BadRequestException(
        `Amount ${dto.amount} does not match order total ${orderTotal}`,
      );
    }

    const status =
      dto.status === 'success' ? PaymentStatus.PAID : PaymentStatus.FAILED;
    const paidAt = status === PaymentStatus.PAID ? new Date() : undefined;

    // Settle the payment row that already exists for this reference rather than
    // inserting a second one: order placement books a `pending` payment carrying
    // the customer's TrxID, so always inserting left a duplicate `pending` row
    // behind on every online order.
    const existing = await this.database.payment.findOne({
      where: { orderId: dto.orderId, transactionId: dto.transactionId },
    });

    let payment: Payment;
    if (existing) {
      existing.status = status;
      existing.amount = dto.amount ?? orderTotal;
      if (paidAt ?? existing.paidAt) existing.paidAt = paidAt ?? existing.paidAt;
      if (dto.raw) existing.providerResponse = dto.raw;
      existing.updaterType = 'gateway';
      existing.updaterName = 'payment-callback';
      payment = await this.database.payment.save(existing);
    } else {
      payment = await this.database.payment.save(
        this.database.payment.create({
          orderId: dto.orderId,
          method: provider,
          status,
          amount: dto.amount ?? orderTotal,
          transactionId: dto.transactionId,
          providerResponse: dto.raw,
          paidAt,
          ...CREATOR,
        }),
      );
    }

    order.paymentStatus = status;
    await this.database.order.save(order);
    return payment;
  }
}
