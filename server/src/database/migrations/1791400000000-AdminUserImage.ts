import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Admin user profile image: `imageUrl` (served URL) + `imagePath`
 * (storage path for cleanup). Both nullable — existing admins have no photo.
 */
export class AdminUserImage1791400000000 implements MigrationInterface {
  name = 'AdminUserImage1791400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "admin_user" ADD "imageUrl" character varying(250)`,
    );
    await queryRunner.query(
      `ALTER TABLE "admin_user" ADD "imagePath" character varying(250)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "admin_user" DROP COLUMN "imagePath"`);
    await queryRunner.query(`ALTER TABLE "admin_user" DROP COLUMN "imageUrl"`);
  }
}
