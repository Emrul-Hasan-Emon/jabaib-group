import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrderListTotal1793865888438 implements MigrationInterface {
  name = 'AddOrderListTotal1793865888438';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "order" ADD "listTotal" numeric(10,2) NOT NULL DEFAULT '0'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "order" DROP COLUMN "listTotal"`);
  }
}
