import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1791216162396 implements MigrationInterface {
  name = 'InitialSchema1791216162396';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "country" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, "createdBy" integer, "creatorType" character varying(20), "creatorName" character varying(250), "updatedBy" integer, "updaterType" character varying(20), "updaterName" character varying(250), "name" character varying NOT NULL, "nameBN" character varying(250), "slug" character varying NOT NULL, "code" character varying(10), "currency" character varying(10), "isActive" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_4cd2b9410fe9cb70466134c2f9a" UNIQUE ("slug"), CONSTRAINT "PK_bf6e37c231c4f4ea56dcd887269" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_97ebcd8db30a408b5f907d6ff4" ON "country"  ("isActive") `,
    );
    await queryRunner.query(
      `CREATE TABLE "district" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, "createdBy" integer, "creatorType" character varying(20), "creatorName" character varying(250), "updatedBy" integer, "updaterType" character varying(20), "updaterName" character varying(250), "name" character varying NOT NULL, "nameBN" character varying(250), "slug" character varying NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "countryId" integer NOT NULL, "divisionId" integer NOT NULL, CONSTRAINT "PK_ee5cb6fd5223164bb87ea693f1e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0d8904d79f921974e67c878e44" ON "district"  ("isActive") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_9c6ad28c3f72b9a4c0e7a16e1f" ON "district"  ("countryId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5a90f59e76c13a9aa52a61c169" ON "district"  ("divisionId") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_7e93d4e604c1fe9e01965f26b4" ON "district"  ("divisionId", "slug") `,
    );
    await queryRunner.query(
      `CREATE TABLE "division" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, "createdBy" integer, "creatorType" character varying(20), "creatorName" character varying(250), "updatedBy" integer, "updaterType" character varying(20), "updaterName" character varying(250), "name" character varying NOT NULL, "nameBN" character varying(250), "slug" character varying NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "countryId" integer NOT NULL, CONSTRAINT "PK_b6f0d207e38106dbddabab3a078" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2c574a1deba0b8507df66e6785" ON "division"  ("isActive") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a32a23a80ce72d6073e324bd95" ON "division"  ("countryId") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_561e76df831b1d5ded71cc59dd" ON "division"  ("countryId", "slug") `,
    );
    await queryRunner.query(
      `CREATE TABLE "address" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, "createdBy" integer, "creatorType" character varying(20), "creatorName" character varying(250), "updatedBy" integer, "updaterType" character varying(20), "updaterName" character varying(250), "userId" integer NOT NULL, "type" character varying(20) NOT NULL DEFAULT 'shipping', "recipientName" character varying NOT NULL, "phone" character varying NOT NULL, "address" text NOT NULL, "divisionId" integer, "districtId" integer, "zipCode" character varying(20), "isDefault" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_d92de1f82754668b5f5f5dd4fd5" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d25f1ea79e282cc8a42bd616aa" ON "address"  ("userId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_78c7b1f439f7cd9867bad169b6" ON "address"  ("divisionId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_89e09cf52a27eec4a04378bbdd" ON "address"  ("districtId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "auth_provider" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, "createdBy" integer, "creatorType" character varying(20), "creatorName" character varying(250), "updatedBy" integer, "updaterType" character varying(20), "updaterName" character varying(250), "userId" integer NOT NULL, "provider" character varying(50) NOT NULL, "providerKey" character varying(255) NOT NULL, "email" character varying(255), CONSTRAINT "PK_0a6e6348fe38ba49160eb903c95" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "user" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, "createdBy" integer, "creatorType" character varying(20), "creatorName" character varying(250), "updatedBy" integer, "updaterType" character varying(20), "updaterName" character varying(250), "name" character varying NOT NULL, "email" character varying, "phone" character varying, "passwordHash" text, "avatarUrl" text, "avatarPath" text, "emailVerified" boolean NOT NULL DEFAULT false, "phoneVerified" boolean NOT NULL DEFAULT false, "isActive" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_e12875dfb3b1d92d7d7c5377e22" UNIQUE ("email"), CONSTRAINT "UQ_8e1f623798118e629b46a9e6299" UNIQUE ("phone"), CONSTRAINT "PK_cace4a159ff9f2512dd42373760" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "admin_user" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, "createdBy" integer, "creatorType" character varying(20), "creatorName" character varying(250), "updatedBy" integer, "updaterType" character varying(20), "updaterName" character varying(250), "name" character varying NOT NULL, "email" character varying NOT NULL, "passwordHash" text NOT NULL, "role" character varying(50) NOT NULL DEFAULT 'editor', "isActive" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_840ac5cd67be99efa5cd989bf9f" UNIQUE ("email"), CONSTRAINT "PK_a28028ba709cd7e5053a86857b4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8cb282675c353156c5eff653d6" ON "admin_user"  ("isActive") `,
    );
    await queryRunner.query(
      `CREATE TABLE "attribute_value" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, "createdBy" integer, "creatorType" character varying(20), "creatorName" character varying(250), "updatedBy" integer, "updaterType" character varying(20), "updaterName" character varying(250), "attributeId" integer NOT NULL, "name" character varying(250) NOT NULL, "nameBN" character varying(250), "colorCode" character varying(20), "sortOrder" integer NOT NULL DEFAULT '0', "isActive" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_dff76d9cc1db2684732acdb9ca7" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "attribute" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, "createdBy" integer, "creatorType" character varying(20), "creatorName" character varying(250), "updatedBy" integer, "updaterType" character varying(20), "updaterName" character varying(250), "name" character varying(250) NOT NULL, "nameBN" character varying(250), "slug" character varying NOT NULL, "description" text, "descriptionBN" text, "isActive" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_60854790c6c3cb30212d1fbc7d5" UNIQUE ("slug"), CONSTRAINT "PK_b13fb7c5c9e9dff62b60e0de729" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "product_sku_variant" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, "createdBy" integer, "creatorType" character varying(20), "creatorName" character varying(250), "updatedBy" integer, "updaterType" character varying(20), "updaterName" character varying(250), "productSKUId" integer NOT NULL, "attributeId" integer NOT NULL, "attributeValueId" integer NOT NULL, "isActive" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_eaa07a0e0902eeaf27b6102d580" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_83c32bfe5e9a8c94c6e5f1126a" ON "product_sku_variant"  ("productSKUId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1e2b16c255d9099bdead738ac4" ON "product_sku_variant"  ("attributeId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b8d19c3912efba5cec0509a312" ON "product_sku_variant"  ("attributeValueId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "product_sku" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, "createdBy" integer, "creatorType" character varying(20), "creatorName" character varying(250), "updatedBy" integer, "updaterType" character varying(20), "updaterName" character varying(250), "productId" integer NOT NULL, "sku" character varying NOT NULL, "description" text, "descriptionBN" text, "imageUrl" text, "imagePath" text, "quantity" integer NOT NULL DEFAULT '0', "lowStockThreshold" integer NOT NULL DEFAULT '5', "myBuyingPrice" numeric(10,2), "price" numeric(10,2) NOT NULL DEFAULT '0', "discountedPrice" numeric(10,2), "discountedPriceStartDate" TIMESTAMP, "discountedPriceEndDate" TIMESTAMP, "isDefault" boolean NOT NULL DEFAULT false, "isActive" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_25b5fb74c3e38f8688b61db7cd2" UNIQUE ("sku"), CONSTRAINT "PK_4edea686db1e12af5b8eaa9ec31" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0833ab73f1447c11d5acd37cc2" ON "product_sku"  ("productId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0974652daf9318f4a437bc8282" ON "product_sku"  ("isActive") `,
    );
    await queryRunner.query(
      `CREATE TABLE "product_media" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, "createdBy" integer, "creatorType" character varying(20), "creatorName" character varying(250), "updatedBy" integer, "updaterType" character varying(20), "updaterName" character varying(250), "productId" integer NOT NULL, "url" text NOT NULL, "path" text, "type" character varying(20) NOT NULL DEFAULT 'image', "altText" text, "altTextBN" text, "isPrimary" boolean NOT NULL DEFAULT false, "sortOrder" integer NOT NULL DEFAULT '0', "isActive" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_09d4639de8082a32aa27f3ac9a6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_50e3945c6150d80b69b5f18515" ON "product_media"  ("productId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "product_label" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, "createdBy" integer, "creatorType" character varying(20), "creatorName" character varying(250), "updatedBy" integer, "updaterType" character varying(20), "updaterName" character varying(250), "name" character varying NOT NULL, "nameBN" character varying(250), "slug" character varying NOT NULL, "colorCode" character varying(20), "isActive" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_3a04c6a5605d85409a91d7846c7" UNIQUE ("slug"), CONSTRAINT "PK_ec1a178251e314a64e90a0233d2" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "product" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, "createdBy" integer, "creatorType" character varying(20), "creatorName" character varying(250), "updatedBy" integer, "updaterType" character varying(20), "updaterName" character varying(250), "name" character varying NOT NULL, "nameBN" character varying(250), "slug" character varying NOT NULL, "description" text, "descriptionBN" text, "categoryId" integer NOT NULL, "thumbnailUrl" text, "thumbnailPath" text, "productLabelId" integer, "isFeatured" boolean NOT NULL DEFAULT false, "isPublished" boolean NOT NULL DEFAULT true, "isActive" boolean NOT NULL DEFAULT true, "seoTitle" character varying(250), "seoTitleBN" character varying(250), "seoDescription" text, "seoDescriptionBN" text, CONSTRAINT "UQ_8cfaf4a1e80806d58e3dbe69224" UNIQUE ("slug"), CONSTRAINT "PK_bebc9158e480b949565b4dc7a82" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_22cc43e9a74d7498546e9a63e7" ON "product"  ("name") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ff0c0301a95e517153df97f681" ON "product"  ("categoryId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_b2efd7dd56aca7e028ad0561fe" ON "product"  ("productLabelId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_639ef8ce82a82ccd59031b1b8e" ON "product"  ("isFeatured") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c036d163e6a6c811ee5e4e4f22" ON "product"  ("isPublished") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7bb2b2f7a4c8a4916d4339d7f4" ON "product"  ("isActive") `,
    );
    await queryRunner.query(
      `CREATE TABLE "category" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, "createdBy" integer, "creatorType" character varying(20), "creatorName" character varying(250), "updatedBy" integer, "updaterType" character varying(20), "updaterName" character varying(250), "name" character varying(250) NOT NULL, "nameBN" character varying(250), "slug" character varying NOT NULL, "description" text, "descriptionBN" text, "imageUrl" text, "imagePath" text, "parentId" integer, "sortOrder" integer NOT NULL DEFAULT '0', "isActive" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_cb73208f151aa71cdd78f662d70" UNIQUE ("slug"), CONSTRAINT "PK_9c4e4a89e3674fc9f382d733f03" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "wishlist" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, "createdBy" integer, "creatorType" character varying(20), "creatorName" character varying(250), "updatedBy" integer, "updaterType" character varying(20), "updaterName" character varying(250), "userId" integer NOT NULL, "productId" integer NOT NULL, CONSTRAINT "PK_620bff4a240d66c357b5d820eaa" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f6eeb74a295e2aad03b76b0ba8" ON "wishlist"  ("userId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_17e00e49d77ccaf7ff0e14de37" ON "wishlist"  ("productId") `,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_2ca6e3d0bd9835eabd2668d515" ON "wishlist"  ("userId", "productId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "review" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, "createdBy" integer, "creatorType" character varying(20), "creatorName" character varying(250), "updatedBy" integer, "updaterType" character varying(20), "updaterName" character varying(250), "userId" integer NOT NULL, "productId" integer NOT NULL, "orderId" integer, "rating" integer NOT NULL, "comment" text, "images" jsonb, "isApproved" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_2e4299a343a81574217255c00ca" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1337f93918c70837d3cea105d3" ON "review"  ("userId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2a11d3c0ea1b2b5b1790f762b9" ON "review"  ("productId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7493081ee6ed292eb441edf7a2" ON "review"  ("isApproved") `,
    );
    await queryRunner.query(
      `CREATE TABLE "cart_item" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, "createdBy" integer, "creatorType" character varying(20), "creatorName" character varying(250), "updatedBy" integer, "updaterType" character varying(20), "updaterName" character varying(250), "cartId" integer NOT NULL, "productSKUId" integer NOT NULL, "productId" integer NOT NULL, "quantity" integer NOT NULL DEFAULT '1', "unitPrice" numeric(10,2), "unitDiscountedPrice" numeric(10,2), "totalPrice" numeric(10,2), "totalDiscountedPrice" numeric(10,2), CONSTRAINT "PK_bd94725aa84f8cf37632bcde997" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "cart" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, "createdBy" integer, "creatorType" character varying(20), "creatorName" character varying(250), "updatedBy" integer, "updaterType" character varying(20), "updaterName" character varying(250), "userId" integer, "totalPrice" numeric(10,2), "totalDiscountedPrice" numeric(10,2), "sessionId" character varying(100), CONSTRAINT "PK_c524ec48751b9b5bcfbf6e59be7" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4c5b32b563e11a3a7700b50e4a" ON "cart"  ("sessionId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "coupon" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, "createdBy" integer, "creatorType" character varying(20), "creatorName" character varying(250), "updatedBy" integer, "updaterType" character varying(20), "updaterName" character varying(250), "code" character varying NOT NULL, "type" character varying(20) NOT NULL, "amount" numeric(10,2) NOT NULL DEFAULT '0', "minOrderAmount" numeric(10,2) NOT NULL DEFAULT '0', "maxDiscountAmount" numeric(10,2), "usageLimit" integer NOT NULL DEFAULT '0', "usedCount" integer NOT NULL DEFAULT '0', "perUserLimit" integer NOT NULL DEFAULT '1', "startsAt" TIMESTAMP, "endsAt" TIMESTAMP, "isActive" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_62d3c5b0ce63a82c48e86d904bc" UNIQUE ("code"), CONSTRAINT "PK_fcbe9d72b60eed35f46dc35a682" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_74ddb0e92ef27de99f7a89ea0b" ON "coupon"  ("isActive") `,
    );
    await queryRunner.query(
      `CREATE TABLE "order_item" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, "createdBy" integer, "creatorType" character varying(20), "creatorName" character varying(250), "updatedBy" integer, "updaterType" character varying(20), "updaterName" character varying(250), "orderId" integer NOT NULL, "productId" integer NOT NULL, "productSKUId" integer NOT NULL, "productName" character varying NOT NULL, "skuData" character varying NOT NULL, "quantity" integer NOT NULL, "unitPrice" numeric(10,2) NOT NULL DEFAULT '0', "unitDiscountedPricePrice" numeric(10,2) NOT NULL DEFAULT '0', "totalPrice" numeric(10,2) NOT NULL DEFAULT '0', "totalDiscountedPrice" numeric(10,2) NOT NULL DEFAULT '0', CONSTRAINT "PK_d01158fe15b1ead5c26fd7f4e90" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_646bf9ece6f45dbe41c203e06e" ON "order_item"  ("orderId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "order_status_history" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, "createdBy" integer, "creatorType" character varying(20), "creatorName" character varying(250), "updatedBy" integer, "updaterType" character varying(20), "updaterName" character varying(250), "orderId" integer NOT NULL, "status" character varying(20) NOT NULL, "note" text, CONSTRAINT "PK_e6c66d853f155531985fc4f6ec8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_689db3835e5550e68d26ca3267" ON "order_status_history"  ("orderId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "order_address" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, "createdBy" integer, "creatorType" character varying(20), "creatorName" character varying(250), "updatedBy" integer, "updaterType" character varying(20), "updaterName" character varying(250), "orderId" integer NOT NULL, "recipientName" character varying NOT NULL, "phone" character varying NOT NULL, "address" text NOT NULL, "divisionId" integer, "districtId" integer, "zipCode" character varying(20), CONSTRAINT "UQ_d82a2840b5e5c98c569d75e92e8" UNIQUE ("orderId"), CONSTRAINT "REL_d82a2840b5e5c98c569d75e92e" UNIQUE ("orderId"), CONSTRAINT "PK_f07603e96b068aae820d4590270" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d82a2840b5e5c98c569d75e92e" ON "order_address"  ("orderId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "order" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, "createdBy" integer, "creatorType" character varying(20), "creatorName" character varying(250), "updatedBy" integer, "updaterType" character varying(20), "updaterName" character varying(250), "orderNumber" character varying NOT NULL, "userId" integer NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'pending', "deliveryType" character varying(20) NOT NULL DEFAULT 'inside_dhaka', "couponId" integer, "couponCode" character varying(50), "subtotal" numeric(10,2) NOT NULL DEFAULT '0', "deliveryCharge" numeric(10,2) NOT NULL DEFAULT '0', "discountAmount" numeric(10,2) NOT NULL DEFAULT '0', "total" numeric(10,2) NOT NULL DEFAULT '0', "paymentMethod" character varying(20) NOT NULL, "paymentStatus" character varying(20) NOT NULL DEFAULT 'pending', "note" text, CONSTRAINT "UQ_4e9f8dd16ec084bca97b3262edb" UNIQUE ("orderNumber"), CONSTRAINT "PK_1031171c13130102495201e3e20" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_caabe91507b3379c7ba73637b8" ON "order"  ("userId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7a9573d6a1fb982772a9123320" ON "order"  ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0bc43903b9465a59c563d01114" ON "order"  ("deliveryType") `,
    );
    await queryRunner.query(
      `CREATE TABLE "coupon_history_log" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, "createdBy" integer, "creatorType" character varying(20), "creatorName" character varying(250), "updatedBy" integer, "updaterType" character varying(20), "updaterName" character varying(250), "couponId" integer NOT NULL, "userId" integer NOT NULL, "orderId" integer, "couponCode" character varying(50) NOT NULL, "discountAmount" numeric(10,2) NOT NULL DEFAULT '0', "orderTotal" numeric(10,2) NOT NULL DEFAULT '0', CONSTRAINT "PK_2a1921da9c75d65d429977e8827" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f37646f766652a1a048ceaf513" ON "coupon_history_log"  ("orderId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "order_return_item" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, "createdBy" integer, "creatorType" character varying(20), "creatorName" character varying(250), "updatedBy" integer, "updaterType" character varying(20), "updaterName" character varying(250), "orderReturnId" integer NOT NULL, "orderItemId" integer NOT NULL, "quantity" integer NOT NULL, "reason" text, CONSTRAINT "PK_ccd88819e29d1cb2e2f585800ef" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_95050c6110147dffc3fe450a78" ON "order_return_item"  ("orderReturnId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "order_return_status_history" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, "createdBy" integer, "creatorType" character varying(20), "creatorName" character varying(250), "updatedBy" integer, "updaterType" character varying(20), "updaterName" character varying(250), "orderReturnId" integer NOT NULL, "status" character varying(20) NOT NULL, "note" text, CONSTRAINT "PK_b84ee3939ed9f4e79da4f3352f5" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_8274f252e0cd2f578e443506cf" ON "order_return_status_history"  ("orderReturnId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "order_return" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, "createdBy" integer, "creatorType" character varying(20), "creatorName" character varying(250), "updatedBy" integer, "updaterType" character varying(20), "updaterName" character varying(250), "returnNumber" character varying NOT NULL, "orderId" integer NOT NULL, "userId" integer NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'requested', "reason" text NOT NULL, "refundAmount" numeric(10,2) NOT NULL DEFAULT '0', "refundMethod" character varying(50), "media" jsonb, CONSTRAINT "UQ_e04d9a7b36c651a73e005930e95" UNIQUE ("returnNumber"), CONSTRAINT "PK_36413fb3df0d9d66ae67cbdcb9a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_46ceacd0c54265df482da02a5b" ON "order_return"  ("orderId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4992b46e907baac04c476bbf36" ON "order_return"  ("userId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_42901c99d5c87bdc444f78e9fa" ON "order_return"  ("status") `,
    );
    await queryRunner.query(
      `CREATE TABLE "payment" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, "createdBy" integer, "creatorType" character varying(20), "creatorName" character varying(250), "updatedBy" integer, "updaterType" character varying(20), "updaterName" character varying(250), "orderId" integer NOT NULL, "method" character varying(20) NOT NULL, "status" character varying(20) NOT NULL DEFAULT 'pending', "amount" numeric(10,2) NOT NULL DEFAULT '0', "transactionId" character varying(100), "providerResponse" jsonb, "paidAt" TIMESTAMP, CONSTRAINT "PK_fcaec7df5adf9cac408c686b2ab" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d09d285fe1645cd2f0db811e29" ON "payment"  ("orderId") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3af0086da18f32ac05a52e5639" ON "payment"  ("status") `,
    );
    await queryRunner.query(
      `CREATE TABLE "shipping_zone" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, "createdBy" integer, "creatorType" character varying(20), "creatorName" character varying(250), "updatedBy" integer, "updaterType" character varying(20), "updaterName" character varying(250), "name" character varying NOT NULL, "nameBN" character varying(250), "code" character varying NOT NULL, "charge" numeric(10,2) NOT NULL DEFAULT '0', "estimatedDays" integer, "isActive" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_be1c1b03903c10a7bbc0aeac2e6" UNIQUE ("code"), CONSTRAINT "PK_07ba5dcdabaa4854f554c777ef4" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "banner" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, "createdBy" integer, "creatorType" character varying(20), "creatorName" character varying(250), "updatedBy" integer, "updaterType" character varying(20), "updaterName" character varying(250), "title" character varying(250) NOT NULL, "titleBN" character varying(250), "imageUrl" text NOT NULL, "imagePath" text, "mobileImageUrl" text, "mobileImagePath" text, "linkUrl" text, "position" character varying(50), "startsAt" TIMESTAMP, "endsAt" TIMESTAMP, "sortOrder" integer NOT NULL DEFAULT '0', "isActive" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_6d9e2570b3d85ba37b681cd4256" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "homepage_section" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, "createdBy" integer, "creatorType" character varying(20), "creatorName" character varying(250), "updatedBy" integer, "updaterType" character varying(20), "updaterName" character varying(250), "title" character varying NOT NULL, "titleBN" character varying(250), "key" character varying NOT NULL, "type" character varying(50) NOT NULL, "content" jsonb, "sortOrder" integer NOT NULL DEFAULT '0', "isActive" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_1f08798d0478f693539e7eb0a8e" UNIQUE ("key"), CONSTRAINT "PK_e97c4241131ed129daeae304b87" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4e9b8a958ac5f7810b4fed677f" ON "homepage_section"  ("isActive") `,
    );
    await queryRunner.query(
      `CREATE TABLE "page_settings" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, "createdBy" integer, "creatorType" character varying(20), "creatorName" character varying(250), "updatedBy" integer, "updaterType" character varying(20), "updaterName" character varying(250), "key" character varying NOT NULL, "title" character varying NOT NULL, "titleBN" character varying(250), "content" text NOT NULL, "contentBN" text, "isActive" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_cb3feaae11d5c226013799f7a49" UNIQUE ("key"), CONSTRAINT "PK_fbb1ad2f481b3b8e438e5ba2bab" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "system_setting" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, "createdBy" integer, "creatorType" character varying(20), "creatorName" character varying(250), "updatedBy" integer, "updaterType" character varying(20), "updaterName" character varying(250), "key" character varying NOT NULL, "value" text, "description" character varying(250), "descriptionBN" character varying(250), "group" character varying(50), CONSTRAINT "UQ_c6ce0e35b3c0d67dca93523ba1b" UNIQUE ("key"), CONSTRAINT "PK_88dbc9b10c8558420acf7ea642f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "language" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP DEFAULT now(), "updatedAt" TIMESTAMP DEFAULT now(), "deletedAt" TIMESTAMP, "createdBy" integer, "creatorType" character varying(20), "creatorName" character varying(250), "updatedBy" integer, "updaterType" character varying(20), "updaterName" character varying(250), "name" character varying NOT NULL, "code" character varying NOT NULL, "isDefault" boolean NOT NULL DEFAULT false, "isActive" boolean NOT NULL DEFAULT true, CONSTRAINT "UQ_465b3173cdddf0ac2d3fe73a33c" UNIQUE ("code"), CONSTRAINT "PK_cc0a99e710eb3733f6fb42b1d4c" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_3a7abee35dfa3c90ed491583eb" ON "language"  ("isActive") `,
    );
    await queryRunner.query(
      `ALTER TABLE "district" ADD CONSTRAINT "FK_9c6ad28c3f72b9a4c0e7a16e1fd" FOREIGN KEY ("countryId") REFERENCES "country"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "district" ADD CONSTRAINT "FK_5a90f59e76c13a9aa52a61c1692" FOREIGN KEY ("divisionId") REFERENCES "division"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "division" ADD CONSTRAINT "FK_a32a23a80ce72d6073e324bd958" FOREIGN KEY ("countryId") REFERENCES "country"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "address" ADD CONSTRAINT "FK_78c7b1f439f7cd9867bad169b6e" FOREIGN KEY ("divisionId") REFERENCES "division"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "address" ADD CONSTRAINT "FK_89e09cf52a27eec4a04378bbdda" FOREIGN KEY ("districtId") REFERENCES "district"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "address" ADD CONSTRAINT "FK_d25f1ea79e282cc8a42bd616aa3" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "auth_provider" ADD CONSTRAINT "FK_d9255ec09fddab3e47e84fd2a07" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "attribute_value" ADD CONSTRAINT "FK_123ac30d8ade936347e4099cc4a" FOREIGN KEY ("attributeId") REFERENCES "attribute"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_sku_variant" ADD CONSTRAINT "FK_83c32bfe5e9a8c94c6e5f1126a8" FOREIGN KEY ("productSKUId") REFERENCES "product_sku"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_sku_variant" ADD CONSTRAINT "FK_1e2b16c255d9099bdead738ac45" FOREIGN KEY ("attributeId") REFERENCES "attribute"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_sku_variant" ADD CONSTRAINT "FK_b8d19c3912efba5cec0509a3129" FOREIGN KEY ("attributeValueId") REFERENCES "attribute_value"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_sku" ADD CONSTRAINT "FK_0833ab73f1447c11d5acd37cc21" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_media" ADD CONSTRAINT "FK_50e3945c6150d80b69b5f18515a" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "product" ADD CONSTRAINT "FK_ff0c0301a95e517153df97f6812" FOREIGN KEY ("categoryId") REFERENCES "category"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "product" ADD CONSTRAINT "FK_b2efd7dd56aca7e028ad0561fe4" FOREIGN KEY ("productLabelId") REFERENCES "product_label"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "category" ADD CONSTRAINT "FK_d5456fd7e4c4866fec8ada1fa10" FOREIGN KEY ("parentId") REFERENCES "category"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "wishlist" ADD CONSTRAINT "FK_f6eeb74a295e2aad03b76b0ba87" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "wishlist" ADD CONSTRAINT "FK_17e00e49d77ccaf7ff0e14de37b" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "review" ADD CONSTRAINT "FK_1337f93918c70837d3cea105d39" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "review" ADD CONSTRAINT "FK_2a11d3c0ea1b2b5b1790f762b9a" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cart_item" ADD CONSTRAINT "FK_29e590514f9941296f3a2440d39" FOREIGN KEY ("cartId") REFERENCES "cart"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cart_item" ADD CONSTRAINT "FK_8e8d51bb956f024f422bc977f4d" FOREIGN KEY ("productSKUId") REFERENCES "product_sku"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cart_item" ADD CONSTRAINT "FK_75db0de134fe0f9fe9e4591b7bf" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "cart" ADD CONSTRAINT "FK_756f53ab9466eb52a52619ee019" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_item" ADD CONSTRAINT "FK_646bf9ece6f45dbe41c203e06e0" FOREIGN KEY ("orderId") REFERENCES "order"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_item" ADD CONSTRAINT "FK_904370c093ceea4369659a3c810" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_item" ADD CONSTRAINT "FK_88b350d0345a3a29ba4017e6b61" FOREIGN KEY ("productSKUId") REFERENCES "product_sku"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_status_history" ADD CONSTRAINT "FK_689db3835e5550e68d26ca32676" FOREIGN KEY ("orderId") REFERENCES "order"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_address" ADD CONSTRAINT "FK_d82a2840b5e5c98c569d75e92e8" FOREIGN KEY ("orderId") REFERENCES "order"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_address" ADD CONSTRAINT "FK_7327bfbd90f7ea7f15c578b6191" FOREIGN KEY ("divisionId") REFERENCES "division"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_address" ADD CONSTRAINT "FK_69cdbf5f818b7e445de68a3cc5d" FOREIGN KEY ("districtId") REFERENCES "district"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "order" ADD CONSTRAINT "FK_caabe91507b3379c7ba73637b84" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "coupon_history_log" ADD CONSTRAINT "FK_b4c586edd93caf4b72005e13e73" FOREIGN KEY ("couponId") REFERENCES "coupon"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "coupon_history_log" ADD CONSTRAINT "FK_2bd9dca1aaaa090734ad1a4550a" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "coupon_history_log" ADD CONSTRAINT "FK_f37646f766652a1a048ceaf5131" FOREIGN KEY ("orderId") REFERENCES "order"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_return_item" ADD CONSTRAINT "FK_95050c6110147dffc3fe450a78b" FOREIGN KEY ("orderReturnId") REFERENCES "order_return"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_return_item" ADD CONSTRAINT "FK_9cdf8b540006a37bc0b5fbdf6d4" FOREIGN KEY ("orderItemId") REFERENCES "order_item"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_return_status_history" ADD CONSTRAINT "FK_8274f252e0cd2f578e443506cf8" FOREIGN KEY ("orderReturnId") REFERENCES "order_return"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_return" ADD CONSTRAINT "FK_46ceacd0c54265df482da02a5be" FOREIGN KEY ("orderId") REFERENCES "order"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_return" ADD CONSTRAINT "FK_4992b46e907baac04c476bbf362" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "payment" ADD CONSTRAINT "FK_d09d285fe1645cd2f0db811e293" FOREIGN KEY ("orderId") REFERENCES "order"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "payment" DROP CONSTRAINT "FK_d09d285fe1645cd2f0db811e293"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_return" DROP CONSTRAINT "FK_4992b46e907baac04c476bbf362"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_return" DROP CONSTRAINT "FK_46ceacd0c54265df482da02a5be"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_return_status_history" DROP CONSTRAINT "FK_8274f252e0cd2f578e443506cf8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_return_item" DROP CONSTRAINT "FK_9cdf8b540006a37bc0b5fbdf6d4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_return_item" DROP CONSTRAINT "FK_95050c6110147dffc3fe450a78b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "coupon_history_log" DROP CONSTRAINT "FK_f37646f766652a1a048ceaf5131"`,
    );
    await queryRunner.query(
      `ALTER TABLE "coupon_history_log" DROP CONSTRAINT "FK_2bd9dca1aaaa090734ad1a4550a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "coupon_history_log" DROP CONSTRAINT "FK_b4c586edd93caf4b72005e13e73"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order" DROP CONSTRAINT "FK_caabe91507b3379c7ba73637b84"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_address" DROP CONSTRAINT "FK_69cdbf5f818b7e445de68a3cc5d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_address" DROP CONSTRAINT "FK_7327bfbd90f7ea7f15c578b6191"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_address" DROP CONSTRAINT "FK_d82a2840b5e5c98c569d75e92e8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_status_history" DROP CONSTRAINT "FK_689db3835e5550e68d26ca32676"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_item" DROP CONSTRAINT "FK_88b350d0345a3a29ba4017e6b61"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_item" DROP CONSTRAINT "FK_904370c093ceea4369659a3c810"`,
    );
    await queryRunner.query(
      `ALTER TABLE "order_item" DROP CONSTRAINT "FK_646bf9ece6f45dbe41c203e06e0"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cart" DROP CONSTRAINT "FK_756f53ab9466eb52a52619ee019"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cart_item" DROP CONSTRAINT "FK_75db0de134fe0f9fe9e4591b7bf"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cart_item" DROP CONSTRAINT "FK_8e8d51bb956f024f422bc977f4d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cart_item" DROP CONSTRAINT "FK_29e590514f9941296f3a2440d39"`,
    );
    await queryRunner.query(
      `ALTER TABLE "review" DROP CONSTRAINT "FK_2a11d3c0ea1b2b5b1790f762b9a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "review" DROP CONSTRAINT "FK_1337f93918c70837d3cea105d39"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wishlist" DROP CONSTRAINT "FK_17e00e49d77ccaf7ff0e14de37b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "wishlist" DROP CONSTRAINT "FK_f6eeb74a295e2aad03b76b0ba87"`,
    );
    await queryRunner.query(
      `ALTER TABLE "category" DROP CONSTRAINT "FK_d5456fd7e4c4866fec8ada1fa10"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product" DROP CONSTRAINT "FK_b2efd7dd56aca7e028ad0561fe4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product" DROP CONSTRAINT "FK_ff0c0301a95e517153df97f6812"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_media" DROP CONSTRAINT "FK_50e3945c6150d80b69b5f18515a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_sku" DROP CONSTRAINT "FK_0833ab73f1447c11d5acd37cc21"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_sku_variant" DROP CONSTRAINT "FK_b8d19c3912efba5cec0509a3129"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_sku_variant" DROP CONSTRAINT "FK_1e2b16c255d9099bdead738ac45"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_sku_variant" DROP CONSTRAINT "FK_83c32bfe5e9a8c94c6e5f1126a8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "attribute_value" DROP CONSTRAINT "FK_123ac30d8ade936347e4099cc4a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "auth_provider" DROP CONSTRAINT "FK_d9255ec09fddab3e47e84fd2a07"`,
    );
    await queryRunner.query(
      `ALTER TABLE "address" DROP CONSTRAINT "FK_d25f1ea79e282cc8a42bd616aa3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "address" DROP CONSTRAINT "FK_89e09cf52a27eec4a04378bbdda"`,
    );
    await queryRunner.query(
      `ALTER TABLE "address" DROP CONSTRAINT "FK_78c7b1f439f7cd9867bad169b6e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "division" DROP CONSTRAINT "FK_a32a23a80ce72d6073e324bd958"`,
    );
    await queryRunner.query(
      `ALTER TABLE "district" DROP CONSTRAINT "FK_5a90f59e76c13a9aa52a61c1692"`,
    );
    await queryRunner.query(
      `ALTER TABLE "district" DROP CONSTRAINT "FK_9c6ad28c3f72b9a4c0e7a16e1fd"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3a7abee35dfa3c90ed491583eb"`,
    );
    await queryRunner.query(`DROP TABLE "language"`);
    await queryRunner.query(`DROP TABLE "system_setting"`);
    await queryRunner.query(`DROP TABLE "page_settings"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4e9b8a958ac5f7810b4fed677f"`,
    );
    await queryRunner.query(`DROP TABLE "homepage_section"`);
    await queryRunner.query(`DROP TABLE "banner"`);
    await queryRunner.query(`DROP TABLE "shipping_zone"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3af0086da18f32ac05a52e5639"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d09d285fe1645cd2f0db811e29"`,
    );
    await queryRunner.query(`DROP TABLE "payment"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_42901c99d5c87bdc444f78e9fa"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4992b46e907baac04c476bbf36"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_46ceacd0c54265df482da02a5b"`,
    );
    await queryRunner.query(`DROP TABLE "order_return"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8274f252e0cd2f578e443506cf"`,
    );
    await queryRunner.query(`DROP TABLE "order_return_status_history"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_95050c6110147dffc3fe450a78"`,
    );
    await queryRunner.query(`DROP TABLE "order_return_item"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f37646f766652a1a048ceaf513"`,
    );
    await queryRunner.query(`DROP TABLE "coupon_history_log"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_0bc43903b9465a59c563d01114"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7a9573d6a1fb982772a9123320"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_caabe91507b3379c7ba73637b8"`,
    );
    await queryRunner.query(`DROP TABLE "order"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d82a2840b5e5c98c569d75e92e"`,
    );
    await queryRunner.query(`DROP TABLE "order_address"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_689db3835e5550e68d26ca3267"`,
    );
    await queryRunner.query(`DROP TABLE "order_status_history"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_646bf9ece6f45dbe41c203e06e"`,
    );
    await queryRunner.query(`DROP TABLE "order_item"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_74ddb0e92ef27de99f7a89ea0b"`,
    );
    await queryRunner.query(`DROP TABLE "coupon"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4c5b32b563e11a3a7700b50e4a"`,
    );
    await queryRunner.query(`DROP TABLE "cart"`);
    await queryRunner.query(`DROP TABLE "cart_item"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7493081ee6ed292eb441edf7a2"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2a11d3c0ea1b2b5b1790f762b9"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1337f93918c70837d3cea105d3"`,
    );
    await queryRunner.query(`DROP TABLE "review"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2ca6e3d0bd9835eabd2668d515"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_17e00e49d77ccaf7ff0e14de37"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f6eeb74a295e2aad03b76b0ba8"`,
    );
    await queryRunner.query(`DROP TABLE "wishlist"`);
    await queryRunner.query(`DROP TABLE "category"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7bb2b2f7a4c8a4916d4339d7f4"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c036d163e6a6c811ee5e4e4f22"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_639ef8ce82a82ccd59031b1b8e"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b2efd7dd56aca7e028ad0561fe"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ff0c0301a95e517153df97f681"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_22cc43e9a74d7498546e9a63e7"`,
    );
    await queryRunner.query(`DROP TABLE "product"`);
    await queryRunner.query(`DROP TABLE "product_label"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_50e3945c6150d80b69b5f18515"`,
    );
    await queryRunner.query(`DROP TABLE "product_media"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_0974652daf9318f4a437bc8282"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_0833ab73f1447c11d5acd37cc2"`,
    );
    await queryRunner.query(`DROP TABLE "product_sku"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_b8d19c3912efba5cec0509a312"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1e2b16c255d9099bdead738ac4"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_83c32bfe5e9a8c94c6e5f1126a"`,
    );
    await queryRunner.query(`DROP TABLE "product_sku_variant"`);
    await queryRunner.query(`DROP TABLE "attribute"`);
    await queryRunner.query(`DROP TABLE "attribute_value"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_8cb282675c353156c5eff653d6"`,
    );
    await queryRunner.query(`DROP TABLE "admin_user"`);
    await queryRunner.query(`DROP TABLE "user"`);
    await queryRunner.query(`DROP TABLE "auth_provider"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_89e09cf52a27eec4a04378bbdd"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_78c7b1f439f7cd9867bad169b6"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d25f1ea79e282cc8a42bd616aa"`,
    );
    await queryRunner.query(`DROP TABLE "address"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_561e76df831b1d5ded71cc59dd"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a32a23a80ce72d6073e324bd95"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2c574a1deba0b8507df66e6785"`,
    );
    await queryRunner.query(`DROP TABLE "division"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7e93d4e604c1fe9e01965f26b4"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5a90f59e76c13a9aa52a61c169"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_9c6ad28c3f72b9a4c0e7a16e1f"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_0d8904d79f921974e67c878e44"`,
    );
    await queryRunner.query(`DROP TABLE "district"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_97ebcd8db30a408b5f907d6ff4"`,
    );
    await queryRunner.query(`DROP TABLE "country"`);
  }
}
