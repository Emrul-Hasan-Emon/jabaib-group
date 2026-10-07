import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Rename "Product Label" → "Collection" and relax product.categoryId to
 * nullable (UI enforces a category, the database stays permissive).
 *
 * Postgres automatically rewrites FK constraints and indexes that reference
 * the renamed table/column, so we only rename the objects themselves.
 */
export class RenameProductLabelToCollection1791310000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "product_label" RENAME TO "collection"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product" RENAME COLUMN "productLabelId" TO "collectionId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product" ALTER COLUMN "categoryId" DROP NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "product" ALTER COLUMN "categoryId" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "product" RENAME COLUMN "collectionId" TO "productLabelId"`,
    );
    await queryRunner.query(
      `ALTER TABLE "collection" RENAME TO "product_label"`,
    );
  }
}
