import { BadRequestException } from '@nestjs/common';
import { PaymentGatewayType } from '../../database/enums/enums';

/**
 * One field of a manual payment, as the customer must submit it.
 * This list is the single source of truth: the checkout DTO validates against
 * it and the storefront renders its inputs from it, so adding a gateway-specific
 * field never means editing the checkout form.
 */
export interface ManualPaymentField {
  /** Key stored in `Payment.metaData`. */
  key: string;
  label: string;
  labelBN: string;
  maxLength: number;
  /** Shown under the input as an example of the expected format. */
  placeholder?: string;
  /** Copy-to-clipboard hint rendered next to the field on the storefront. */
  copyable?: boolean;
}

/** What a customer must send for each manual gateway family. */
export const MANUAL_PAYMENT_FIELDS: Record<
  PaymentGatewayType,
  ManualPaymentField[]
> = {
  [PaymentGatewayType.MFS]: [
    {
      key: 'txnId',
      label: 'Transaction ID',
      labelBN: 'ট্রানজেকশন আইডি',
      maxLength: 100,
      placeholder: '9ABC123XYZ',
      copyable: true,
    },
  ],
  [PaymentGatewayType.BANK]: [
    {
      key: 'accountName',
      label: 'Account name',
      labelBN: 'অ্যাকাউন্টের নাম',
      maxLength: 250,
      copyable: true,
    },
    {
      key: 'accountNumber',
      label: 'Account number',
      labelBN: 'অ্যাকাউন্ট নম্বর',
      maxLength: 100,
      copyable: true,
    },
    {
      key: 'bankName',
      label: 'Bank name',
      labelBN: 'ব্যাংকের নাম',
      maxLength: 250,
      copyable: true,
    },
    {
      key: 'branchName',
      label: 'Branch name',
      labelBN: 'শাখার নাম',
      maxLength: 250,
      copyable: true,
    },
  ],
};

/** Fields a manual gateway of this type requires (empty for unknown types). */
export function manualPaymentFields(
  type: string,
): ManualPaymentField[] {
  return MANUAL_PAYMENT_FIELDS[type as PaymentGatewayType] ?? [];
}

/** The account details an admin must configure for a manual gateway. */
export function requiredGatewayAccountFields(
  type: string,
  isManual: boolean,
): string[] {
  if (!isManual) return [];
  const shared = ['accountName', 'accountNumber'];
  return type === PaymentGatewayType.BANK
    ? [...shared, 'bankName', 'branchName']
    : shared;
}

/**
 * Validate what the customer submitted for a manual gateway and return it
 * trimmed and reduced to the fields this gateway type actually collects, so
 * `Payment.metaData` holds exactly what a reviewer needs to reconcile.
 */
export function validateManualMetaData(
  type: string,
  metaData: Record<string, unknown> | undefined,
): Record<string, string> {
  const fields = manualPaymentFields(type);
  if (!fields.length) {
    throw new BadRequestException(
      `Manual payments are not supported for gateway type "${type}"`,
    );
  }

  const source = metaData ?? {};
  const result: Record<string, string> = {};

  for (const field of fields) {
    const raw = source[field.key];
    if (raw === undefined || raw === null || String(raw).trim() === '') {
      throw new BadRequestException(
        `"${field.label}" is required for this payment method`,
      );
    }
    if (typeof raw !== 'string' && typeof raw !== 'number') {
      throw new BadRequestException(`"${field.label}" must be text`);
    }
    const value = String(raw).trim();
    if (value.length > field.maxLength) {
      throw new BadRequestException(
        `"${field.label}" must be at most ${field.maxLength} characters`,
      );
    }
    result[field.key] = value;
  }

  // Keys this gateway does not collect are dropped rather than rejected, so a
  // newer client cannot break checkout by sending extra info.
  return result;
}

/**
 * The transaction id to keep on `Payment.transactionId` for a manual payment.
 * MFS carries it in the metadata; a bank transfer has no single reference, so
 * the account number doubles as the searchable handle for reconciliation.
 */
export function manualPaymentReference(
  type: string,
  metaData: Record<string, string>,
): string | undefined {
  if (type === PaymentGatewayType.MFS) return metaData.txnId;
  return metaData.accountNumber;
}