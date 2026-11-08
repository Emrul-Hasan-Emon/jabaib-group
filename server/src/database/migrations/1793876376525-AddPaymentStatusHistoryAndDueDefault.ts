import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPaymentStatusHistoryAndDueDefault1793876376525 implements MigrationInterface {
    name = 'AddPaymentStatusHistoryAndDueDefault1793876376525'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "payment_status_history" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, "createdBy" integer, "creatorType" character varying(20), "creatorName" character varying(250), "updatedBy" integer, "updaterType" character varying(20), "updaterName" character varying(250), "orderId" integer NOT NULL, "status" character varying(20) NOT NULL, "note" text, CONSTRAINT "PK_d128a1857cf1b233d05f823d05e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_1b7235099e31e912f4f2febb79" ON "payment_status_history"  ("orderId") `);
        await queryRunner.query(`ALTER TABLE "order" ALTER COLUMN "paymentStatus" SET DEFAULT 'due'`);
        await queryRunner.query(`ALTER TABLE "payment" ALTER COLUMN "status" SET DEFAULT 'due'`);
        await queryRunner.query(`ALTER TABLE "payment_status_history" ADD CONSTRAINT "FK_1b7235099e31e912f4f2febb79b" FOREIGN KEY ("orderId") REFERENCES "order"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "payment_status_history" DROP CONSTRAINT "FK_1b7235099e31e912f4f2febb79b"`);
        await queryRunner.query(`ALTER TABLE "payment" ALTER COLUMN "status" SET DEFAULT 'pending'`);
        await queryRunner.query(`ALTER TABLE "order" ALTER COLUMN "paymentStatus" SET DEFAULT 'pending'`);
        await queryRunner.query(`DROP INDEX "public"."IDX_1b7235099e31e912f4f2febb79"`);
        await queryRunner.query(`DROP TABLE "payment_status_history"`);
    }

}
