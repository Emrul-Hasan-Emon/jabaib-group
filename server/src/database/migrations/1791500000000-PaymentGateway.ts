import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Payment gateway management.
 *
 * - `payment_gateway`: admin-configured payment options (manual MFS/bank
 *   transfers with account details, or automated gateways bound to an existing
 *   PaymentMethod). `slug` is backend-generated and unique.
 * - `payment.metaData`: free-form jsonb holding what the customer submitted for
 *   a manual payment ({ txnId } for MFS, account details for a bank transfer).
 * - `payment.method` / `order.paymentMethod` widened to 100 chars: they now also
 *   carry a gateway slug, which is longer than the legacy enum values.
 */
export class PaymentGateway1791500000000 implements MigrationInterface {
  name = 'PaymentGateway1791500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "payment_gateway" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, "createdBy" integer, "creatorType" character varying(20), "creatorName" character varying(250), "updatedBy" integer, "updaterType" character varying(20), "updaterName" character varying(250), "name" character varying(250) NOT NULL, "nameBN" character varying(250) NOT NULL, "slug" character varying(250) NOT NULL, "type" character varying(20) NOT NULL DEFAULT 'mfs', "isManual" boolean NOT NULL DEFAULT false, "provider" character varying(20), "description" text, "iconUrl" text, "iconPath" text, "isActive" boolean NOT NULL DEFAULT true, "accountName" character varying(250), "accountNumber" character varying(100), "bankName" character varying(250), "branchName" character varying(250), CONSTRAINT "UQ_pg_slug" UNIQUE ("slug"), CONSTRAINT "PK_payment_gateway" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_pg_slug" ON "payment_gateway" ("slug")`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment" ADD "metaData" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment" ALTER COLUMN "method" TYPE character varying(100)`,
    );
    await queryRunner.query(
      `ALTER TABLE "order" ALTER COLUMN "paymentMethod" TYPE character varying(100)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "order" ALTER COLUMN "paymentMethod" TYPE character varying(20)`);
    await queryRunner.query(`ALTER TABLE "payment" ALTER COLUMN "method" TYPE character varying(20)`);
    await queryRunner.query(`ALTER TABLE "payment" DROP COLUMN "metaData"`);
    await queryRunner.query(`DROP INDEX "IDX_pg_slug"`);
    await queryRunner.query(`DROP TABLE "payment_gateway"`);
  }
}