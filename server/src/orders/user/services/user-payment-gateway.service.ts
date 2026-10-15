import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { PaymentGateway } from '../../../database/entities';
import {
  manualPaymentFields,
  validateManualMetaData,
} from '../../utils/payment-gateway.util';

/**
 * Storefront side of payment gateways: the list customers may pick from, plus
 * the checkout resolution that turns a chosen gateway into a payment method and
 * a validated `metaData` payload.
 */
@Injectable()
export class UserPaymentGatewayService {
  constructor(private readonly database: DatabaseService) {}

  /**
   * Active gateways only — an inactive gateway must never be offered or
   * accepted at checkout. Each row carries `fields`, the per-type list of what a
   * manual customer has to submit, so the checkout UI never hardcodes it.
   */
  async listActive() {
    const gateways = await this.database.paymentGateway.find({
      where: { isActive: true },
      order: { id: 'ASC' },
    });
    return gateways.map((gateway) => this.toPublicView(gateway));
  }

  private toPublicView(gateway: PaymentGateway) {
    const isManual = gateway.isManual === true;
    return {
      id: gateway.id,
      name: gateway.name,
      nameBN: gateway.nameBN,
      slug: gateway.slug,
      type: gateway.type,
      isManual,
      description: gateway.description ?? '',
      iconUrl: gateway.iconUrl ?? null,
      // Where the customer sends the money (manual gateways only).
      accountName: isManual ? (gateway.accountName ?? '') : '',
      accountNumber: isManual ? (gateway.accountNumber ?? '') : '',
      bankName: isManual ? (gateway.bankName ?? '') : '',
      branchName: isManual ? (gateway.branchName ?? '') : '',
      // What the customer must submit back (manual gateways only).
      fields: isManual ? manualPaymentFields(gateway.type) : [],
    };
  }

  /**
   * Resolve the gateway chosen at checkout.
   *
   * Returns the `Payment.method` to record and, for a manual gateway, the
   * validated `metaData` to persist. Automated gateways keep the existing
   * callback flow: their `provider` is the PaymentMethod stored on the order.
   */
  async resolve(
    gatewayId: number,
    metaData: Record<string, unknown> | undefined,
  ): Promise<{
    gateway: PaymentGateway;
    paymentMethod: string;
    paymentMetaData: Record<string, string> | null;
  }> {
    const gateway = await this.database.paymentGateway.findOne({
      where: { id: gatewayId },
    });
    if (!gateway || gateway.deletedAt)
      throw new NotFoundException('Payment gateway not found');
    if (!gateway.isActive)
      throw new BadRequestException('This payment gateway is not available');

    if (!gateway.isManual) {
      if (!gateway.provider)
        throw new BadRequestException(
          'This payment gateway has no automated provider configured',
        );
      return {
        gateway,
        paymentMethod: gateway.provider,
        paymentMetaData: null,
      };
    }

    return {
      gateway,
      // A manual gateway is recorded under its own slug, so the order shows
      // which option the customer chose (cod/bkash/… stay reserved for the
      // built-in and automated flows).
      paymentMethod: gateway.slug,
      paymentMetaData: validateManualMetaData(
        gateway.type,
        metaData,
      ),
    };
  }
}