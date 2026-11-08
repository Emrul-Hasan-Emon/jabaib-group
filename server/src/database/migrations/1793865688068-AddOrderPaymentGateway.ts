import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrderPaymentGateway1793865688068
  implements MigrationInterface
{
  name = 'AddOrderPaymentGateway1793865688068';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "order" ADD "paymentGatewayId" integer`);
    await queryRunner.query(
      `CREATE INDEX "IDX_e00d6650118a639244282775cf" ON "order"  ("paymentGatewayId") `,
    );
    await queryRunner.query(
      `ALTER TABLE "order" ADD CONSTRAINT "FK_e00d6650118a639244282775cf4" FOREIGN KEY ("paymentGatewayId") REFERENCES "payment_gateway"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "order" DROP CONSTRAINT "FK_e00d6650118a639244282775cf4"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_e00d6650118a639244282775cf"`);
    await queryRunner.query(`ALTER TABLE "order" DROP COLUMN "paymentGatewayId"`);
  }
}
