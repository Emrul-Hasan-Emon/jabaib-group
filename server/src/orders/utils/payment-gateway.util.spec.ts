import { BadRequestException } from '@nestjs/common';
import { PaymentGatewayType } from '../../database/enums/enums';
import {
  MANUAL_PAYMENT_FIELDS,
  manualPaymentFields,
  manualPaymentReference,
  requiredGatewayAccountFields,
  validateManualMetaData,
} from './payment-gateway.util';

describe('payment gateway util', () => {
  describe('requiredGatewayAccountFields', () => {
    it('wants only the shared account fields for a manual MFS gateway', () => {
      expect(
        requiredGatewayAccountFields(PaymentGatewayType.MFS, true),
      ).toEqual(['accountName', 'accountNumber']);
    });

    it('also wants bank and branch for a manual bank gateway', () => {
      expect(
        requiredGatewayAccountFields(PaymentGatewayType.BANK, true),
      ).toEqual([
        'accountName',
        'accountNumber',
        'bankName',
        'branchName',
      ]);
    });

    it('wants nothing for an automated gateway', () => {
      expect(
        requiredGatewayAccountFields(PaymentGatewayType.BANK, false),
      ).toEqual([]);
    });
  });

  describe('manualPaymentFields', () => {
    it('exposes txnId for MFS and the account set for a bank transfer', () => {
      expect(
        manualPaymentFields(PaymentGatewayType.MFS).map((f) => f.key),
      ).toEqual(['txnId']);
      expect(
        manualPaymentFields(PaymentGatewayType.BANK).map((f) => f.key),
      ).toEqual(['accountName', 'accountNumber', 'bankName', 'branchName']);
    });

    it('returns nothing for an unknown type', () => {
      expect(manualPaymentFields('crypto')).toEqual([]);
    });

    it('gives every field a label in both languages', () => {
      for (const fields of Object.values(MANUAL_PAYMENT_FIELDS)) {
        for (const field of fields) {
          expect(field.label.length).toBeGreaterThan(0);
          expect(field.labelBN.length).toBeGreaterThan(0);
          expect(field.maxLength).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('validateManualMetaData', () => {
    it('keeps a trimmed MFS transaction id', () => {
      expect(
        validateManualMetaData(PaymentGatewayType.MFS, { txnId: '  TXN123  ' }),
      ).toEqual({ txnId: 'TXN123' });
    });

    it('accepts numbers for numeric-looking fields', () => {
      expect(
        validateManualMetaData(PaymentGatewayType.BANK, {
          accountName: 'Jabaib',
          accountNumber: 1700000000,
          bankName: 'DBBL',
          branchName: 'Dhanmondi',
        }),
      ).toEqual({
        accountName: 'Jabaib',
        accountNumber: '1700000000',
        bankName: 'DBBL',
        branchName: 'Dhanmondi',
      });
    });

    it('rejects a missing transaction id', () => {
      expect(() => validateManualMetaData(PaymentGatewayType.MFS, {})).toThrow(
        /"Transaction ID" is required/i,
      );
      expect(() =>
        validateManualMetaData(PaymentGatewayType.MFS, { txnId: '   ' }),
      ).toThrow(/required/i);
      expect(() =>
        validateManualMetaData(PaymentGatewayType.MFS, undefined),
      ).toThrow(/required/i);
    });

    it('names the missing bank fields one by one', () => {
      expect(() =>
        validateManualMetaData(PaymentGatewayType.BANK, {
          accountName: 'Jabaib',
          accountNumber: '1700000000',
        }),
      ).toThrow(/"Bank name" is required/i);
    });

    it('rejects a value longer than the field allows', () => {
      expect(() =>
        validateManualMetaData(PaymentGatewayType.MFS, {
          txnId: 'x'.repeat(101),
        }),
      ).toThrow(/at most 100 characters/i);
    });

    it('rejects a non-text value', () => {
      expect(() =>
        validateManualMetaData(PaymentGatewayType.MFS, {
          txnId: { nested: true },
        }),
      ).toThrow(/must be text/i);
    });

    it('drops keys the gateway does not collect instead of failing', () => {
      expect(
        validateManualMetaData(PaymentGatewayType.MFS, {
          txnId: 'TXN9',
          somethingElse: 'ignored',
        }),
      ).toEqual({ txnId: 'TXN9' });
    });

    it('refuses a type that has no manual fields at all', () => {
      expect(() => validateManualMetaData('crypto', { txnId: 'x' })).toThrow(
        BadRequestException,
      );
    });
  });

  describe('manualPaymentReference', () => {
    it('uses the txn id for MFS', () => {
      expect(manualPaymentReference(PaymentGatewayType.MFS, { txnId: 'T1' })).toBe(
        'T1',
      );
    });

    it('falls back to the account number for a bank transfer', () => {
      expect(
        manualPaymentReference(PaymentGatewayType.BANK, {
          accountNumber: '1700000000',
        }),
      ).toBe('1700000000');
    });
  });
});