import { MigrationInterface, QueryRunner } from 'typeorm';

export class AuthToken1791217827374 implements MigrationInterface {
  name = 'AuthToken1791217827374';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_22cc43e9a74d7498546e9a63e7"`,
    );
    await queryRunner.query(
      `CREATE TABLE "auth_token" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, "createdBy" integer, "creatorType" character varying(20), "creatorName" character varying(250), "updatedBy" integer, "updaterType" character varying(20), "updaterName" character varying(250), "userId" integer NOT NULL, "userType" character varying(10) NOT NULL, "token" text NOT NULL, "userAgent" character varying(255), "origin" character varying(255), "revoked" boolean NOT NULL DEFAULT false, CONSTRAINT "UQ_7a74281711d1a581b4dcc4d59ff" UNIQUE ("token"), CONSTRAINT "PK_4572ff5d1264c4a523f01aa86a0" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5a326267f11b44c0d62526bc71" ON "auth_token"  ("userId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f8cef87294855676d604709e72" ON "auth_token"  ("userType") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6ff83208deacea4db1f2ed9f1b" ON "auth_token"  ("revoked") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b4c586edd93caf4b72005e13e7" ON "coupon_history_log"  ("couponId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2bd9dca1aaaa090734ad1a4550" ON "coupon_history_log"  ("userId") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2bd9dca1aaaa090734ad1a4550"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b4c586edd93caf4b72005e13e7"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6ff83208deacea4db1f2ed9f1b"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f8cef87294855676d604709e72"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5a326267f11b44c0d62526bc71"`,
    );
    await queryRunner.query(`DROP TABLE "auth_token"`);
    await queryRunner.query(
      `CREATE INDEX "IDX_22cc43e9a74d7498546e9a63e7" ON "product" USING btree ("name") `,
    );
  }
}
