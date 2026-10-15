import { MigrationInterface, QueryRunner } from 'typeorm';

export class CartOrderIndexes1791360272789 implements MigrationInterface {
  name = 'CartOrderIndexes1791360272789';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "IDX_29e590514f9941296f3a2440d3" ON "cart_item"  ("cartId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8e8d51bb956f024f422bc977f4" ON "cart_item"  ("productSKUId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_75db0de134fe0f9fe9e4591b7b" ON "cart_item"  ("productId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3995ab3a03cf2b54b0999f75a3" ON "order"  ("paymentStatus") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3995ab3a03cf2b54b0999f75a3"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_75db0de134fe0f9fe9e4591b7b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8e8d51bb956f024f422bc977f4"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_29e590514f9941296f3a2440d3"`,
    );
  }
}
